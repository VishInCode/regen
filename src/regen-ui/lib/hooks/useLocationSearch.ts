import { useEffect, useRef, useState } from 'react';
import { searchLocations } from '../api/geocoding';
import type { Location } from '../../data/types';

type SearchState = {
  results: Location[];
  loading: boolean;
  error: boolean;
  degraded: boolean;
};

/**
 * Debounced, cancellable location search. Fires at most one request per
 * `delay` ms, aborts the in-flight request when the query changes, and only
 * queries when the term reaches `minLength`.
 */
export function useLocationSearch(query: string, delay = 350, minLength = 2): SearchState {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    error: false,
    degraded: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < minLength) {
      abortRef.current?.abort();
      setState({ results: [], loading: false, error: false, degraded: false });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: false }));
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const { results, degraded } = await searchLocations(q, {
          signal: controller.signal,
          limit: 6,
        });
        setState({ results, loading: false, error: false, degraded });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setState({ results: [], loading: false, error: true, degraded: false });
      }
    }, delay);

    return () => clearTimeout(handle);
  }, [query, delay, minLength]);

  return state;
}
