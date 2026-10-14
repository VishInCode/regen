import { fetchNearbyOsmFeatures } from "@/lib/api/overpass";
import { getElevation } from "@/lib/api/opentopodata";
import { getRouteMetrics } from "@/lib/api/openrouteservice";
import { calculateLandOpportunityScore } from "@/lib/scoring/land";
import { reverseGeocode } from "@/lib/api/nominatim";
import { getCurrentWeather } from "@/lib/api/openmeteo";
import { getCensusDemographics } from "@/lib/api/censusindia";
import { getAccessibilityData } from "@/lib/api/openrouteservice";
import type { DataAvailability, DataFieldStatus, ProviderAvailability } from "@/types/api";
import type { ProviderResult } from "@/types/provider";
import type {
	LandDetails,
	LandOpportunity,
	LandOpportunityFilters,
	LandOpportunityResponse,
} from "@/types/land";
import type {
	LandAnalysis,
	LandAnalysisDevelopment,
	LandAnalysisEnvironment,
	LandAnalysisInfrastructure,
	LandAnalysisLandUse,
	LandAnalysisScores,
	LandDemographics,
} from "@/types/analysis";

function distanceKm(
	first: { latitude: number; longitude: number },
	second: { latitude: number; longitude: number },
): number {
	const earthRadiusKm = 6_371;
	const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
	const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
	const latitudeOne = (first.latitude * Math.PI) / 180;
	const latitudeTwo = (second.latitude * Math.PI) / 180;
	const haversine =
		Math.sin(latitudeDelta / 2) ** 2 +
		Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitudeOne) * Math.cos(latitudeTwo);
	return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function matchesPurpose(landUse: string, purpose?: string): boolean {
	if (!purpose) return true;
	const normalized = purpose.toLowerCase();
	return normalized.includes(landUse) ||
		(normalized.includes("farm") && landUse === "agricultural") ||
		(normalized.includes("shop") && landUse === "commercial") ||
		(normalized.includes("home") && landUse === "residential");
}

function providerStatus<T>(
	result: { data: T | null; availability: DataAvailability },
): ProviderAvailability {
	const error = result.availability.errors?.[0];
	return {
		status: result.data ? "real" : error ? "error" : "unavailable",
		source: result.availability.source,
		...(error ? { message: error } : {}),
		...(result.availability.attribution
			? { attribution: result.availability.attribution }
			: {}),
	};
}

function responseAvailability(
	osm: Awaited<ReturnType<typeof fetchNearbyOsmFeatures>>,
	elevation: Awaited<ReturnType<typeof getElevation>>,
	routeResults: Array<Awaited<ReturnType<typeof getRouteMetrics>>>,
	filterLimitations: string[] = [],
): DataAvailability {
	const routeResult = routeResults.find((result) => result.data) ?? routeResults[0];
	const providers: Record<string, ProviderAvailability> = {
		overpass: providerStatus(osm),
		openTopoData: providerStatus(elevation),
		openRouteService: routeResult
			? providerStatus(routeResult)
			: {
					status: "unavailable",
					source: "openrouteservice",
					message: "No candidate route was requested",
				},
		propertyRegistry: {
			status: "unavailable",
			source: "No configured land-listing/property registry",
			message: "Sale availability and ownership cannot be verified",
		},
	};
	const hasLandFeatures = Boolean(osm.data?.landUseFeatures.length);
	const hasElevation = elevation.data !== null;
	const hasRoute = routeResults.some((result) => result.data);

	return {
		source: "REGEN land opportunity pipeline",
		isMock: false,
		available: [
			...(hasLandFeatures ? ["OSM land-use candidate areas"] : []),
			...(hasElevation ? ["candidate-area elevation"] : []),
			...(hasRoute ? ["candidate route distance and duration"] : []),
			"deterministic opportunity scores",
		],
		unavailable: [
			...(hasLandFeatures ? [] : ["OSM land-use candidate areas"]),
			...(hasElevation ? [] : ["candidate-area terrain"]),
			...(hasRoute ? [] : ["candidate route accessibility"]),
			"parcel polygon area",
			"sale listing and availability",
			"ownership",
			"survey number",
			"legal status",
			"verified price",
		],
		...(osm.availability.errors || elevation.availability.errors || routeResults.some((result) => result.availability.errors)
			? {
					errors: [
						...(osm.availability.errors ?? []),
						...(elevation.availability.errors ?? []),
						...routeResults.flatMap((result) => result.availability.errors ?? []),
					],
				}
			: {}),
		providers,
		fields: {
			candidateAreas: hasLandFeatures ? "real" : "unavailable",
			landUse: hasLandFeatures ? "real" : "unavailable",
			estimatedAreaSqMeters: osm.data?.landUseFeatures.some((feature) => feature.estimatedAreaSqMeters !== undefined) ? "real" : "unavailable",
			price: "unavailable",
			ownership: "unavailable",
			terrain: hasElevation ? "real" : "unavailable",
			accessibility: hasRoute ? "real" : "unavailable",
			infrastructure: osm.data ? "real" : "unavailable",
			services: osm.data ? "real" : "unavailable",
			scores: "derived",
		},
		derivedFields: ["scores"],
		notes: [
			"Candidates are opportunity zones derived from OSM land-use features, not properties for sale.",
			"Any estimated area is calculated from OSM geometry for an opportunity zone, not a verified parcel area.",
			"No ownership, survey, legal, or asking-price data is fabricated.",
			...filterLimitations,
		],
		attribution: "© OpenStreetMap contributors",
	};
}

