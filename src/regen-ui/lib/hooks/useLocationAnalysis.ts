import { useEffect, useState } from 'react';
import { buildLocationAnalysis, type DynamicLocationAnalysis } from '../analysis/locationAnalysis';
import type { Location } from '../../data/types';

type AnalysisState = {
  analysis: DynamicLocationAnalysis | null;
  loading: boolean;
  error: boolean;
};

/** Builds a live location analysis for the given location + radius. */
export function useLocationAnalysis(
  location: Location | null,
  radius: number,
): AnalysisState {
  const [state, setState] = useState<AnalysisState>({
    analysis: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    if (!location) {
      setState({ analysis: null, loading: false, error: false });
      return;
    }
    const controller = new AbortController();
    // Clear stale analysis so a new location never briefly shows the previous
    // location's numbers while its data loads.
    setState({ analysis: null, loading: true, error: false });
    buildLocationAnalysis(location, radius, controller.signal)
      .then((analysis) => setState({ analysis, loading: false, error: false }))
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setState({ analysis: null, loading: false, error: true });
      });
    return () => controller.abort();
  }, [location?.id, location?.latitude, location?.longitude, radius]);

  return state;
}
