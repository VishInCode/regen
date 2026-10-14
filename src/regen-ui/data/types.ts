// Shared domain models. Mock data implements these today; a real API/data
// layer can populate the same shapes later without changing the UI.

import type { DataSource } from '../lib/api/types';

export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  image?: string;
  /** Provenance of this location record (OSM, coordinate input, fallback…). */
  source?: DataSource;
  /** Full human-readable address string when available. */
  displayName?: string;
  /** Optional administrative/parcel boundary. */
  boundary?: GeoJSON.Feature;
  /** OSM-reported population for this place, when available (never estimated). */
  population?: number;
  /** Describes what the population figure covers (e.g. city vs. neighbourhood). */
  populationScope?: string;
}

export type LandParcel = {
  id: string;
  geometry: GeoJSON.Feature<GeoJSON.Polygon>;
  areaSqm: number;
  perimeterM: number;
  centroid: { lat: number; lng: number };
};

export interface NearbyFacility {
  label: string;
  count: number;
  icon: string;
}

export interface ScoreRow {
  label: string;
  value: number; // 0-5 or 0-10 depending on context
  max: number;
}

export interface LocationAnalysis {
  location: Location;
  tags: string[];
  population: number;
  populationGrowth: number;
  households: number;
  householdGrowth: number;
  businesses: number;
  businessGrowth: number;
  hospitals: number;
  schools: number;
  roadConnectivity: string;
  summary: string;
  nearbyFacilities: NearbyFacility[];
  landUse: { label: string; value: number; color: string }[];
  populationTrend: { year: string; value: number }[];
  developmentSignals: { title: string; place: string; status: string; image: string }[];
  insights: { title: string; body: string; tone: 'good' | 'warn' | 'info' }[];
}

export interface LandOpportunity {
  id: string;
  acres: number;
  price: string;
  location: string;
  potential: 'High' | 'Moderate' | 'Emerging' | 'Low';
  landUse: string;
  tags: string[];
  lat: number;
  lng: number;
  image: string;
}

export interface RecommendedLocation {
  rank: number;
  location: Location;
  score: number;
  tags: string[];
  suitability: ScoreRow[];
}