export async function analyzeLand(
	filters: LandOpportunityFilters,
): Promise<LandOpportunityResponse> {
	const osm = await fetchNearbyOsmFeatures(
		filters.location,
		(filters.radiusKm ?? 5) * 1_000,
	);
	const elevation = await getElevation(filters.location);
	const filterLimitations: string[] = [];
	if (
		filters.budget !== undefined ||
		filters.minPrice !== undefined ||
		filters.maxPrice !== undefined
	) {
		filterLimitations.push("Price and budget filters cannot be evaluated because no property listing source is configured.");
	}
	if (filters.ownership) {
		filterLimitations.push("Ownership filtering cannot be evaluated because no property registry is configured.");
	}
	const propertyFilterRequested = filterLimitations.length > 0;
	if (propertyFilterRequested) {
		return {
			opportunities: [],
			filters,
			filterStatus: "filter-unavailable",
			dataAvailability: responseAvailability(osm, elevation, [], filterLimitations),
		};
	}
	const features = osm.data?.landUseFeatures ?? [];
	const services = {
		nearbyFacilities: osm.data?.facilities.length ?? 0,
		hospitals: osm.data?.facilities.filter((item) => item.category === "hospital").length ?? 0,
		schools: osm.data?.facilities.filter((item) => item.category === "school").length ?? 0,
		policeStations: osm.data?.facilities.filter((item) => item.category === "police").length ?? 0,
		fireStations: osm.data?.facilities.filter((item) => item.category === "fire_station").length ?? 0,
	};
	const infrastructure = {
		roadFeatureCount: osm.data?.roadFeatureCount ?? null,
		roadConnectivityScore: null,
		transportScore: null,
	};
	if (
		(filters.minAreaSquareMeters !== undefined || filters.maxAreaSquareMeters !== undefined) &&
		!features.some((feature) => feature.estimatedAreaSqMeters !== undefined)
	) {
		filterLimitations.push("Area filters cannot be evaluated because no OSM geometry area is available.");
	}
	const candidates = features
		.filter((feature) => matchesPurpose(feature.landUse, filters.purpose))
		.filter((feature) => !filters.landUseType || feature.landUse === filters.landUseType)
		.filter((feature) => {
			if (filters.radiusKm === undefined) return true;
			return distanceKm(filters.location, feature.location) <= filters.radiusKm;
		})
		.filter((feature) => {
			if (filters.minAreaSquareMeters === undefined && filters.maxAreaSquareMeters === undefined) return true;
			if (feature.estimatedAreaSqMeters === undefined) return false;
			return (filters.minAreaSquareMeters === undefined || feature.estimatedAreaSqMeters >= filters.minAreaSquareMeters) &&
				(filters.maxAreaSquareMeters === undefined || feature.estimatedAreaSqMeters <= filters.maxAreaSquareMeters);
		})
		.filter(() => !filters.infrastructureAccess?.some((required) => {
			const normalized = required.toLowerCase();
			return normalized.includes("hospital") && services.hospitals === 0 ||
				normalized.includes("school") && services.schools === 0 ||
				normalized.includes("police") && services.policeStations === 0 ||
				normalized.includes("fire") && services.fireStations === 0 ||
				normalized.includes("road") && infrastructure.roadFeatureCount === null;
		}))
		.slice(0, 6);

	const routeResults: Array<Awaited<ReturnType<typeof getRouteMetrics>>> = [];
	const opportunities: LandOpportunity[] = [];
	for (const feature of candidates) {
		const route = await getRouteMetrics(filters.location, feature.location);
		routeResults.push(route);
		const terrain = elevation.data === null ? null : `elevation ${elevation.data}m`;
		const score = calculateLandOpportunityScore({
			landUse: feature.landUse,
			purpose: filters.purpose,
			infrastructure,
			route: route.data,
			terrainAvailable: terrain !== null,
		});
		if (filters.developmentPotential && score.developmentPotentialScore !== null) {
			const threshold = filters.developmentPotential === "high" ? 75 : filters.developmentPotential === "medium" ? 50 : 0;
			if (score.developmentPotentialScore < threshold) continue;
		}
		if (filters.terrainEnvironment?.length && terrain === null) continue;

		opportunities.push({
			id: `land-zone-${feature.id}`,
			name: feature.name ?? `${feature.landUse} opportunity zone`,
			location: feature.location,
			areaSquareMeters: null,
			...(feature.estimatedAreaSqMeters !== undefined ? { estimatedAreaSqMeters: feature.estimatedAreaSqMeters } : {}),
			price: null,
			pricePerAcre: null,
			landUse: feature.landUse,
			ownership: null,
			developmentPotential: score.developmentPotentialScore !== null && score.developmentPotentialScore >= 75
				? "high"
				: score.developmentPotentialScore !== null && score.developmentPotentialScore >= 50
					? "medium"
					: "low",
			candidateType: "opportunity-zone",
			terrain,
			infrastructure,
			services,
			accessibility: {
				distanceMeters: route.data?.distanceMeters ?? null,
				durationSeconds: route.data?.durationSeconds ?? null,
			},
			score,
			dataAvailability: responseAvailability(osm, elevation, [route], filterLimitations),
		});
	}

	return {
		opportunities,
		filters,
		filterStatus: filterLimitations.length > 0
			? "filter-unavailable"
			: !osm.data
				? "provider-unavailable"
			: opportunities.length > 0
				? "candidates-found"
				: "no-candidates",
		dataAvailability: responseAvailability(osm, elevation, routeResults, filterLimitations),
	};
}

