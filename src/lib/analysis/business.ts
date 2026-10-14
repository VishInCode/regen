import { fetchNearbyOsmFeatures } from '@/lib/api/overpass';
import type { BusinessAnalysis, BusinessAnalysisRequest, BusinessLocationCandidate } from '@/types/business';

type BusinessKind = 'food-beverage' | 'pharmacy' | 'warehouse' | 'gym' | 'retail';

const weights: Record<BusinessKind, { demand: number; access: number; competition: number; infrastructure: number }> = {
  'food-beverage': { demand: 0.35, access: 0.2, competition: 0.3, infrastructure: 0.15 },
  pharmacy: { demand: 0.35, access: 0.2, competition: 0.3, infrastructure: 0.15 },
  warehouse: { demand: 0.2, access: 0.4, competition: 0.2, infrastructure: 0.2 },
  gym: { demand: 0.35, access: 0.15, competition: 0.3, infrastructure: 0.2 },
  retail: { demand: 0.35, access: 0.2, competition: 0.3, infrastructure: 0.15 },
};

const competitorCategory: Record<BusinessKind, string> = {
  'food-beverage': 'food',
  pharmacy: 'healthcare',
  warehouse: 'industrial',
  gym: 'recreation',
  retail: 'retail',
};

const demandBenchmarks: Record<BusinessKind, number> = {
  'food-beverage': 18,
  pharmacy: 9,
  warehouse: 12,
  gym: 18,
  retail: 24,
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const saturatingScore = (count: number, target: number) =>
  clamp((1 - Math.exp(-count / target)) * 100);

function normalizeKind(value: string): BusinessKind {
  if (value in weights) return value as BusinessKind;
  return 'retail';
}

function demoSignals(request: BusinessAnalysisRequest, radiusMeters: number) {
  const seedText = `${request.location.latitude.toFixed(3)}:${request.location.longitude.toFixed(3)}:${request.businessType}:${radiusMeters}`;
  let seed = 2_166_136_261;
  for (const character of seedText) seed = Math.imul(seed ^ character.charCodeAt(0), 16_777_619);
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4_294_967_295;
  };
  const density = 0.25 + random() * 0.75;
  const scale = radiusMeters / 2_000;
  const venues = (min: number, max: number) => Math.round((min + random() * (max - min)) * density * scale);
  return {
    food: venues(4, 38),
    retail: venues(5, 44),
    healthcare: venues(1, 10),
    education: venues(1, 12),
    transport: venues(2, 20),
    recreation: venues(1, 9),
    finance: venues(1, 8),
    government: venues(0, 6),
    offices: venues(1, 16),
    mappedRoadFeatures: venues(5, 42),
    industrialAreas: venues(0, 5),
  };
}

