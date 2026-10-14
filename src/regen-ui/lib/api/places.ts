import type { POI, POICategory } from './types';
import type { PlacesResponse } from '../../../types/poi';

type BackendFacility = { id: string; name: string; category: string; location: { latitude: number; longitude: number } };

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase().replace(/[ -]+/g, '_');
}

function mapCategory(value: string): POICategory {
  const category = normalizeCategory(value);
  if (['hospital', 'clinic', 'healthcare', 'doctors', 'police', 'fire_station', 'townhall', 'school', 'college', 'university', 'pharmacy'].includes(category)) {
    return ['school', 'college', 'university'].includes(category) ? 'education' :
      ['police', 'fire_station', 'townhall'].includes(category) ? 'government' : 'healthcare';
  }
  if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food', 'tourism'].includes(category)) return 'food';
  if (['retail', 'shop', 'supermarket', 'marketplace', 'commercial'].includes(category)) return 'retail';
  if (['leisure', 'recreation', 'park', 'playground', 'sports_centre'].includes(category)) return 'recreation';
  if (['bus_station', 'transport', 'railway', 'station', 'highway', 'road', 'fuel', 'water', 'electricity', 'power'].includes(category)) return 'transport';
  if (['bank', 'atm', 'finance'].includes(category)) return 'finance';
  if (['industrial', 'construction'].includes(category)) return 'industrial';
  if (['agriculture', 'farmland', 'farm', 'forest', 'grass', 'residential', 'cemetery'].includes(category)) return 'agriculture';
  return 'other';
}

export interface FetchPoisArgs {
  lat: number;
  lng: number;
  radius: number;
  categories: POICategory[];
  signal?: AbortSignal;
}

export async function fetchPois(args: FetchPoisArgs): Promise<{ pois: POI[]; degraded: boolean }> {
  const params = new URLSearchParams({ lat: String(args.lat), lng: String(args.lng), radius: String(args.radius) });
  const response = await fetch(`/api/places?${params}`, { signal: args.signal });
  const payload = await response.json() as PlacesResponse;
  if (!response.ok || !payload.data) {
    throw new Error('Map places could not be loaded.');
  }
  const degraded = payload.availability?.isMock ?? false;
  const selected = new Set(args.categories);
  const facilities = (payload.data.facilities ?? []).flatMap((facility: BackendFacility): POI[] => {
    const category = mapCategory(facility.category);
    if (!selected.has(category)) return [];
    const generatedName = facility.name.toLowerCase().endsWith(' near selected location');
    return [{ id: facility.id, name: generatedName ? 'Unnamed mapped place' : facility.name, category, subtype: facility.category, latitude: facility.location.latitude, longitude: facility.location.longitude, source: { type: degraded ? 'mock' : 'osm', name: degraded ? 'Fallback data' : 'OpenStreetMap' } }];
  });
  const landUse = payload.data.landUseFeatures.flatMap((feature): POI[] => {
    const category: POICategory = feature.landUse === 'agricultural' ? 'agriculture'
      : feature.landUse === 'industrial' ? 'industrial'
      : feature.landUse === 'recreational' ? 'recreation'
      : 'other';
    if (!selected.has(category)) return [];
    return [{
      id: `land-${feature.id}`,
      name: feature.name ?? `Unnamed ${feature.landUse} land use`,
      category,
      subtype: feature.landUse,
      latitude: feature.location.latitude,
      longitude: feature.location.longitude,
      source: { type: 'osm', name: 'OpenStreetMap' },
    }];
  });
  const pois = [...facilities, ...landUse];
  return { pois, degraded };
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