export async function getLandDetails(
	landId: string,
	location = { latitude: 30.3165, longitude: 78.0322 },
	radiusKm = 10,
): Promise<LandDetails | null> {
	const response = await analyzeLand({
		location,
		radiusKm,
	});
	const opportunity = response.opportunities.find((item) => item.id === landId);
	if (!opportunity) return null;
	return {
		...opportunity,
		nearbyInfrastructure: ["See normalized infrastructure metrics"],
		suitabilityFactors: opportunity.score.factors,
	};
}

function providerAvailability<T>(result: ProviderResult<T>): ProviderAvailability {
	const error = result.availability.errors?.[0];
	return {
		status: result.data ? "real" : result.availability.unavailableReason ? "unavailable" : error ? "error" : "unavailable",
		source: result.availability.source,
		...(result.availability.unavailableReason
			? { message: result.availability.unavailableReason }
			: error
				? { message: error }
				: {}),
		...(result.availability.attribution ? { attribution: result.availability.attribution } : {}),
	};
}

function sectionAvailability(
	items: DataAvailability[],
	providers: Record<string, ProviderAvailability>,
	available: string[],
	fields: Record<string, DataFieldStatus>,
	notes: string[],
): DataAvailability {
	const errors = items.flatMap((item) => item.errors ?? []);
	const unavailable = items.flatMap((item) => item.unavailable);
	return {
		source: "REGEN land analysis provider pipeline",
		isMock: false,
		available,
		unavailable: [...new Set(unavailable)],
		...(errors.length > 0 ? { errors: [...new Set(errors)] } : {}),
		providers,
		fields,
		notes,
	};
}

function emptyScores(unavailable: string[]): LandAnalysisScores {
	return {
		developmentPotentialScore: null,
		infrastructureScore: null,
		accessibilityScore: null,
		overallScore: null,
		factors: [],
		unavailable,
	};
}

