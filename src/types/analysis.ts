import type { DataAvailability } from "./api";
import type { Coordinates, Location } from "./location";
import type { NearbyFacility } from "./poi";
import type {
  LandInfrastructureMetrics,
  LandUseFeature,
  LandUseType,
  LandUseDistribution,
} from "./land";

export type AnalysisStatus = "pending" | "complete" | "failed";

export interface AnalysisResult {
  id: string;
  status: AnalysisStatus;
  generatedAt: string;
}

export interface PopulationMetrics {
  population: number;
  households: number;
  populationGrowth: number;
}

export interface Demographics extends PopulationMetrics {
  averageHouseholdSize?: number;
  urbanPopulation?: number;
  ruralPopulation?: number;
  referenceYear?: number;
}

export interface InfrastructureMetrics {
  hospitals: number;
  schools: number;
  roads: number | null;
  roadFeatureCount?: number;
  publicFacilities: number;
  roadConnectivity: number | null;
}

export interface BusinessMetrics {
  businesses: number;
  competitors: number;
}

export interface AccessibilityMetrics {
  nearestRoadDistance: number;
  transportScore: number;
}

export interface DevelopmentProject {
  id: string;
  name: string;
  status: "planned" | "ongoing" | "completed";
  location: Coordinates;
  completionDate?: string;
}

export interface EnvironmentalInformation {
  terrain?: string;
  elevationMeters?: number;
  airQualityIndex?: number;
  temperatureCelsius?: number;
  precipitationMillimeters?: number;
  weatherCode?: number;
  floodRisk?: "low" | "medium" | "high";
  protectedArea?: boolean;
}

export interface DevelopmentSignals {
  signals: string[];
  growthScore?: number;
}

export interface AnalysisScores {
  demand: number;
  accessibility: number;
  competition: number;
  infrastructure: number;
  overall: number;
}

export interface LocationAnalysis {
  location: Location;
  demographics: Demographics;
  infrastructure: InfrastructureMetrics;
  business: BusinessMetrics;
  accessibility: AccessibilityMetrics;
  landUseDistribution: LandUseDistribution;
  landUseTags?: string[];
  nearbyFacilities: NearbyFacility[];
  recentDevelopment: DevelopmentProject[];
  environmental: EnvironmentalInformation;
  developmentSignals: DevelopmentSignals;
  insights: string[];
  scores: AnalysisScores;
  explanation: {
    summary: string;
    factors: string[];
  };
  dataAvailability: DataAvailability;
}

export interface DashboardSummary {
  population: number;
  businesses: number;
  availableLandOpportunities: number;
  activeDevelopmentProjects: number;
  dataAvailability: DataAvailability;
}

export interface LandAnalysisSection<T> {
  data: T;
  dataAvailability: DataAvailability;
}

export interface LandDemographics {
  population: number | null;
  households: number | null;
  urbanPopulation: number | null;
  ruralPopulation: number | null;
  populationGrowth: number | null;
  referenceYear: number | null;
}

export interface LandAnalysisLandUse {
  observedCategories: string[];
  featureCount: number;
  features: LandUseFeature[];
  estimatedAreaSqMeters: number | null;
  observedCounts: Partial<Record<LandUseType, number>>;
  observedTagCounts: Record<string, number>;
}

export interface LandAnalysisInfrastructure extends LandInfrastructureMetrics {
  measuredAccessibility: {
    reachableAreaSquareMeters?: number;
    durationSeconds: number;
  } | null;
}

export interface LandAnalysisEnvironment extends EnvironmentalInformation {
  terrainAvailable: boolean;
}

export interface LandAnalysisDevelopment {
  observedFeatures: LandUseFeature[];
  developmentPotentialScore: number | null;
  scoreFactors: string[];
  signals: string[];
}

export interface LandAnalysisScores {
  developmentPotentialScore: number | null;
  infrastructureScore: number | null;
  accessibilityScore: number | null;
  overallScore: number | null;
  factors: string[];
  unavailable: string[];
}

export interface LandAnalysisServices {
  nearbyFacilities: number | null;
  businesses: number | null;
  hospitals: number | null;
  clinics: number | null;
  schools: number | null;
  policeStations: number | null;
  fireStations: number | null;
  pharmacies: number | null;
  restaurants: number | null;
  financialServices: number | null;
  shops: number | null;
  transportFeatures: number | null;
  otherServices: number | null;
}

export interface LandAnalysis {
  overview: LandAnalysisSection<{
    location: Location;
    candidateType: "selected-area";
    scores: LandAnalysisScores;
  }>;
  demographics: LandAnalysisSection<LandDemographics>;
  infrastructure: LandAnalysisSection<LandAnalysisInfrastructure>;
  services: LandAnalysisSection<LandAnalysisServices>;
  landUse: LandAnalysisSection<LandAnalysisLandUse>;
  environment: LandAnalysisSection<LandAnalysisEnvironment>;
  development: LandAnalysisSection<LandAnalysisDevelopment>;
  nearbyPlaces: LandAnalysisSection<NearbyFacility[]>;
  keyInsights: LandAnalysisSection<Array<{ text: string; evidence: string[] }>>;
  dataAvailability: DataAvailability;
}