export async function analyzeBusiness(
  request: BusinessAnalysisRequest,
): Promise<BusinessAnalysis> {
  const radiusMeters = Math.min(Math.max(request.searchRadiusKm * 1_000, 100), 2_000);
  const osm = await fetchNearbyOsmFeatures(request.location, radiusMeters);
  const kind = normalizeKind(request.businessType);
  const isDemo = !osm.data;
  const facilities = osm.data?.facilities ?? [];
  const count = (category: string) => facilities.filter((item) => item.category === category).length;
  const industrialAreas = osm.data?.landUseFeatures.filter((item) => item.landUse === 'industrial').length ?? 0;
  const nearbySignals = isDemo ? demoSignals(request, radiusMeters) : {
    food: count('food'),
    retail: count('retail'),
    healthcare: count('healthcare'),
    education: count('school'),
    transport: count('transport'),
    recreation: count('recreation'),
    finance: count('finance'),
    government: count('government'),
    offices: count('office'),
    mappedRoadFeatures: osm.data?.roadFeatureCount ?? 0,
    industrialAreas,
  };
  const facilityCount = isDemo
    ? nearbySignals.food + nearbySignals.retail + nearbySignals.healthcare + nearbySignals.education + nearbySignals.transport + nearbySignals.recreation + nearbySignals.finance + nearbySignals.government + nearbySignals.offices
    : facilities.length;

  const simulatedCompetitors: Record<BusinessKind, number> = {
    'food-beverage': nearbySignals.food,
    pharmacy: nearbySignals.healthcare,
    warehouse: nearbySignals.industrialAreas,
    gym: nearbySignals.recreation,
    retail: nearbySignals.retail,
  };
  const similarBusinesses = isDemo
    ? simulatedCompetitors[kind]
    : kind === 'warehouse' ? industrialAreas : count(competitorCategory[kind]);
  const demandSignals: Record<BusinessKind, number> = {
    'food-beverage': nearbySignals.retail + nearbySignals.education + nearbySignals.transport + nearbySignals.offices,
    pharmacy: nearbySignals.education + nearbySignals.retail + nearbySignals.food + nearbySignals.government,
    warehouse: nearbySignals.transport + Math.min(nearbySignals.mappedRoadFeatures, 30) + industrialAreas,
    gym: nearbySignals.retail + nearbySignals.food + nearbySignals.education + nearbySignals.offices,
    retail: nearbySignals.food + nearbySignals.education + nearbySignals.transport + nearbySignals.offices,
  };
  const demandScore = saturatingScore(demandSignals[kind], demandBenchmarks[kind]);
  const competitionScore = clamp(100 / (1 + similarBusinesses / 4));
  const accessibilityScore = clamp(
    (1 - Math.exp(-(nearbySignals.transport * 10 + nearbySignals.mappedRoadFeatures) / 35)) * 100,
  );
  const infrastructureScore = clamp(
    (1 - Math.exp(-(facilityCount + nearbySignals.mappedRoadFeatures * 0.5) / 35)) * 100,
  );
  const weight = weights[kind];
  const opportunityScore = clamp(
    demandScore * weight.demand +
    accessibilityScore * weight.access +
    competitionScore * weight.competition +
    infrastructureScore * weight.infrastructure,
  );

  const locationName = request.locationName?.trim() ||
    `${request.location.latitude.toFixed(4)}, ${request.location.longitude.toFixed(4)}`;
  const keyFactors = [
    `${demandSignals[kind]} ${isDemo ? 'simulated' : 'mapped'} complementary activity signals inform the demand proxy.`,
    `${similarBusinesses} ${isDemo ? 'simulated' : 'mapped'} ${competitorCategory[kind]} competitors were included for this scenario.`,
    `${nearbySignals.transport} ${isDemo ? 'simulated' : 'mapped'} transport features and ${nearbySignals.mappedRoadFeatures} road features inform access.`,
    `${facilityCount} ${isDemo ? 'simulated' : 'mapped'} facilities were included in the infrastructure proxy.`,
  ];

  const candidate: BusinessLocationCandidate = {
    id: `${isDemo ? 'demo' : 'osm'}-business-${request.location.latitude.toFixed(5)}-${request.location.longitude.toFixed(5)}`,
    name: locationName,
    location: request.location,
    opportunityScore,
    population: null,
    households: null,
    similarBusinesses,
    competitors: similarBusinesses,
    averageFootfall: null,
    averageRent: null,
    demandScore,
    competitionScore,
    accessibilityScore,
    infrastructureScore,
    costAdvantage: null,
    futureGrowth: null,
    keyFactors,
    nearbySignals,
  };

  return {
    request,
    candidateLocations: [candidate],
    opportunityScore,
    explanation: isDemo
      ? `Demo simulation for ${locationName}: this location- and business-specific scenario is generated locally because live OpenStreetMap data is unreachable. Nearby counts are simulated, not verified places. Use this mode for presentation flow only.`
      : `A comparative suitability index for ${locationName}, calculated from OpenStreetMap features within ${(radiusMeters / 1_000).toFixed(1)} km. Demand, access, competition, and infrastructure are proxies, not a revenue or success forecast.`,
    keyFactors,
    dataAvailability: {
      source: isDemo ? 'REGEN demo simulation' : osm.availability.source,
      isMock: isDemo,
      available: isDemo
        ? ['Location-specific demo scenario', 'Demo comparative suitability index']
        : ['Mapped nearby facilities', 'Mapped nearby businesses', 'Mapped road features', 'Derived comparative suitability index'],
      unavailable: isDemo
        ? ['Verified nearby place counts', 'Population and households', 'Customer footfall', 'Commercial rent', 'Business revenue']
        : ['Population and households', 'Customer footfall', 'Commercial rent', 'Business revenue', 'Verified competitor market share'],
      ...(!isDemo && osm.availability.errors ? { errors: osm.availability.errors } : {}),
      ...(!isDemo && osm.availability.attribution ? { attribution: osm.availability.attribution } : {}),
      providers: { overpass: { status: isDemo ? 'unavailable' : 'real', source: isDemo ? 'OpenStreetMap Overpass unavailable' : osm.availability.source, ...(isDemo ? { message: 'Unable to connect; simulated values are shown.' } : { attribution: osm.availability.attribution }) } },
      fields: {
        nearbySignals: isDemo ? 'demo' : 'real',
        demandScore: isDemo ? 'demo' : 'derived',
        competitionScore: isDemo ? 'demo' : 'derived',
        accessibilityScore: isDemo ? 'demo' : 'derived',
        infrastructureScore: isDemo ? 'demo' : 'derived',
        opportunityScore: isDemo ? 'demo' : 'derived',
        population: 'unavailable',
        households: 'unavailable',
        averageFootfall: 'unavailable',
        averageRent: 'unavailable',
      },
      ...(isDemo
        ? { demoFields: ['nearbySignals', 'similarBusinesses', 'demandScore', 'competitionScore', 'accessibilityScore', 'infrastructureScore', 'opportunityScore'], derivedFields: [] }
        : { derivedFields: ['demandScore', 'competitionScore', 'accessibilityScore', 'infrastructureScore', 'opportunityScore'] }),
      notes: [
        ...(isDemo ? ['SIMULATED DEMO DATA: nearby counts vary by coordinates and business type but do not represent actual mapped places.'] : ['Nearby features are OpenStreetMap records and may be incomplete or out of date.']),
        'Demand, access, competition, and infrastructure scores are transparent proxies, not forecasts.',
        'User-entered investment and revenue assumptions are retained in the request and are not treated as observed market data.',
        `Search radius requested: ${request.searchRadiusKm} km; provider query capped at ${(radiusMeters / 1_000).toFixed(1)} km.`,
      ],
    },
  };
}
