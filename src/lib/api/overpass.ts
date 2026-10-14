import { getOrSetCache } from "@/lib/api/cache";
import { fetchJson, isNumber, isRecord, ProviderError } from "@/lib/api/http";
import { waitForRateLimit } from "@/lib/api/rate-limit";
import type { DataAvailability } from "@/types/api";
import type { Coordinates } from "@/types/location";
import type { NearbyFacility } from "@/types/poi";
import type { LandUseFeature, LandUseType } from "@/types/land";
import type { ProviderResult } from "@/types/provider";

const providerName = "OpenStreetMap Overpass";
const cacheTtlMs = 30 * 60 * 1000;

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  geometry?: Array<{ lat?: number; lon?: number }>;
  tags?: Record<string, string>;
}

export interface OverpassData {
  facilities: NearbyFacility[];
  businessCount: number;
  roadFeatureCount: number;
  landUseTags: string[];
  landUseFeatures: LandUseFeature[];
}

function availability(errors: string[] = []): DataAvailability {
  return {
    source: providerName,
    isMock: false,
    available: errors.length === 0 ? ["nearby OpenStreetMap features"] : [],
    unavailable: errors.length === 0 ? [] : ["nearby OpenStreetMap features"],
    ...(errors.length > 0 ? { errors } : {}),
    attribution: "© OpenStreetMap contributors",
  };
}

function parseElement(value: unknown): OverpassElement | null {
  if (!isRecord(value) || !isNumber(value.id) || typeof value.type !== "string") {
    return null;
  }

  const tags = isRecord(value.tags)
    ? Object.fromEntries(
        Object.entries(value.tags).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : undefined;
  const center = isRecord(value.center)
    ? {
        lat: isNumber(value.center.lat) ? value.center.lat : undefined,
        lon: isNumber(value.center.lon) ? value.center.lon : undefined,
      }
    : undefined;

  return {
    id: value.id,
    type: value.type,
    lat: isNumber(value.lat) ? value.lat : undefined,
    lon: isNumber(value.lon) ? value.lon : undefined,
    center,
    geometry: Array.isArray(value.geometry)
      ? value.geometry
          .filter(isRecord)
          .map((point) => ({
            lat: isNumber(point.lat) ? point.lat : undefined,
            lon: isNumber(point.lon) ? point.lon : undefined,
          }))
      : undefined,
    tags,
  };
}

function estimatedAreaSqMeters(element: OverpassElement): number | undefined {
  const points = element.geometry
    ?.map((point) => ({ latitude: point.lat, longitude: point.lon }))
    .filter(
      (point): point is { latitude: number; longitude: number } =>
        isNumber(point.latitude) && isNumber(point.longitude),
    );
  if (!points || points.length < 3) return undefined;

  const referenceLatitude = (points[0].latitude * Math.PI) / 180;
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude = 111_320 * Math.cos(referenceLatitude);
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const currentX = current.longitude * metersPerDegreeLongitude;
    const currentY = current.latitude * metersPerDegreeLatitude;
    const nextX = next.longitude * metersPerDegreeLongitude;
    const nextY = next.latitude * metersPerDegreeLatitude;
    area += currentX * nextY - nextX * currentY;
  }
  const estimated = Math.abs(area) / 2;
  return estimated > 0 ? estimated : undefined;
}

function elementCoordinates(element: OverpassElement): Coordinates | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  return isNumber(latitude) && isNumber(longitude)
    ? { latitude, longitude }
    : null;
}

function category(tags: Record<string, string>): string {
  const amenity = tags.amenity;
  if (["hospital", "clinic", "pharmacy", "doctors", "school", "college", "university", "police", "fire_station", "townhall", "restaurant", "cafe", "fast_food", "food_court", "bar", "bank", "atm", "bus_station", "fuel", "marketplace", "post_office", "library", "community_centre", "place_of_worship", "kindergarten", "social_facility"].includes(amenity ?? "")) return amenity ?? "poi";
  if (tags.office === "government") return "government";
  if (tags.shop) return "shop";
  if (tags.office) return "office";
  if (tags.tourism) return "tourism";
  if (tags.leisure) return "leisure";
  if (tags.railway) return "railway";
  return "poi";
}

function isFacility(tags: Record<string, string>): boolean {
  return Boolean(tags.amenity || tags.shop || tags.office || tags.tourism || tags.leisure || tags.railway);
}

function normalizeLandUse(value: string): LandUseType {
  if (value === "residential") return "residential";
  if (value === "commercial") return "commercial";
  if (value === "industrial") return "industrial";
  if (["farmland", "farmyard", "orchard", "vineyard", "allotments"].includes(value)) return "agricultural";
  if (["recreation_ground", "recreation", "park"].includes(value)) return "recreational";
  if (["forest", "wood"].includes(value)) return "forest";
  if (["grass", "grassland"].includes(value)) return "grass";
  if (["water", "wetland"].includes(value)) return "water";
  if (value === "construction") return "construction";
  if (value === "cemetery") return "cemetery";
  if (["railway", "rail"].includes(value)) return "railway";
  if (["retail", "institutional"].includes(value)) return "institutional";
  if (value === "mixed_use") return "mixed-use";
  return "other";
}

