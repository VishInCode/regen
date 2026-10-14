import type { DataAvailability } from "./api";
import type { Coordinates } from "./location";

export interface PlanningConstraint {
  name: string;
  description?: string;
  applies: boolean;
}

export type PlanningType = "urban" | "rural";

export interface PlanningAnalysisRequest {
  location: Coordinates;
  planningType: PlanningType;
  radiusKm?: number;
}

export interface PlanningIndicatorGroup {
  summary?: string;
  indicators: Record<string, number | string | boolean>;
}

export interface PlanningAnalysis {
  request: PlanningAnalysisRequest;
  population: PlanningIndicatorGroup;
  infrastructure: PlanningIndicatorGroup;
  landUse: PlanningIndicatorGroup;
  environment: PlanningIndicatorGroup;
  services: PlanningIndicatorGroup;
  development: PlanningIndicatorGroup;
  riskResilience: PlanningIndicatorGroup;
  agriculture: PlanningIndicatorGroup;
  connectivity: PlanningIndicatorGroup;
  livelihoodResources: PlanningIndicatorGroup;
  insights: string[];
  dataAvailability: DataAvailability;
}
