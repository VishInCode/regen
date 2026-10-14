import type { Coordinates } from "./location";

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type MapCenter = Coordinates;

export type MapMarkerCategory =
  | "location"
  | "poi"
  | "land"
  | "business"
  | "development";

export interface MapMarker {
  id: string;
  category: MapMarkerCategory;
  title: string;
  location: Coordinates;
  description?: string;
}

export type MapLayerCategory =
  | "population"
  | "infrastructure"
  | "services"
  | "business"
  | "land-use"
  | "future-development";

export interface MapLayerPoint {
  location: Coordinates;
  value: number;
  label?: string;
}

export interface MapLayer {
  id: string;
  name: string;
  category: MapLayerCategory;
  points: MapLayerPoint[];
}

export interface SelectedAreaInfo {
  location: Coordinates;
  name: string;
  city: string;
  population?: number;
  infrastructureScore?: number;
}
