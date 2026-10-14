import type { LocationAnalysis } from "@/types/analysis";
import { reverseGeocode } from "@/lib/api/nominatim";
import { fetchNearbyOsmFeatures } from "@/lib/api/overpass";
import { getCurrentWeather } from "@/lib/api/openmeteo";
import { getElevation } from "@/lib/api/opentopodata";
import { getAccessibilityData } from "@/lib/api/openrouteservice";
import { getCensusDemographics } from "@/lib/api/censusindia";
import { calculateAccessibilityScore } from "@/lib/scoring/accessibility";
import { calculateCompetitionScore } from "@/lib/scoring/competition";
import { calculateDemandScore } from "@/lib/scoring/demand";
import { calculateInfrastructureScore } from "@/lib/scoring/infrastructure";
import { calculateOverallScore } from "@/lib/scoring/overall";
import type {
	DataAvailability,
	DataFieldStatus,
	ProviderAvailability,
} from "@/types/api";
import type { ProviderResult } from "@/types/provider";

function createMockLocationAnalysis(lat: number, lng: number): LocationAnalysis {
	return {
		location: {
			id: "dehradun-central-001",
			name: "Dehradun Central",
			city: "Dehradun",
			latitude: lat,
			longitude: lng,
		},
		demographics: {
			population: 569578,
			households: 128400,
			populationGrowth: 2.4,
		},
		infrastructure: {
			hospitals: 18,
			schools: 74,
			roads: 42,
			publicFacilities: 26,
			roadConnectivity: 79,
		},
		business: {
			businesses: 1840,
			competitors: 31,
		},
		accessibility: {
			nearestRoadDistance: 0.35,
			transportScore: 82,
		},
		landUseDistribution: {
			residential: 42,
			commercial: 18,
			industrial: 6,
			agricultural: 15,
			institutional: 10,
			recreational: 4,
			other: 5,
		},
		nearbyFacilities: [
			{
				id: "facility-doon-hospital",
				name: "Doon Hospital",
				category: "hospital",
				location: { latitude: lat + 0.004, longitude: lng + 0.003 },
				distanceMeters: 520,
			},
			{
				id: "facility-central-school",
				name: "Central Dehradun School",
				category: "school",
				location: { latitude: lat - 0.003, longitude: lng + 0.005 },
				distanceMeters: 760,
			},
		],
		recentDevelopment: [
			{
				id: "development-ring-road",
				name: "Dehradun Ring Road Expansion",
				status: "ongoing",
				location: { latitude: lat + 0.01, longitude: lng - 0.008 },
				completionDate: "2027-12-31",
			},
		],
		environmental: {
			terrain: "Valley floor with nearby foothills",
			airQualityIndex: 72,
			floodRisk: "medium",
			protectedArea: false,
		},
		developmentSignals: {
			signals: [
				"Ring road expansion is increasing regional connectivity.",
				"Residential development is expanding toward the outskirts.",
			],
			growthScore: 77,
		},
		insights: [
			"Population and household growth support neighborhood services.",
			"Road connectivity and nearby facilities strengthen site accessibility.",
		],
		scores: {
			demand: 78,
			accessibility: 82,
			competition: 64,
			infrastructure: 76,
			overall: 75,
		},
		explanation: {
			summary:
				"Dehradun Central shows strong demand and accessibility, supported by established infrastructure and steady population growth.",
			factors: [
				"Growing urban population supports sustained local demand.",
				"The location is close to major roads and public transport routes.",
				"Established businesses indicate an active commercial area.",
				"Competition is present but leaves room for differentiated services.",
			],
		},
		dataAvailability: {
			source: "REGEN deterministic mock dataset",
			isMock: true,
			available: [
				"demographics",
				"infrastructure",
				"business activity",
				"accessibility",
			],
			unavailable: [
				"live government data",
				"live map data",
				"live weather data",
				"AI-generated explanation",
			],
		},
	};
}

