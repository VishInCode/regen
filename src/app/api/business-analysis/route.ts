import { analyzeBusiness } from "@/lib/analysis/business";
import type { BusinessAnalysisRequest } from "@/types/business";
import { apiErrorResponse } from "@/lib/api/errors";

function isRequest(value: unknown): value is BusinessAnalysisRequest {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const location = item.location;
  const validSize = item.businessSize === "small" || item.businessSize === "medium" || item.businessSize === "large";
  return (
    typeof item.businessType === "string" &&
    Array.isArray(item.targetCustomers) &&
    item.targetCustomers.every((entry) => typeof entry === "string") &&
    typeof item.expectedInvestment === "number" &&
    Number.isFinite(item.expectedInvestment) &&
    item.expectedInvestment >= 0 &&
    typeof item.expectedMonthlyRevenue === "number" &&
    Number.isFinite(item.expectedMonthlyRevenue) &&
    item.expectedMonthlyRevenue >= 0 &&
    validSize &&
    typeof item.searchRadiusKm === "number" &&
    Number.isFinite(item.searchRadiusKm) &&
    item.searchRadiusKm >= 0.1 &&
    item.searchRadiusKm <= 50 &&
    typeof location === "object" &&
    location !== null &&
    typeof (location as Record<string, unknown>).latitude === "number" &&
    Number.isFinite((location as Record<string, unknown>).latitude) &&
    typeof (location as Record<string, unknown>).longitude === "number" &&
    Number.isFinite((location as Record<string, unknown>).longitude) &&
    Math.abs((location as Record<string, unknown>).latitude as number) <= 90 &&
    Math.abs((location as Record<string, unknown>).longitude as number) <= 180 &&
    (item.locationName === undefined || typeof item.locationName === "string")
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse("Invalid business analysis request", 400, "INVALID_REQUEST");
  }
  if (!isRequest(body)) return apiErrorResponse("Invalid business analysis request", 400, "INVALID_REQUEST");
  try {
    return Response.json(await analyzeBusiness(body));
  } catch {
    return apiErrorResponse("Business analysis failed", 500, "BUSINESS_ANALYSIS_FAILED");
  }
}
