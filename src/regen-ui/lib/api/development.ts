import type { DevelopmentSignal } from './types';
import { MOCK_SOURCE } from './types';

/**
 * Government / infrastructure development signals.
 *
 * There is NO single universal government-project API. This adapter is the
 * seam where lawful public sources (data.gov.in, state/municipal portals,
 * urban development & transport authorities, master-plan datasets) can be
 * registered per-region. Until a provider is connected for a region, we return
 * an explicit empty result rather than inventing projects.
 */

type Provider = (args: {
  lat: number;
  lng: number;
  radius: number;
  signal?: AbortSignal;
}) => Promise<DevelopmentSignal[]>;

const providers: Provider[] = [
  // Register real regional providers here, e.g.:
  // dataGovInProvider, uttarakhandUDDProvider, ...
];

// Bundled demo signals — used ONLY as clearly-labelled fallback for the
// example locations, never presented as verified data.
const DEMO_SIGNALS: DevelopmentSignal[] = [
  {
    id: 'demo-1',
    name: 'Road Widening Project',
    type: 'Roads',
    status: 'in-progress',
    source: MOCK_SOURCE,
    description: 'Widening of the main arterial road (example fallback data).',
  },
  {
    id: 'demo-2',
    name: 'New School',
    type: 'Education',
    status: 'under-construction',
    source: MOCK_SOURCE,
    description: 'Planned school facility (example fallback data).',
  },
  {
    id: 'demo-3',
    name: 'Residential Complex',
    type: 'Housing',
    status: 'planned',
    source: MOCK_SOURCE,
    description: 'Proposed residential development (example fallback data).',
  },
];

export interface DevelopmentResult {
  signals: DevelopmentSignal[];
  degraded: boolean; // true when demo fallback is used
  empty: boolean; // true when no provider returned data and no fallback requested
  message?: string;
}

export async function fetchDevelopmentSignals(args: {
  lat: number;
  lng: number;
  radius: number;
  allowFallback?: boolean;
  signal?: AbortSignal;
}): Promise<DevelopmentResult> {
  for (const p of providers) {
    try {
      const signals = await p(args);
      if (signals.length) return { signals, degraded: false, empty: false };
    } catch {
      // try next provider
    }
  }

  if (args.allowFallback) {
    return {
      signals: DEMO_SIGNALS,
      degraded: true,
      empty: false,
      message: 'Showing example development signals — no live source connected for this region.',
    };
  }

  return {
    signals: [],
    degraded: false,
    empty: true,
    message: 'No verified development signals found in connected sources.',
  };
}
