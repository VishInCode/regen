import { getOrSetCache } from "@/lib/api/cache";
import { fetchJson, isNumber, isRecord, ProviderError } from "@/lib/api/http";
import { waitForRateLimit } from "@/lib/api/rate-limit";
import type { DataAvailability } from "@/types/api";
import type { Coordinates, Location, SearchResult } from "@/types/location";
import type { ProviderResult } from "@/types/provider";

const providerName = "OpenStreetMap Nominatim";
const cacheTtlMs = 15 * 60 * 1000;

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
}

interface NominatimItem {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  address?: NominatimAddress;
}

function baseUrl(): string {
  return (process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org").replace(/\/$/, "");
}

function headers(): HeadersInit {
  const contact = process.env.REGEN_CONTACT_EMAIL?.trim();
  return {
    "User-Agent": contact ? `Regen/1.0 (contact: ${contact})` : "Regen/1.0",
  };
}

function availability(
  available: string[],
  unavailable: string[] = [],
  errors: string[] = [],
): DataAvailability {
  return {
    source: providerName,
    isMock: false,
    available,
    unavailable,
    ...(errors.length > 0 ? { errors } : {}),
    attribution: "© OpenStreetMap contributors",
  };
}

function parseItem(item: unknown): NominatimItem | null {
  if (!isRecord(item)) {
    return null;
  }

  const lat = item.lat;
  const lon = item.lon;
  if (typeof item.display_name !== "string" || typeof lat !== "string" || typeof lon !== "string") {
    return null;
  }

  const address = isRecord(item.address) ? item.address : undefined;
  return {
    place_id: isNumber(item.place_id) ? item.place_id : undefined,
    display_name: item.display_name,
    lat,
    lon,
    type: typeof item.type === "string" ? item.type : undefined,
    address: address
      ? {
          city: typeof address.city === "string" ? address.city : undefined,
          town: typeof address.town === "string" ? address.town : undefined,
          village: typeof address.village === "string" ? address.village : undefined,
          municipality:
            typeof address.municipality === "string" ? address.municipality : undefined,
          state: typeof address.state === "string" ? address.state : undefined,
        }
      : undefined,
  };
}

function itemLocation(item: NominatimItem): Location | null {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const address = item.address;
  return {
    id: String(item.place_id ?? `${latitude}:${longitude}`),
    name: item.display_name ?? "Unknown location",
    city:
      address?.city ??
      address?.town ??
      address?.village ??
      address?.municipality ??
      address?.state ??
      "Unknown",
    latitude,
    longitude,
  };
}

function unavailableResult<T>(error: unknown): ProviderResult<T> {
  const message = error instanceof Error ? error.message : "Unknown provider error";
  return {
    data: null,
    availability: availability([], ["location identification"], [message]),
  };
}

export async function searchNominatim(
  query: string,
  limit = 5,
): Promise<ProviderResult<SearchResult[]>> {
  const key = `nominatim:search:${query}:${limit}`;
  try {
    return await getOrSetCache(key, cacheTtlMs, async () => {
      await waitForRateLimit("nominatim", 1_000);
      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        limit: String(Math.min(Math.max(limit, 1), 10)),
      });
      const raw = await fetchJson<unknown>(`${baseUrl()}/search?${params}`, {
        provider: providerName,
        headers: headers(),
      });
      const items = Array.isArray(raw)
        ? raw.map(parseItem).filter((item): item is NominatimItem => item !== null)
        : [];
      const results: SearchResult[] = [];
      for (const item of items) {
        const location = itemLocation(item);
        if (!location) continue;
        results.push({
          id: location.id,
          title: location.name,
          type: "location",
          subtitle: location.city,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });
      }

      return {
        data: results,
        availability: availability(["location search"]),
      };
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error(`${providerName} search failed:`, error.message);
    }
    return unavailableResult(error);
  }
}

export async function reverseGeocode(
  coordinates: Coordinates,
): Promise<ProviderResult<Location>> {
  const key = `nominatim:reverse:${coordinates.latitude}:${coordinates.longitude}`;
  try {
    return await getOrSetCache(key, cacheTtlMs, async () => {
      await waitForRateLimit("nominatim", 1_000);
      const params = new URLSearchParams({
        lat: String(coordinates.latitude),
        lon: String(coordinates.longitude),
        format: "jsonv2",
        addressdetails: "1",
      });
      const raw = await fetchJson<unknown>(`${baseUrl()}/reverse?${params}`, {
        provider: providerName,
        headers: headers(),
      });
      const item = parseItem(raw);
      const location = item ? itemLocation(item) : null;
      if (!location) {
        throw new Error("Nominatim returned no usable location");
      }
      return {
        data: location,
        availability: availability(["location identification"]),
      };
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error(`${providerName} reverse geocoding failed:`, error.message);
    }
    return unavailableResult(error);
  }
}
