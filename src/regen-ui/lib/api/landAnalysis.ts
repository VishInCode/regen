import type { ApiError } from '../../../types/api';
import type { LandAnalysis } from '../../../types/analysis';

export async function fetchLandAnalysis(
  location: { latitude: number; longitude: number },
  radiusMeters: number,
  signal?: AbortSignal,
): Promise<LandAnalysis> {
  const response = await fetch('/api/land-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, radiusMeters }),
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = payload as ApiError | null;
    throw new Error(apiError && typeof apiError.error === 'string'
      ? apiError.error
      : 'Land analysis could not be loaded.');
  }

  if (!isLandAnalysis(payload)) {
    throw new Error('The land analysis response had an unexpected format.');
  }
  return payload;
}

function isLandAnalysis(value: unknown): value is LandAnalysis {
  if (typeof value !== 'object' || value === null) return false;
  const analysis = value as Partial<LandAnalysis>;
  return Boolean(
    analysis.overview?.data &&
    analysis.demographics?.data &&
    analysis.infrastructure?.data &&
    analysis.services?.data &&
    analysis.landUse?.data &&
    analysis.environment?.data &&
    analysis.development?.data &&
    analysis.nearbyPlaces?.data &&
    analysis.keyInsights?.data &&
    analysis.dataAvailability,
  );
}
