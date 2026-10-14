import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
export const hasGoogleKey = Boolean(KEY);
let configured = false;

export function loadMaps() {
  if (!KEY) return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured'));
  if (!configured) {
    setOptions({ key: KEY, v: 'weekly' });
    configured = true;
  }
  return importLibrary('maps');
}
