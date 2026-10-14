import type { Location } from '../../data/types';
import { LOCATIONS } from '../../data/mock';

type ApiLocation = { id: string; title: string; subtitle?: string; location?: { latitude: number; longitude: number } };

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function fromSearchResult(item: ApiLocation): Location | null {
  if (!item.location) return null;
  return {
    id: item.id,
    name: item.title,
    city: item.subtitle ?? '',
    state: '',
    country: 'India',
    latitude: item.location.latitude,
    longitude: item.location.longitude,
    displayName: [item.title, item.subtitle].filter(Boolean).join(', '),
    source: { type: 'osm', name: 'OpenStreetMap Nominatim' },
  };
}

export async function searchLocations(
  query: string,
  opts: { signal?: AbortSignal; limit?: number } = {},
): Promise<{ results: Location[]; degraded: boolean }> {
  const q = query.trim();
  if (q.length < 2) return { results: [], degraded: false };
  const coords = q.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (coords) {
    const latitude = Number(coords[1]);
    const longitude = Number(coords[2]);
    if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      return { results: [{ id: `coord-${latitude}-${longitude}`, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, city: '', state: '', country: '', latitude, longitude, source: { type: 'computed', name: 'Coordinate input' } }], degraded: false };
    }
  }

  try {
    const response = await fetch(`/api/location?q=${encodeURIComponent(q)}`, { signal: opts.signal });
    const payload = await response.json() as { data?: ApiLocation[] | null };
    const results = (payload.data ?? []).map(fromSearchResult).filter((item): item is Location => item !== null).slice(0, opts.limit ?? 6);
    if (response.ok && results.length > 0) return { results, degraded: false };
    const fallback = LOCATIONS.filter((item) => normalizeSearchText(`${item.name} ${item.city} ${item.state}`).includes(normalizeSearchText(q)));
    if (fallback.length > 0) return { results: fallback.slice(0, opts.limit ?? 6).map((item) => ({ ...item, source: { type: 'mock', name: 'REGEN example locations' } })), degraded: true };
    if (response.ok) return { results: [], degraded: false };
    throw new Error('Location search is temporarily unavailable');
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    const results = LOCATIONS.filter((item) => normalizeSearchText(`${item.name} ${item.city} ${item.state}`).includes(normalizeSearchText(q)));
    return { results: results.map((item) => ({ ...item, source: { type: 'mock', name: 'REGEN example locations' } })), degraded: true };
  }
}

export async function reverseGeocode(lat: number, lng: number, opts: { signal?: AbortSignal } = {}): Promise<Location> {
  try {
    const response = await fetch(`/api/location?lat=${lat}&lng=${lng}`, { signal: opts.signal });
    const payload = await response.json() as { data?: { id: string; name: string; city: string; latitude: number; longitude: number } | null };
    if (!response.ok || !payload.data) throw new Error('Reverse geocoding unavailable');
    return { ...payload.data, state: '', country: 'India', source: { type: 'osm', name: 'OpenStreetMap Nominatim' } };
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    return { id: `coord-${lat}-${lng}`, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, city: '', state: '', country: '', latitude: lat, longitude: lng, source: { type: 'computed', name: 'Coordinate input' } };
  }
}
