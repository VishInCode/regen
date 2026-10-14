import type { DataAvailability } from "./api";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface SearchResult {
  id: string;
  title: string;
  type: "location" | "land" | "business" | "poi";
  subtitle?: string;
  location?: Coordinates;
}

export interface LocationSearchResponse {
  data: SearchResult[] | null;
  availability: DataAvailability;
}

export interface LocationQuery extends Coordinates {
  radiusMeters?: number;
}