function combineAvailability(
	items: DataAvailability[],
	providers: Record<string, ProviderAvailability>,
	fields: Record<string, DataFieldStatus>,
	demoFields: string[],
	derivedFields: string[],
): DataAvailability {
	const available = new Set<string>();
	const unavailable = new Set<string>();
	const errors = new Set<string>();
	const attributions = new Set<string>();

	for (const item of items) {
		item.available.forEach((value) => available.add(value));
		item.unavailable.forEach((value) => unavailable.add(value));
		item.errors?.forEach((value) => errors.add(value));
		if (item.attribution) attributions.add(item.attribution);
	}

	derivedFields.forEach((field) => available.add(field));
	demoFields.forEach((field) => unavailable.add(`${field} uses demo data`));

	return {
		source: "REGEN provider pipeline",
		// The response contains a mixture of real, derived, demo, and unavailable
		// fields. Consumers should use providers/fields instead of this legacy flag.
		isMock: false,
		available: [...available],
		unavailable: [...unavailable],
		...(errors.size > 0 ? { errors: [...errors] } : {}),
		...(attributions.size > 0 ? { attribution: [...attributions].join("; ") } : {}),
		providers,
		fields,
		demoFields,
		derivedFields,
		notes: [
			"Demand uses demo demographic values plus the available business count.",
			"Infrastructure uses OSM facility counts; road connectivity is unavailable without measured routing data.",
			"Competitors is an OSM business-count proxy, not a deduplicated competitor dataset.",
			"Land-use distribution remains demo data because Overpass returned tags without defensible geometry areas.",
		],
	};
}

function providerAvailability<T>(result: ProviderResult<T>): DataAvailability {
	return result.availability;
}

