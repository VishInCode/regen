import type { DataAvailability } from "./api";
import type { Coordinates } from "./location";

export type LandUseType =
  | "residential"
  | "commercial"
  | "industrial"
  | "agricultural"
  | "institutional"
  | "recreational"
  | "mixed-use"
  | "forest"
  | "grass"
  | "water"
  | "construction"
  | "cemetery"
  | "railway"
  | "other";

export type DevelopmentPotential = "low" | "medium" | "high";

export interface LandUseDistribution {
  residential: number;
  commercial: number;
  industrial: number;
  agricultural: number;
  institutional: number;
  recreational: number;
  other: number;
}

export interface LandParcel {
  id: string;
  location: Coordinates;
  areaSquareMeters?: number;
}

export interface LandUseFeature {
  id: string;
  landUse: LandUseType;
  /** Original OSM tag/value; keeps specific observations after normalization. */
  sourceTag?: string;
  location: Coordinates;
  name?: string;
  estimatedAreaSqMeters?: number;
}

export interface LandOpportunityFilters {
  purpose?: string;
  landUseType?: LandUseType;
  minAreaSquareMeters?: number;
  maxAreaSquareMeters?: number;
  budget?: number;
  developmentPotential?: DevelopmentPotential;
  location: Coordinates;
  radiusKm?: number;
  infrastructureAccess?: string[];
  terrainEnvironment?: string[];
  ownership?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface LandOpportunity {
  id: string;
  name: string;
  location: Coordinates;
  areaSquareMeters: number | null;
  estimatedAreaSqMeters?: number;
  price: number | null;
  pricePerAcre: number | null;
  landUse: LandUseType;
  ownership: string | null;
  developmentPotential: DevelopmentPotential;
  candidateType: "opportunity-zone" | "property-listing";
  terrain: string | null;
  infrastructure: LandInfrastructureMetrics;
  services: LandServicesMetrics;
  accessibility: LandAccessibilityMetrics;
  score: LandOpportunityScore;
  dataAvailability: DataAvailability;
}

export interface LandInfrastructureMetrics {
  roadFeatureCount: number | null;
  roadConnectivityScore: number | null;
  transportScore: number | null;
  waterAvailable?: boolean;
  electricityAvailable?: boolean;
}

export interface LandServicesMetrics {
  nearbyFacilities: number;
  hospitals: number;
  schools: number;
  policeStations: number;
  fireStations: number;
}

export interface LandAccessibilityMetrics {
  distanceMeters: number | null;
  durationSeconds: number | null;
}

export interface LandOpportunityScore {
  developmentPotentialScore: number | null;
  infrastructureScore: number | null;
  accessibilityScore: number | null;
  overallScore: number | null;
  factors: string[];
  unavailable: string[];
}

export interface LandDetails extends LandOpportunity {
  surveyNumber?: string;
  zoning?: string;
  legalStatus?: string;
  nearbyInfrastructure: string[];
  priceTrend?: number[];
  suitabilityFactors: string[];
}

export interface LandOpportunityResponse {
  opportunities: LandOpportunity[];
  filters: LandOpportunityFilters;
  filterStatus: "candidates-found" | "no-candidates" | "filter-unavailable" | "provider-unavailable";
  dataAvailability: DataAvailability;
}
