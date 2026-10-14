import type { LandOpportunity } from '../../data/types';

type BackendOpportunity = {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
  areaSquareMeters: number | null;
  estimatedAreaSqMeters?: number;
  price: number | null;
  landUse: string;
  score: { developmentPotentialScore: number | null; factors: string[] };
};

function formatPrice(value: number | null): string {
  if (value == null) return 'Price unavailable';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export function toUiOpportunity(item: BackendOpportunity): LandOpportunity {
  const score = item.score.developmentPotentialScore;
  const potential = score == null ? 'Emerging' : score >= 70 ? 'High' : score >= 45 ? 'Moderate' : score >= 25 ? 'Emerging' : 'Low';
  const landUse = item.landUse.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    id: item.id,
    acres: Number(((item.areaSquareMeters ?? item.estimatedAreaSqMeters ?? 0) / 4046.856).toFixed(2)),
    price: formatPrice(item.price),
    location: item.name,
    potential,
    landUse,
    tags: item.score.factors,
    lat: item.location.latitude,
    lng: item.location.longitude,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=500&h=350&fit=crop&auto=format',
  };
}

export async function fetchLandOpportunities(lat: number, lng: number, radiusKm = 10, signal?: AbortSignal): Promise<LandOpportunity[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radiusKm: String(radiusKm) });
  const response = await fetch(`/api/land-opportunities?${params}`, { signal });
  if (!response.ok) throw new Error('Land opportunities are temporarily unavailable');
  const result = await response.json() as { opportunities?: BackendOpportunity[] };
  return (result.opportunities ?? []).map(toUiOpportunity);
}

export async function fetchLandOpportunity(id: string, lat: number, lng: number, radiusKm = 10, signal?: AbortSignal): Promise<LandOpportunity> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radiusKm: String(radiusKm) });
  const response = await fetch(`/api/land-opportunities/${encodeURIComponent(id)}?${params}`, { signal });
  if (!response.ok) throw new Error('This opportunity could not be found');
  return toUiOpportunity(await response.json() as BackendOpportunity);
}
