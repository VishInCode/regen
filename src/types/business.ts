import type { DataAvailability } from "./api";
import type { Coordinates } from "./location";

export interface BusinessProfile {
  name: string;
  category: string;
}

export interface BusinessAnalysisInput extends BusinessProfile {
  locationId: string;
}

export type BusinessSize = "small" | "medium" | "large";

export interface BusinessAnalysisRequest {
  businessType: string;
  locationName?: string;
  businessSubtype?: string;
  targetCustomers: string[];
  expectedInvestment: number;
  expectedMonthlyRevenue: number;
  businessSize: BusinessSize;
  additionalRequirements?: string[];
  location: Coordinates;
  searchRadiusKm: number;
}

export interface BusinessLocationCandidate {
  id: string;
  name: string;
  location: Coordinates;
  opportunityScore: number | null;
  population: number | null;
  households: number | null;
  similarBusinesses: number | null;
  competitors: number | null;
  averageFootfall: number | null;
  averageRent: number | null;
  demandScore: number | null;
  competitionScore: number | null;
  accessibilityScore: number | null;
  infrastructureScore: number | null;
  costAdvantage: number | null;
  futureGrowth: number | null;
  keyFactors: string[];
  nearbySignals: {
    food: number;
    retail: number;
    healthcare: number;
    education: number;
    transport: number;
    recreation: number;
    finance: number;
    government: number;
    offices: number;
    mappedRoadFeatures: number;
    industrialAreas: number;
  } | null;
}

export interface BusinessAnalysis {
  request: BusinessAnalysisRequest;
  candidateLocations: BusinessLocationCandidate[];
  opportunityScore: number | null;
  explanation: string;
  keyFactors: string[];
  dataAvailability: DataAvailability;
}