export async function analyzeLandArea(
	coordinates: { latitude: number; longitude: number },
	radiusMeters = 3_000,
): Promise<LandAnalysis> {
	const [geocoded, osm, weather, elevation, accessibility, census] = await Promise.all([
		reverseGeocode(coordinates),
		fetchNearbyOsmFeatures(coordinates, radiusMeters),
		getCurrentWeather(coordinates),
		getElevation(coordinates),
		getAccessibilityData(coordinates),
		getCensusDemographics(),
	]);

	const location = geocoded.data ?? {
		id: `coordinates-${coordinates.latitude}-${coordinates.longitude}`,
		name: "Selected location",
		city: "Unknown",
		latitude: coordinates.latitude,
		longitude: coordinates.longitude,
	};
	const features = osm.data?.landUseFeatures ?? [];
	const facilities = osm.data?.facilities ?? [];
	const observedCounts: Record<string, number> = {};
	const observedTagCounts: Record<string, number> = {};
	for (const feature of features) {
		observedCounts[feature.landUse] = (observedCounts[feature.landUse] ?? 0) + 1;
		const sourceTag = feature.sourceTag ?? feature.landUse;
		observedTagCounts[sourceTag] = (observedTagCounts[sourceTag] ?? 0) + 1;
	}
	const estimatedAreaSqMeters = features.reduce(
		(sum, feature) => sum + (feature.estimatedAreaSqMeters ?? 0),
		0,
	);
	const countCategory = (...categories: string[]) => facilities.filter((item) => categories.includes(item.category)).length;
	const services = {
		nearbyFacilities: osm.data ? facilities.length : null,
		businesses: osm.data ? osm.data.businessCount : null,
		hospitals: osm.data ? countCategory("hospital") : null,
		clinics: osm.data ? countCategory("clinic", "doctors") : null,
		schools: osm.data ? countCategory("school", "college", "university") : null,
		policeStations: osm.data ? countCategory("police") : null,
		fireStations: osm.data ? countCategory("fire_station") : null,
		pharmacies: osm.data ? countCategory("pharmacy") : null,
		restaurants: osm.data ? countCategory("restaurant", "cafe", "fast_food", "food_court", "bar") : null,
		financialServices: osm.data ? countCategory("bank", "atm") : null,
		shops: osm.data ? countCategory("shop") : null,
		transportFeatures: osm.data ? countCategory("bus_station", "fuel", "railway") : null,
		otherServices: osm.data ? countCategory("office", "tourism", "leisure", "government", "townhall", "post_office", "library", "community_centre", "place_of_worship", "kindergarten", "social_facility", "poi") : null,
	};
	const infrastructure: LandAnalysisInfrastructure = {
		roadFeatureCount: osm.data?.roadFeatureCount ?? null,
		roadConnectivityScore: null,
		transportScore: null,
		measuredAccessibility: accessibility.data
			? {
				...(accessibility.data.reachableAreaSquareMeters !== undefined
					? { reachableAreaSquareMeters: accessibility.data.reachableAreaSquareMeters }
					: {}),
				durationSeconds: accessibility.data.durationSeconds,
			}
			: null,
	};
	const serviceFields: Record<string, DataFieldStatus> = Object.fromEntries(
		Object.entries(services).map(([key, count]) => [
			key,
			count === null ? "unavailable" : count > 0 ? "real" : "no_data",
		]),
	);
	const terrain = elevation.data === null ? undefined : `elevation ${elevation.data}m; slope classification unavailable`;
	const environment: LandAnalysisEnvironment = {
		...(weather.data ?? {}),
		...(elevation.data !== null ? { elevationMeters: elevation.data } : {}),
		...(terrain ? { terrain } : {}),
		terrainAvailable: elevation.data !== null,
	};

	let scores = emptyScores([
		"development potential requires a supported observed land-use category",
		"measured infrastructure quality",
		"a validated accessibility score; ORS provides an isochrone, not a score",
	]);
	const scoreableFeature = features.find((feature) => ["commercial", "mixed-use", "residential", "industrial", "agricultural"].includes(feature.landUse));
	if (scoreableFeature) {
		const baseScore = calculateLandOpportunityScore({
			landUse: scoreableFeature.landUse,
			infrastructure,
			route: null,
			terrainAvailable: elevation.data !== null,
		});
		scores = {
			developmentPotentialScore: baseScore.developmentPotentialScore,
			infrastructureScore: null,
			accessibilityScore: null,
			overallScore: null,
			factors: [
				...baseScore.factors,
				"A combined score is unavailable because measured infrastructure and accessibility scores are unavailable.",
			],
			unavailable: [
				"measured infrastructure quality",
				"validated accessibility score",
			],
		};
	}

	const development: LandAnalysisDevelopment = {
		observedFeatures: features,
		developmentPotentialScore: scores.developmentPotentialScore,
		scoreFactors: scores.factors,
		signals: [
			...(features.length > 0 ? [`Observed ${features.length} OSM land-use features.`] : []),
			...(osm.data?.roadFeatureCount !== undefined
				? [`Observed ${osm.data.roadFeatureCount} OSM road features; this is descriptive, not a quality score.`]
				: []),
		],
	};
	const demographics: LandDemographics = {
		population: census.data?.population ?? null,
		households: census.data?.households ?? null,
		urbanPopulation: census.data?.urbanPopulation ?? null,
		ruralPopulation: census.data?.ruralPopulation ?? null,
		populationGrowth: census.data?.populationGrowth ?? null,
		referenceYear: census.data?.referenceYear ?? null,
	};
	const landUse: LandAnalysisLandUse = {
		observedCategories: [...new Set(features.map((feature) => feature.sourceTag ?? feature.landUse))],
		featureCount: features.length,
		features,
		estimatedAreaSqMeters: estimatedAreaSqMeters > 0 ? estimatedAreaSqMeters : null,
		observedCounts,
		observedTagCounts,
	};
	const providers = {
		nominatim: providerAvailability(geocoded),
		overpass: providerAvailability(osm),
		openMeteo: providerAvailability(weather),
		openTopoData: providerAvailability(elevation),
		openRouteService: providerAvailability(accessibility),
		censusIndia: providerAvailability(census),
	};
	const allResults = [geocoded, osm, weather, elevation, accessibility, census];
	const allAvailability = sectionAvailability(
		allResults.map((result) => result.availability),
		providers,
		[
			...(geocoded.data ? ["location identification"] : []),
			...(osm.data && facilities.length ? ["nearby mapped places"] : []),
			...(osm.data && features.length ? ["observed land-use features"] : []),
			...(weather.data ? ["weather"] : []),
			...(elevation.data !== null ? ["elevation"] : []),
			...(census.data ? ["historical Census demographics"] : []),
			"deterministic key insights",
		],
		{
			location: geocoded.data ? "real" : "derived",
			demographics: census.data ? "real" : "unavailable",
			infrastructure: osm.data ? (osm.data.roadFeatureCount > 0 || accessibility.data ? "real" : "no_data") : accessibility.data ? "real" : "unavailable",
			services: osm.data ? (facilities.length > 0 ? "real" : "no_data") : "unavailable",
			landUse: osm.data ? (features.length > 0 ? "real" : "no_data") : "unavailable",
			environment: weather.data || elevation.data !== null ? "real" : "unavailable",
			development: scoreableFeature ? "derived" : !osm.data ? "unavailable" : "no_data",
			nearbyPlaces: osm.data ? (facilities.length > 0 ? "real" : "no_data") : "unavailable",
			keyInsights: "derived",
		},
		[
			"Census values are historical and retain their reference year.",
			"OSM land-use features are observations, not verified parcels or sale listings.",
			"Missing provider data is not replaced with fabricated metrics.",
		],
	);
	const insightData = [
		...(features.length > 0
			? [{ text: `${features.length} land-use features were observed near the selected location.`, evidence: ["OpenStreetMap Overpass land-use features"] }]
			: []),
		...(facilities.length > 0
			? [{ text: `${facilities.length} nearby mapped facilities were returned.`, evidence: ["OpenStreetMap Overpass nearby facilities"] }]
			: []),
		...(osm.data
			? ([
				["hospitals", countCategory("hospital")],
				["clinics", countCategory("clinic", "doctors")],
				["schools", countCategory("school", "college", "university")],
				["police stations", countCategory("police")],
				["fire stations", countCategory("fire_station")],
				["pharmacies", countCategory("pharmacy")],
				["restaurants and cafes", countCategory("restaurant", "cafe", "fast_food", "food_court", "bar")],
				["shops", countCategory("shop")],
			] as const).filter(([, count]) => count > 0)
				.map(([label, count]) => ({ text: `${count} mapped ${label} found within the selected analysis radius.`, evidence: ["OpenStreetMap Overpass nearby facilities"] }))
			: []),
		...(elevation.data !== null
			? [{ text: `Elevation is available at ${elevation.data} meters; slope classification is unavailable.`, evidence: ["OpenTopoData elevation"] }]
			: []),
		...(weather.data && (weather.data.temperatureCelsius !== undefined || weather.data.precipitationMillimeters !== undefined)
			? [{ text: `Open-Meteo returned ${weather.data.temperatureCelsius !== undefined ? `${weather.data.temperatureCelsius}°C temperature` : "weather data"}${weather.data.precipitationMillimeters !== undefined ? ` and ${weather.data.precipitationMillimeters} mm precipitation` : ""}.`, evidence: ["Open-Meteo"] }]
			: []),
		...(accessibility.data
			? [{ text: `OpenRouteService returned a ${Math.round(accessibility.data.durationSeconds / 60)}-minute driving accessibility isochrone${accessibility.data.reachableAreaSquareMeters !== undefined ? ` covering ${Math.round(accessibility.data.reachableAreaSquareMeters).toLocaleString("en-IN")} m²` : ""}.`, evidence: ["OpenRouteService isochrone"] }]
			: []),
	];

	return {
		overview: { data: { location, candidateType: "selected-area", scores }, dataAvailability: sectionAvailability([geocoded.availability], { nominatim: providers.nominatim }, [geocoded.data ? "selected location" : "requested coordinates"], { location: geocoded.data ? "real" : "derived" }, ["Location is a selected analysis point, not a verified property."]) },
		demographics: { data: demographics, dataAvailability: sectionAvailability([census.availability], { censusIndia: providers.censusIndia }, census.data ? ["historical population", "historical households"] : [], { demographics: census.data ? "real" : "unavailable" }, ["Current population and growth are not fabricated."]) },
		infrastructure: { data: infrastructure, dataAvailability: sectionAvailability([osm.availability, accessibility.availability], { overpass: providers.overpass, openRouteService: providers.openRouteService }, [ ...(osm.data?.roadFeatureCount ? ["descriptive OSM road-feature observations"] : []), ...(accessibility.data ? ["OpenRouteService driving isochrone"] : []) ], { roadFeatureCount: !osm.data ? "unavailable" : osm.data.roadFeatureCount ? "real" : "no_data", roadConnectivityScore: "unavailable", transportScore: "unavailable", accessibilityIsochrone: accessibility.data ? "real" : "unavailable" }, ["Road-feature observations count mapped OSM features, not distinct roads.", "Infrastructure quality scores are unavailable without measured inputs.", "The ORS duration is an isochrone window, not travel time to a destination."]) },
		services: { data: services, dataAvailability: sectionAvailability([osm.availability], { overpass: providers.overpass }, osm.data && facilities.length ? ["nearby mapped services"] : [], { ...serviceFields, services: !osm.data ? "unavailable" : facilities.length ? "real" : "no_data" }, ["Service counts are normalized nearby POIs, not service capacity."]) },
		landUse: { data: landUse, dataAvailability: sectionAvailability([osm.availability], { overpass: providers.overpass }, osm.data && features.length ? ["observed OSM land-use features"] : [], { landUse: !osm.data ? "unavailable" : features.length ? "real" : "no_data", estimatedAreaSqMeters: landUse.estimatedAreaSqMeters !== null ? "derived" : osm.data ? "no_data" : "unavailable" }, ["OSM land-use features are observations, not verified parcels.", "Estimated area is based on returned geometry and is not a verified parcel area."]) },
		environment: { data: environment, dataAvailability: sectionAvailability([weather.availability, elevation.availability], { openMeteo: providers.openMeteo, openTopoData: providers.openTopoData }, [ ...(weather.data ? ["weather"] : []), ...(elevation.data !== null ? ["elevation"] : []) ], { weather: weather.data ? "real" : "unavailable", elevation: elevation.data !== null ? "real" : "unavailable", terrain: elevation.data !== null ? "derived" : "unavailable" }, ["Terrain slope classification is unavailable."]) },
		development: { data: development, dataAvailability: sectionAvailability([osm.availability], { overpass: providers.overpass }, features.length ? ["observed development-related land-use features"] : [], { developmentPotentialScore: scoreableFeature ? "derived" : !osm.data ? "unavailable" : "no_data", signals: development.signals.length ? "derived" : !osm.data ? "unavailable" : "no_data" }, ["Development potential is deterministic and based only on supported observed land-use categories."]) },
		nearbyPlaces: { data: osm.data ? facilities.map((facility) => ({ ...facility, distanceMeters: Math.round(distanceKm(coordinates, facility.location) * 1_000) })) : [], dataAvailability: sectionAvailability([osm.availability], { overpass: providers.overpass }, facilities.length ? ["normalized nearby places"] : [], { nearbyPlaces: !osm.data ? "unavailable" : facilities.length ? "real" : "no_data" }, ["An empty list means no nearby places were returned when Overpass succeeded."]) },
		keyInsights: { data: insightData, dataAvailability: sectionAvailability(allResults.map((result) => result.availability), providers, ["deterministic evidence-based insights"], { keyInsights: "derived" }, []) },
		dataAvailability: allAvailability,
	};
}
