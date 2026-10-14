import { reverseGeocode, searchNominatim } from "@/lib/api/nominatim";
import { apiErrorResponse } from "@/lib/api/errors";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  if (query) {
    const result = await searchNominatim(query);
    return Response.json(result, { status: result.data ? 200 : 503 });
  }

  const latitudeParam = url.searchParams.get("lat");
  const longitudeParam = url.searchParams.get("lng");
  if (!latitudeParam?.trim() || !longitudeParam?.trim()) {
    return apiErrorResponse("Provide q or both lat and lng query parameters", 400, "INVALID_LOCATION_REQUEST");
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
    return apiErrorResponse("Invalid coordinates", 400, "INVALID_COORDINATES");
  }

  const result = await reverseGeocode({ latitude, longitude });
  return Response.json(result, { status: result.data ? 200 : 503 });
}