export async function analyzeLocation(lat: number, lng: number): Promise<LocationAnalysis> {
	const mock = createMockLocationAnalysis(lat, lng);
	const coordinates = { latitude: lat, longitude: lng };
	const [geocoded, osm, weather, elevation, accessibility, census] = await Promise.all([
		reverseGeocode(coordinates),
		fetchNearbyOsmFeatures(coordinates),
		getCurrentWeather(coordinates),
		getElevation(coordinates),
		getAccessibilityData(coordinates),
		getCensusDemographics(),
	]);

	const infrastructure = { ...mock.infrastructure };
	const business = { ...mock.business };
	const demographics = { ...mock.demographics };
	let nearbyFacilities = mock.nearbyFacilities;
	let location = mock.location;

	if (geocoded.data) {
		location = geocoded.data;
	}
	if (census.data) {
		demographics.population = census.data.population;
		demographics.households = census.data.households;
		demographics.referenceYear = census.data.referenceYear;
		if (census.data.populationGrowth !== undefined) {
			demographics.populationGrowth = census.data.populationGrowth;
		}
	}

	if (osm.data) {
		nearbyFacilities = osm.data.facilities;
		infrastructure.hospitals = osm.data.facilities.filter((item) => item.category === "hospital").length;
		infrastructure.schools = osm.data.facilities.filter((item) => item.category === "school").length;
		infrastructure.roads = null;
		infrastructure.roadFeatureCount = osm.data.roadFeatureCount;
		infrastructure.publicFacilities = osm.data.facilities.length;
		infrastructure.roadConnectivity = null;
		business.businesses = osm.data.businessCount;
		business.competitors = osm.data.businessCount;
	}

	const environmental = { ...mock.environmental };
	const accessibilityMetrics = { ...mock.accessibility };
	if (weather.data) {
		Object.assign(environmental, weather.data);
	}
	if (elevation.data !== null) {
		environmental.elevationMeters = elevation.data;
		environmental.terrain = `${environmental.terrain ?? "Terrain"}; elevation ${elevation.data}m`;
	}
	if (accessibility.data) {
		accessibilityMetrics.transportScore = Math.max(
			0,
			Math.round(100 - (accessibility.data.durationSeconds / 900) * 100),
		);
	}

	const demand = calculateDemandScore(mock.demographics, business);
	const accessibilityScore = accessibility.data
		? Math.min(100, Math.round(accessibility.data.reachableAreaSquareMeters ? accessibility.data.reachableAreaSquareMeters / 1_000 : 50))
		: calculateAccessibilityScore(mock.accessibility);
	const scores = {
		demand,
		accessibility: accessibilityScore,
		competition: calculateCompetitionScore(business),
		infrastructure: calculateInfrastructureScore(infrastructure),
		overall: 0,
	};
	scores.overall = calculateOverallScore(scores);

	return {
		...mock,
		location,
		demographics,
		infrastructure,
		business,
		accessibility: accessibilityMetrics,
		nearbyFacilities,
		environmental,
		landUseTags: osm.data?.landUseTags,
		scores,
		dataAvailability: combineAvailability(
			[
				providerAvailability(geocoded),
				providerAvailability(osm),
				providerAvailability(weather),
				providerAvailability(elevation),
				providerAvailability(accessibility),
				providerAvailability(census),
				{
					source: "data.gov.in",
					isMock: false,
					available: [],
					unavailable: ["government demographics and infrastructure"],
					errors: ["No DATA_GOV_IN_RESOURCE_ID is configured"],
				},
			],
			{
				nominatim: providerAvailabilityRecord(geocoded),
				overpass: providerAvailabilityRecord(osm),
				openMeteo: providerAvailabilityRecord(weather),
				openTopoData: providerAvailabilityRecord(elevation),
				openRouteService: providerAvailabilityRecord(accessibility),
				censusIndia: providerAvailabilityRecord(census),
				dataGovIn: {
					status: "unavailable",
					source: "data.gov.in",
					message: "No government dataset/resource is configured",
				},
			},
			{
				"location": geocoded.data ? "real" : "demo",
				"demographics.population": census.data ? "real" : "demo",
				"demographics.households": census.data ? "real" : "demo",
				"demographics.populationGrowth": "demo",
				"demographics.referenceYear": census.data ? "real" : "unavailable",
				"infrastructure.hospitals": osm.data ? "real" : "demo",
				"infrastructure.schools": osm.data ? "real" : "demo",
				"infrastructure.publicFacilities": osm.data ? "real" : "demo",
				"infrastructure.roadFeatureCount": osm.data ? "real" : "unavailable",
				"infrastructure.roads": "unavailable",
				"infrastructure.roadConnectivity": "unavailable",
				"business.businesses": osm.data ? "real" : "demo",
				"business.competitors": osm.data ? "derived" : "demo",
				"accessibility.nearestRoadDistance": "demo",
				"accessibility.transportScore": accessibility.data ? "derived" : "demo",
				"landUseDistribution": "demo",
				"landUseTags": osm.data ? "real" : "unavailable",
				"nearbyFacilities": osm.data ? "real" : "demo",
				"recentDevelopment": "demo",
				"environmental.temperatureCelsius": weather.data ? "real" : "unavailable",
				"environmental.precipitationMillimeters": weather.data ? "real" : "unavailable",
				"environmental.weatherCode": weather.data ? "real" : "unavailable",
				"environmental.elevationMeters": elevation.data !== null ? "real" : "unavailable",
				"environmental.terrain": elevation.data !== null ? "derived" : "demo",
				"developmentSignals": "demo",
				"scores.demand": "derived",
				"scores.accessibility": "derived",
				"scores.competition": "derived",
				"scores.infrastructure": "derived",
				"scores.overall": "derived",
			},
			[
				...(census.data ? [] : ["demographics.population", "demographics.households"]),
				"demographics.populationGrowth",
				"accessibility.nearestRoadDistance",
				"landUseDistribution",
				"recentDevelopment",
				"developmentSignals",
				...(osm.data ? [] : ["infrastructure.hospitals", "infrastructure.schools", "infrastructure.publicFacilities", "business.businesses"]),
			],
			[
				"scores.demand",
				"scores.accessibility",
				"scores.competition",
				"scores.infrastructure",
				"scores.overall",
				...(osm.data ? ["business.competitors", "environmental.terrain"] : []),
			],
		),
	};
}

function providerAvailabilityRecord<T>(
	result: ProviderResult<T>,
): ProviderAvailability {
	const firstError = result.availability.errors?.[0];
	return {
		status: result.data
			? "real"
			: result.availability.unavailableReason
				? "unavailable"
				: firstError
					? "error"
					: "unavailable",
		source: result.availability.source,
		...(result.availability.unavailableReason
			? { message: result.availability.unavailableReason }
			: firstError
				? { message: firstError }
				: {}),
		...(result.availability.attribution
			? { attribution: result.availability.attribution }
			: {}),
	};
}
