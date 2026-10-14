import { analyzeLandArea } from "@/lib/analysis/land";
import { apiErrorResponse } from "@/lib/api/errors";

function isCoordinates(value: unknown): value is { latitude: number; longitude: number } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number" &&
    Number.isFinite(candidate.latitude) &&
    Number.isFinite(candidate.longitude) &&
    candidate.latitude >= -90 &&
    candidate.latitude <= 90 &&
    candidate.longitude >= -180 &&
    candidate.longitude <= 180
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse("Invalid land analysis request", 400, "INVALID_REQUEST");
  }

  try {
    if (typeof body !== "object" || body === null || !isCoordinates((body as Record<string, unknown>).location)) {
      return apiErrorResponse("A valid location is required", 400, "INVALID_LOCATION_REQUEST");
    }
    const requestBody = body as Record<string, unknown>;
    const location = requestBody.location as { latitude: number; longitude: number };
    const radiusMeters = requestBody.radiusMeters ?? 3_000;
    if (typeof radiusMeters !== "number" || !Number.isFinite(radiusMeters) || radiusMeters < 1_000 || radiusMeters > 5_000) {
      return apiErrorResponse("radiusMeters must be between 1000 and 5000", 400, "INVALID_RADIUS");
    }
    return Response.json(await analyzeLandArea(location, radiusMeters));
  } catch {
    return apiErrorResponse("Land analysis failed", 500, "LAND_ANALYSIS_FAILED");
  }
}
