import { analyzeLocation } from "@/lib/analysis/location";
import { apiErrorResponse } from "@/lib/api/errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const latitudeParam = url.searchParams.get("lat");
    const longitudeParam = url.searchParams.get("lng");

    if (!latitudeParam?.trim() || !longitudeParam?.trim()) {
      return apiErrorResponse("Both lat and lng query parameters are required", 400, "INVALID_LOCATION_REQUEST");
    }

    const latitude = Number(latitudeParam);
    const longitude = Number(longitudeParam);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return apiErrorResponse("lat or lng is outside the valid coordinate range", 400, "INVALID_COORDINATES");
    }

    return Response.json(await analyzeLocation(latitude, longitude), { status: 200 });
  } catch {
    return apiErrorResponse("Unable to analyze the requested location", 500, "LOCATION_ANALYSIS_FAILED");
  }
}
