import { getOrSetCache } from "@/lib/api/cache";
import { fetchJson, isNumber, isRecord } from "@/lib/api/http";
import type { Coordinates } from "@/types/location";
import type { ProviderResult } from "@/types/provider";

const providerName = "openrouteservice";
const providerBaseUrl = "https://api.heigit.org/openrouteservice";

export interface RouteMetrics {
  distanceMeters: number;
  durationSeconds: number;
}

export interface NormalizedRoutingResult {
  distanceMeters: number | null;
  durationSeconds: number | null;
  provider: string;
  isMock: false;
  error?: string;
}

export interface AccessibilityData {
  isochroneAvailable: boolean;
  reachableAreaSquareMeters?: number;
  durationSeconds: number;
}

function failure<T>(message: string): ProviderResult<T> {
  return {
    data: null,
    availability: {
      source: providerName,
      isMock: false,
      available: [],
      unavailable: ["routing and accessibility"],
      ...(message.includes("OPENROUTESERVICE_API_KEY")
        ? { unavailableReason: message }
        : {}),
      errors: [message],
    },
  };
}

function keyFor(coordinates: Coordinates): string {
  return `${coordinates.latitude.toFixed(5)}:${coordinates.longitude.toFixed(5)}`;
}

function apiKey(): string | null {
  const value = process.env.OPENROUTESERVICE_API_KEY?.trim();
  return value ? value : null;
}

export async function getRouteMetrics(
  origin: Coordinates,
  destination: Coordinates,
): Promise<ProviderResult<RouteMetrics>> {
  const key = apiKey();
  if (!key) {
    return {
      data: null,
      availability: {
        source: providerName,
        isMock: false,
        available: [],
        unavailable: ["routing and road distance", "travel time"],
        unavailableReason: "OPENROUTESERVICE_API_KEY is not configured",
        errors: ["OPENROUTESERVICE_API_KEY is not configured"],
      },
    };
  }

  const cacheKey = `openrouteservice:route:${keyFor(origin)}:${keyFor(destination)}`;
  try {
    return await getOrSetCache(cacheKey, 10 * 60 * 1000, async () => {
      const url = `${providerBaseUrl}/v2/directions/driving-car`;
      const raw = await fetchJson<unknown>(url, {
        provider: providerName,
        headers: {
          Authorization: key,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }, {
        method: "POST",
        body: JSON.stringify({
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
          ],
        }),
      });
      const summary = isRecord(raw) && Array.isArray(raw.routes) && isRecord(raw.routes[0])
        ? raw.routes[0].summary
        : undefined;
      if (!isRecord(summary) || !isNumber(summary.distance) || !isNumber(summary.duration)) {
        throw new Error("openrouteservice returned no route summary");
      }
      return {
        data: { distanceMeters: summary.distance, durationSeconds: summary.duration },
        availability: {
          source: providerName,
          isMock: false,
          available: ["road distance", "travel time"],
          unavailable: [],
        },
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`${providerName} route failed:`, message);
    return failure<RouteMetrics>(message);
  }
}

export async function getAccessibilityData(
  coordinates: Coordinates,
  rangeSeconds = 900,
): Promise<ProviderResult<AccessibilityData>> {
  const key = apiKey();
  if (!key) {
    return failure("OPENROUTESERVICE_API_KEY is not configured");
  }

  const boundedRange = Math.min(Math.max(rangeSeconds, 300), 3_600);
  const cacheKey = `openrouteservice:isochrone:${keyFor(coordinates)}:${boundedRange}`;
  try {
    return await getOrSetCache(cacheKey, 10 * 60 * 1000, async () => {
      const raw = await fetchJson<unknown>(
        `${providerBaseUrl}/v2/isochrones/driving-car`,
        {
          provider: providerName,
          headers: {
            Authorization: key,
            "Content-Type": "application/json",
            Accept: "application/geo+json",
          },
        },
        {
          method: "POST",
          body: JSON.stringify({
            locations: [[coordinates.longitude, coordinates.latitude]],
            range: [boundedRange],
            range_type: "time",
          }),
        },
      );
      const features = isRecord(raw) && Array.isArray(raw.features) ? raw.features : [];
      const feature = isRecord(features[0]);
      const properties = feature && isRecord(features[0].properties)
        ? features[0].properties
        : undefined;
      const area = properties?.area;
      return {
        data: {
          isochroneAvailable: true,
          ...(isNumber(area) ? { reachableAreaSquareMeters: area } : {}),
          durationSeconds: boundedRange,
        },
        availability: {
          source: providerName,
          isMock: false,
          available: ["accessibility isochrone"],
          unavailable: [],
        },
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`${providerName} isochrone failed:`, message);
    return failure(message);
  }
}

export async function getNormalizedRouteMetrics(
  origin: Coordinates,
  destination: Coordinates,
): Promise<NormalizedRoutingResult> {
  const result = await getRouteMetrics(origin, destination);
  if (result.data) {
    return {
      distanceMeters: result.data.distanceMeters,
      durationSeconds: result.data.durationSeconds,
      provider: providerName,
      isMock: false,
    };
  }

  return {
    distanceMeters: null,
    durationSeconds: null,
    provider: providerName,
    isMock: false,
    error: result.availability.errors?.[0] ?? "Routing provider unavailable",
  };
}

export function testOpenRouteServiceRouting(): Promise<NormalizedRoutingResult> {
  return getNormalizedRouteMetrics(
    { latitude: 30.3165, longitude: 78.0322 },
    { latitude: 30.3256, longitude: 78.0437 },
  );
}
