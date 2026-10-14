import { analyzePlanning } from "@/lib/analysis/planning";
import type { PlanningAnalysisRequest } from "@/types/planning";
import { apiErrorResponse } from "@/lib/api/errors";

function isRequest(value: unknown): value is PlanningAnalysisRequest {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const location = item.location;
  return (
    (item.planningType === "urban" || item.planningType === "rural") &&
    typeof location === "object" &&
    location !== null &&
    typeof (location as Record<string, unknown>).latitude === "number" &&
    typeof (location as Record<string, unknown>).longitude === "number"
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse("Invalid planning analysis request", 400, "INVALID_REQUEST");
  }
  if (!isRequest(body)) return apiErrorResponse("Invalid planning analysis request", 400, "INVALID_REQUEST");
  try {
    return Response.json(analyzePlanning(body));
  } catch {
    return apiErrorResponse("Planning analysis failed", 500, "PLANNING_ANALYSIS_FAILED");
  }
}
