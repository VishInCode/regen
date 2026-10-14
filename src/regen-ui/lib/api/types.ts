// Provenance-aware domain types shared across REGEN adapters and UI.
// Every value carries where it came from and how much it can be trusted.

export type SourceType = 'google' | 'osm' | 'esri' | 'govt' | 'bhuvan' | 'computed' | 'mock';

/** How a value should be interpreted by the user. */
export type DataStatus =
  | 'observed' // measured / directly reported by a source
  | 'estimated' // derived/approximated by REGEN
  | 'scenario' // depends on user assumptions
  | 'planned' // a documented future intent (not guaranteed)
  | 'reported' // reported by a third party, not independently verified
  | 'fallback'; // REGEN demo data used because live data was unavailable

export interface DataSource {
  type: SourceType;
  name: string;
  url?: string;
}

export interface Metric {
  value: number | string;
  unit?: string;
  status: DataStatus;
  source: DataSource;
  updatedAt?: string;
}

export type POICategory =
  | 'healthcare'
  | 'education'
  | 'government'
  | 'retail'
  | 'food'
  | 'finance'
  | 'recreation'
  | 'transport'
  | 'industrial'
  | 'agriculture'
  | 'other';

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  subtype?: string;
  latitude: number;
  longitude: number;
  address?: string;
  source: DataSource;
  sourceUrl?: string;
  /** Optional place attributes (populated by Google Places, never fabricated). */
  rating?: number;
  userRatingCount?: number;
  website?: string;
  phone?: string;
}

export type DevelopmentStatus =
  | 'planned'
  | 'proposed'
  | 'under-construction'
  | 'in-progress'
  | 'completed'
  | 'reported';

export interface DevelopmentSignal {
  id: string;
  name: string;
  type: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  status: DevelopmentStatus;
  source: DataSource;
  sourceUrl?: string;
  date?: string;
  description?: string;
}

export interface AIInsight {
  title: string;
  body: string;
  tone: 'good' | 'warn' | 'info';
  basis: DataStatus; // what kind of data this insight rests on
}

/** Standard async result envelope so the UI can render honest states. */
export interface AsyncResult<T> {
  data: T;
  source: DataSource;
  status: DataStatus;
  degraded: boolean; // true when a fallback was used
}

export const GOOGLE_SOURCE: DataSource = {
  type: 'google',
  name: 'Google Places',
  url: 'https://developers.google.com/maps/documentation/places/web-service',
};

export const GOOGLE_MAPS_SOURCE: DataSource = {
  type: 'google',
  name: 'Google Maps',
  url: 'https://www.google.com/maps',
};

export const OSM_SOURCE: DataSource = {
  type: 'osm',
  name: 'OpenStreetMap',
  url: 'https://www.openstreetmap.org/copyright',
};

export const MOCK_SOURCE: DataSource = {
  type: 'mock',
  name: 'REGEN fallback data',
};

export const COMPUTED_SOURCE: DataSource = {
  type: 'computed',
  name: 'REGEN analysis engine',
};
