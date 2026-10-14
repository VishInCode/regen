// Geodesic geometry helpers for drawn parcels and measurements.
// Small, dependency-free implementations (spherical earth approximation).

const R = 6378137; // earth radius (m), WGS84

export type LatLng = { lat: number; lng: number };

/** Spherical polygon area in m² using the shoelace formula on projected coords. */
export function polygonArea(ring: LatLng[]): number {
  if (ring.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    total +=
      ((p2.lng - p1.lng) * Math.PI) / 180 *
      (2 + Math.sin((p1.lat * Math.PI) / 180) + Math.sin((p2.lat * Math.PI) / 180));
  }
  return Math.abs((total * R * R) / 2);
}

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function pathLength(points: LatLng[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i]);
  return d;
}

export function polygonPerimeter(ring: LatLng[]): number {
  if (ring.length < 2) return 0;
  return pathLength([...ring, ring[0]]);
}

export function centroid(ring: LatLng[]): LatLng {
  const n = ring.length || 1;
  const sum = ring.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / n, lng: sum.lng / n };
}

export const SQM_PER_ACRE = 4046.8564224;

export function formatArea(sqm: number): string {
  if (sqm >= 1_000_000) return `${(sqm / 1_000_000).toFixed(2)} km²`;
  const acres = sqm / SQM_PER_ACRE;
  if (acres >= 1) return `${acres.toFixed(2)} acres`;
  return `${Math.round(sqm)} m²`;
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
