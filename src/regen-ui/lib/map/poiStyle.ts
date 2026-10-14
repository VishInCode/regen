import type { POICategory } from '../api/types';

// Subtle, professional semantic colours aligned with the REGEN palette.
export const CATEGORY_STYLE: Record<POICategory, { color: string; label: string; glyph: string }> = {
  healthcare: { color: '#B85F35', label: 'Healthcare', glyph: '+' },
  education: { color: '#29434A', label: 'Education', glyph: 'E' },
  government: { color: '#7A5A8C', label: 'Government', glyph: 'G' },
  retail: { color: '#C87850', label: 'Retail', glyph: 'R' },
  food: { color: '#68765A', label: 'Food & Hospitality', glyph: 'F' },
  finance: { color: '#29434A', label: 'Finance', glyph: '₹' },
  recreation: { color: '#7D9278', label: 'Recreation', glyph: '◦' },
  transport: { color: '#3A5A66', label: 'Transport', glyph: 'T' },
  industrial: { color: '#68706B', label: 'Industrial', glyph: 'I' },
  agriculture: { color: '#68765A', label: 'Agriculture', glyph: 'A' },
  other: { color: '#68706B', label: 'Other', glyph: '·' },
};

// Progressive visibility: which categories appear at a given zoom level.
export function categoriesForZoom(zoom: number, active: POICategory[]): POICategory[] {
  if (zoom >= 15) return active; // everything
  if (zoom >= 13)
    return active.filter((c) =>
      ['healthcare', 'education', 'transport', 'government', 'retail'].includes(c),
    );
  // zoomed out: only major anchors
  return active.filter((c) => ['healthcare', 'transport', 'government'].includes(c));
}
