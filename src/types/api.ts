export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
  timestamp: string;
}

export type DataFieldStatus = "real" | "derived" | "demo" | "unavailable" | "no_data";

export interface ProviderAvailability {
  status: "real" | "unavailable" | "error";
  source: string;
  message?: string;
  attribution?: string;
  referenceYear?: number;
}

export interface DataAvailability {
  source: string;
  isMock: boolean;
  available: string[];
  unavailable: string[];
  errors?: string[];
  unavailableReason?: string;
  attribution?: string;
  providers?: Record<string, ProviderAvailability>;
  fields?: Record<string, DataFieldStatus>;
  demoFields?: string[];
  derivedFields?: string[];
  notes?: string[];
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  error?: never;
}
