import { fetchPois, distanceMeters } from '../api/places';
import type { POI, POICategory, DataStatus, DataSource } from '../api/types';
import { COMPUTED_SOURCE } from '../api/types';
import type { Location } from '../../data/types';

export interface FacilityGroup {
  category: POICategory;
  label: string;
  count: number;
  nearestKm: number | null;
  items: POI[];
}

export interface ScoreFactor {
  factor: string;
  value: number; // 0-100
  status: DataStatus;
  source: DataSource;
  explanation: string;
}

export interface DynamicLocationAnalysis {
  location: Location;
  radius: number;
  pois: POI[];
  facilities: FacilityGroup[];
  factors: ScoreFactor[];
  overallScore: number;
  degraded: boolean;
}

const ANALYSIS_CATEGORIES: { category: POICategory; label: string }[] = [
  { category: 'healthcare', label: 'Healthcare' },
  { category: 'education', label: 'Education' },
  { category: 'government', label: 'Government' },
  { category: 'retail', label: 'Retail & Markets' },
  { category: 'food', label: 'Food & Hospitality' },
  { category: 'finance', label: 'Finance' },
  { category: 'recreation', label: 'Recreation' },
  { category: 'transport', label: 'Transport' },
];

// Saturating score: `count` facilities relative to a "good coverage" target.
function coverageScore(count: number, target: number): number {
  return Math.round(Math.min(100, (count / target) * 100));
}

export async function buildLocationAnalysis(
  location: Location,
  radius: number,
  signal?: AbortSignal,
): Promise<DynamicLocationAnalysis> {
  const categories = ANALYSIS_CATEGORIES.map((c) => c.category);
  const { pois, degraded } = await fetchPois({
    lat: location.latitude,
    lng: location.longitude,
    radius,
    categories,
    signal,
  });

  const center = { lat: location.latitude, lng: location.longitude };
  const facilities: FacilityGroup[] = ANALYSIS_CATEGORIES.map(({ category, label }) => {
    const items = pois.filter((p) => p.category === category);
    const distances = items.map((p) => distanceMeters(center, { lat: p.latitude, lng: p.longitude }));
    const nearest = distances.length ? Math.min(...distances) : null;
    return {
      category,
      label,
      count: items.length,
      nearestKm: nearest != null ? +(nearest / 1000).toFixed(1) : null,
      items,
    };
  });

  const src = degraded
    ? { type: 'mock' as const, name: 'REGEN fallback data' }
    : COMPUTED_SOURCE;
  const status: DataStatus = degraded ? 'fallback' : 'estimated';

  const byCat = (c: POICategory) => facilities.find((f) => f.category === c)?.count ?? 0;

  const factors: ScoreFactor[] = [
    {
      factor: 'Healthcare Access',
      value: coverageScore(byCat('healthcare'), 6),
      status,
      source: src,
      explanation: `${byCat('healthcare')} healthcare facilities within ${(radius / 1000).toFixed(0)} km.`,
    },
    {
      factor: 'Education Access',
      value: coverageScore(byCat('education'), 8),
      status,
      source: src,
      explanation: `${byCat('education')} education facilities within range.`,
    },
    {
      factor: 'Accessibility',
      value: coverageScore(byCat('transport'), 5),
      status,
      source: src,
      explanation: `${byCat('transport')} transport nodes (stations, stops, fuel) nearby.`,
    },
    {
      factor: 'Commercial Activity',
      value: coverageScore(byCat('retail') + byCat('food'), 20),
      status,
      source: src,
      explanation: `${byCat('retail')} retail and ${byCat('food')} food/hospitality venues nearby.`,
    },
    {
      factor: 'Public Services',
      value: coverageScore(byCat('government'), 4),
      status,
      source: src,
      explanation: `${byCat('government')} government/emergency services nearby.`,
    },
  ];

  const overallScore = Math.round(
    factors.reduce((s, f) => s + f.value, 0) / (factors.length || 1),
  );

  return { location, radius, pois, facilities, factors, overallScore, degraded };
}
