import type { DynamicLocationAnalysis, ScoreFactor } from './locationAnalysis';
import type { POICategory } from '../api/types';
import { COMPUTED_SOURCE } from '../api/types';

// Business-type-specific weighting. Each weight scores an analysis factor or a
// facility-category signal. Transparent and configurable — not hardcoded to one
// business.
export interface BusinessProfile {
  id: string;
  label: string;
  // weights sum is normalised internally; expressed as relative importance
  weights: {
    demand: number; // commercial + population proxy
    accessibility: number;
    competition: number; // same-category density (lower is better)
    complementary: number; // helpful nearby categories
  };
  competitionCategory: POICategory;
  complementaryCategories: POICategory[];
}

export const BUSINESS_PROFILES: Record<string, BusinessProfile> = {
  'food-beverage': {
    id: 'food-beverage',
    label: 'Food & Beverage',
    weights: { demand: 0.35, accessibility: 0.25, competition: 0.2, complementary: 0.2 },
    competitionCategory: 'food',
    complementaryCategories: ['education', 'transport', 'retail'],
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Pharmacy',
    weights: { demand: 0.3, accessibility: 0.2, competition: 0.2, complementary: 0.3 },
    competitionCategory: 'healthcare',
    complementaryCategories: ['healthcare'],
  },
  warehouse: {
    id: 'warehouse',
    label: 'Warehouse / Logistics',
    weights: { demand: 0.15, accessibility: 0.45, competition: 0.1, complementary: 0.3 },
    competitionCategory: 'industrial',
    complementaryCategories: ['transport', 'industrial'],
  },
  gym: {
    id: 'gym',
    label: 'Gym / Fitness',
    weights: { demand: 0.35, accessibility: 0.2, competition: 0.25, complementary: 0.2 },
    competitionCategory: 'recreation',
    complementaryCategories: ['retail', 'food'],
  },
  retail: {
    id: 'retail',
    label: 'Retail',
    weights: { demand: 0.4, accessibility: 0.25, competition: 0.2, complementary: 0.15 },
    competitionCategory: 'retail',
    complementaryCategories: ['food', 'finance', 'transport'],
  },
};

export interface BusinessScore {
  overall: number; // 0-10
  factors: ScoreFactor[];
}

function count(a: DynamicLocationAnalysis, c: POICategory): number {
  return a.facilities.find((f) => f.category === c)?.count ?? 0;
}

/**
 * Compute an explainable business-suitability score from an already-computed
 * location analysis. No new facts are invented — only structured signals are
 * combined with transparent weights.
 */
export function scoreBusinessLocation(
  analysis: DynamicLocationAnalysis,
  profile: BusinessProfile,
): BusinessScore {
  const status = analysis.degraded ? ('fallback' as const) : ('estimated' as const);
  const source = analysis.degraded ? { type: 'mock' as const, name: 'REGEN fallback data' } : COMPUTED_SOURCE;

  const demand = Math.min(100, ((count(analysis, 'retail') + count(analysis, 'food')) / 20) * 100);
  const accessibility = Math.min(100, (count(analysis, 'transport') / 5) * 100);
  const competitionCount = count(analysis, profile.competitionCategory);
  const competition = Math.max(0, 100 - Math.min(100, (competitionCount / 15) * 100)); // fewer competitors → higher
  const complementary = Math.min(
    100,
    (profile.complementaryCategories.reduce((s, c) => s + count(analysis, c), 0) /
      (profile.complementaryCategories.length * 8)) *
      100,
  );

  const w = profile.weights;
  const factors: ScoreFactor[] = [
    {
      factor: 'Demand',
      value: Math.round(demand),
      status,
      source,
      explanation: `Based on ${count(analysis, 'retail') + count(analysis, 'food')} nearby commercial venues (proxy for footfall/demand).`,
    },
    {
      factor: 'Accessibility',
      value: Math.round(accessibility),
      status,
      source,
      explanation: `${count(analysis, 'transport')} transport nodes within the analysis radius.`,
    },
    {
      factor: 'Competition',
      value: Math.round(competition),
      status,
      source,
      explanation: `${competitionCount} similar (${profile.competitionCategory}) businesses nearby — lower competition scores higher.`,
    },
    {
      factor: 'Complementary Businesses',
      value: Math.round(complementary),
      status,
      source,
      explanation: `Nearby complementary categories: ${profile.complementaryCategories.join(', ')}.`,
    },
  ];

  const weighted =
    demand * w.demand +
    accessibility * w.accessibility +
    competition * w.competition +
    complementary * w.complementary;

  return { overall: +(weighted / 10).toFixed(1), factors };
}
