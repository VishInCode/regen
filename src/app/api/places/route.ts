import { fetchNearbyOsmFeatures } from "@/lib/api/overpass";
import { apiErrorResponse } from "@/lib/api/errors";
import type { PlacesResponse } from "@/types/poi";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  const radius = Number(url.searchParams.get("radius") ?? "3000");

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) {
    return apiErrorResponse("Invalid coordinates", 400, "INVALID_COORDINATES");
  }

  const result = await fetchNearbyOsmFeatures(
    { latitude, longitude },
    Number.isFinite(radius) ? radius : 3000,
  );
  const response: PlacesResponse = result;
  return Response.json(response, { status: result.data ? 200 : 503 });
}
