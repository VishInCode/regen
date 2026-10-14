import { getLandDetails } from "@/lib/analysis/land";
import { apiErrorResponse } from "@/lib/api/errors";

export async function GET(
  request: Request,
  context: { params: Promise<{ landId: string }> },
): Promise<Response> {
  const { landId } = await context.params;
  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  const latitude = latParam === null ? 30.3165 : Number(latParam);
  const longitude = lngParam === null ? 78.0322 : Number(lngParam);
  const radiusParam = url.searchParams.get("radiusKm");
  const radiusKm = radiusParam === null ? 10 : Number(radiusParam);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(radiusKm) ||
    radiusKm < 1 ||
    radiusKm > 50
  ) {
    return apiErrorResponse("Invalid coordinates", 400, "INVALID_COORDINATES");
  }
  const details = await getLandDetails(landId, { latitude, longitude }, radiusKm);
  if (!details) return apiErrorResponse("Land opportunity not found", 404, "LAND_OPPORTUNITY_NOT_FOUND");
  return Response.json(details);
}
