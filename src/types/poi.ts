import type { Coordinates } from "./location";
import type { DataAvailability } from "./api";
import type { LandUseFeature } from "./land";

export interface PointOfInterest {
  id: string;
  name: string;
  category: string;
  location: Coordinates;
}

export type POI = PointOfInterest;

export interface NearbyFacility extends PointOfInterest {
  distanceMeters?: number;
}

export interface PlacesData {
  facilities: NearbyFacility[];
  businessCount: number;
  roadFeatureCount: number;
  landUseTags: string[];
  landUseFeatures: LandUseFeature[];
}

export interface PlacesResponse {
  data: PlacesData | null;
  availability: DataAvailability;
}
