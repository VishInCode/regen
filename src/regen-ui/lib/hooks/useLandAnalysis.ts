import { useEffect, useState } from 'react';
import type { LandAnalysis } from '../../../types/analysis';
import { fetchLandAnalysis } from '../api/landAnalysis';
import type { Location } from '../../data/types';

interface LandAnalysisState {
  key: string;
  analysis: LandAnalysis | null;
  error: string | null;
}

export function useLandAnalysis(location: Location, radiusMeters: number): {
  analysis: LandAnalysis | null;
  loading: boolean;
  error: string | null;
} {
  const key = `${location.latitude}:${location.longitude}:${radiusMeters}`;
  const [state, setState] = useState<LandAnalysisState>({ key: '', analysis: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    fetchLandAnalysis({ latitude: location.latitude, longitude: location.longitude }, radiusMeters, controller.signal)
      .then((analysis) => setState({ key, analysis, error: null }))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === 'AbortError') return;
        setState({
          key,
          analysis: null,
          error: cause instanceof Error ? cause.message : 'Land analysis could not be loaded.',
        });
      });
    return () => controller.abort();
  }, [key, location.latitude, location.longitude, radiusMeters]);

  const current = state.key === key;
  return {
    analysis: current ? state.analysis : null,
    loading: !current,
    error: current ? state.error : null,
  };
}