function queryFor(coordinates: Coordinates, radiusMeters: number): string {
  const latitude = coordinates.latitude;
  const longitude = coordinates.longitude;
  return `[out:json][timeout:20];(nwr["amenity"~"hospital|clinic|doctors|pharmacy|school|college|university|police|fire_station|townhall|restaurant|cafe|fast_food|food_court|bar|bank|atm|bus_station|fuel|marketplace|post_office|library|community_centre|place_of_worship|kindergarten|social_facility"](around:${radiusMeters},${latitude},${longitude});nwr["shop"](around:${radiusMeters},${latitude},${longitude});nwr["office"](around:${radiusMeters},${latitude},${longitude});nwr["tourism"](around:${radiusMeters},${latitude},${longitude});nwr["leisure"](around:${radiusMeters},${latitude},${longitude});nwr["railway"~"station|halt|rail"](around:${radiusMeters},${latitude},${longitude});way["highway"](around:${radiusMeters},${latitude},${longitude});nwr["landuse"](around:${radiusMeters},${latitude},${longitude});nwr["natural"~"wood|forest|grassland|water|wetland"](around:${radiusMeters},${latitude},${longitude});nwr["landcover"](around:${radiusMeters},${latitude},${longitude});nwr["leisure"~"park|garden|recreation_ground"](around:${radiusMeters},${latitude},${longitude});nwr["construction"](around:${radiusMeters},${latitude},${longitude}););out center geom tags;`;
}

function parseResponse(raw: unknown): OverpassData {
  const elementsValue = isRecord(raw) ? raw.elements : undefined;
  const elements = Array.isArray(elementsValue)
    ? elementsValue.map(parseElement).filter((item): item is OverpassElement => item !== null)
    : [];
  const facilities: NearbyFacility[] = [];
  let businessCount = 0;
  let roadFeatureCount = 0;
  const landUseTags = new Set<string>();
  const landUseFeatures: LandUseFeature[] = [];

  for (const element of elements) {
    const tags = element.tags ?? {};
    const location = elementCoordinates(element);
    if (!location) continue;
    if (tags.highway) roadFeatureCount += 1;
    const landUseSourceTag = tags.landuse ?? tags.natural ?? tags.landcover ?? tags.construction ??
      (tags.leisure && ["park", "garden", "recreation_ground"].includes(tags.leisure) ? tags.leisure : undefined) ??
      (tags.railway === "rail" ? tags.railway : undefined);
    if (landUseSourceTag) {
      landUseTags.add(landUseSourceTag);
      landUseFeatures.push({
        id: `${element.type}-${element.id}`,
        landUse: normalizeLandUse(landUseSourceTag),
        sourceTag: landUseSourceTag,
        location,
        ...(tags.name ? { name: tags.name } : {}),
        ...(estimatedAreaSqMeters(element) !== undefined
          ? { estimatedAreaSqMeters: estimatedAreaSqMeters(element) }
          : {}),
      });
    }
    if (tags.shop || tags.office) businessCount += 1;
    if (isFacility(tags)) {
      facilities.push({
        id: `${element.type}-${element.id}`,
        name: tags.name ?? "Unnamed mapped place",
        category: category(tags),
        location,
      });
    }
  }

  return {
    facilities,
    businessCount,
    roadFeatureCount,
    landUseTags: [...landUseTags],
    landUseFeatures,
  };
}

export async function fetchNearbyOsmFeatures(
  coordinates: Coordinates,
  radiusMeters = 3_000,
): Promise<ProviderResult<OverpassData>> {
  const boundedRadius = Math.min(Math.max(radiusMeters, 100), 5_000);
  const key = `overpass:features-v4:${coordinates.latitude}:${coordinates.longitude}:${boundedRadius}`;
  try {
    return await getOrSetCache(key, cacheTtlMs, async () => {
      await waitForRateLimit("overpass", 1_000);
      const primaryUrl = (process.env.OVERPASS_BASE_URL ?? "https://overpass-api.de/api/interpreter").replace(/\/$/, "");
      const endpoints = [primaryUrl, "https://overpass.kumi.systems/api/interpreter"].filter(
        (endpoint, index, all) => all.indexOf(endpoint) === index,
      );
      let lastError: unknown;

      for (const [index, endpoint] of endpoints.entries()) {
        try {
          const raw = await fetchJson<unknown>(endpoint, {
            provider: providerName,
            timeoutMs: 25_000,
            headers: {
              "User-Agent": "REGEN/1.0",
              Referer: "https://regen.local",
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }, {
            method: "POST",
            body: new URLSearchParams({ data: queryFor(coordinates, boundedRadius) }),
          });
          return { data: parseResponse(raw), availability: availability() };
        } catch (error) {
          lastError = error;
          // Try the secondary public Overpass instance when the primary cannot
          // be reached as well as when it reports a transient HTTP failure.
          // A network error has no HTTP status; treating it as terminal would
          // make the configured fallback ineffective for connection failures.
          const retryable = error instanceof ProviderError && (
            error.status === undefined ||
            [408, 429, 500, 502, 503, 504].includes(error.status)
          );
          if (!retryable || index === endpoints.length - 1) throw error;
          await waitForRateLimit("overpass-fallback", 1_000);
        }
      }

      throw lastError instanceof Error ? lastError : new Error("Overpass provider unavailable");
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`${providerName} request failed:`, message);
    return {
      data: null,
      availability: availability([message]),
    };
  }
}
