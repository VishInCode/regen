import { analyzeLand } from "@/lib/analysis/land";
import { apiErrorResponse } from "@/lib/api/errors";
import type { LandOpportunityFilters, LandUseType, DevelopmentPotential } from "@/types/land";

function parseFilters(url: URL): LandOpportunityFilters | null {
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const landUseType = url.searchParams.get("landUseType") as LandUseType | null;
  const developmentPotential = url.searchParams.get("developmentPotential") as DevelopmentPotential | null;
  const numberParam = (name: string): number | undefined => {
    const value = url.searchParams.get(name);
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const listParam = (name: string): string[] | undefined => {
    const value = url.searchParams.get(name);
    return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
  };
  return {
    location: { latitude, longitude },
    ...(landUseType ? { landUseType } : {}),
    ...(developmentPotential ? { developmentPotential } : {}),
    ...(numberParam("budget") !== undefined ? { budget: numberParam("budget") } : {}),
    ...(numberParam("minAreaSquareMeters") !== undefined ? { minAreaSquareMeters: numberParam("minAreaSquareMeters") } : {}),
    ...(numberParam("maxAreaSquareMeters") !== undefined ? { maxAreaSquareMeters: numberParam("maxAreaSquareMeters") } : {}),
    ...(numberParam("minPrice") !== undefined ? { minPrice: numberParam("minPrice") } : {}),
    ...(numberParam("maxPrice") !== undefined ? { maxPrice: numberParam("maxPrice") } : {}),
    ...(numberParam("radiusKm") !== undefined ? { radiusKm: numberParam("radiusKm") } : {}),
    ...(listParam("infrastructureAccess") ? { infrastructureAccess: listParam("infrastructureAccess") } : {}),
    ...(listParam("terrainEnvironment") ? { terrainEnvironment: listParam("terrainEnvironment") } : {}),
    ...(url.searchParams.get("ownership") ? { ownership: url.searchParams.get("ownership") ?? undefined } : {}),
    ...(url.searchParams.get("purpose") ? { purpose: url.searchParams.get("purpose") ?? undefined } : {}),
  };
}

export async function GET(request: Request): Promise<Response> {
  const filters = parseFilters(new URL(request.url));
  if (!filters) return apiErrorResponse("Valid lat and lng are required", 400, "INVALID_COORDINATES");
  return Response.json(await analyzeLand(filters));
}