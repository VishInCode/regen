import { getOrSetCache } from "@/lib/api/cache";
import { fetchJson, isNumber, isRecord } from "@/lib/api/http";
import type { Coordinates } from "@/types/location";
import type { ProviderResult } from "@/types/provider";

const providerName = "OpenTopoData";

export async function getElevation(
  coordinates: Coordinates,
): Promise<ProviderResult<number>> {
  const key = `opentopodata:elevation:${coordinates.latitude}:${coordinates.longitude}`;
  try {
    return await getOrSetCache(key, 60 * 60 * 1000, async () => {
      const locations = `${coordinates.latitude},${coordinates.longitude}`;
      const raw = await fetchJson<unknown>(
        `https://api.opentopodata.org/v1/aster30m?locations=${locations}`,
        { provider: providerName },
      );
      const results = isRecord(raw) && Array.isArray(raw.results) ? raw.results : [];
      const first = isRecord(results[0]);
      const elevation = first ? results[0].elevation : undefined;
      if (!isNumber(elevation)) {
        throw new Error("OpenTopoData returned no elevation");
      }
      return {
        data: elevation,
        availability: {
          source: providerName,
          isMock: false,
          available: ["elevation"],
          unavailable: [],
          attribution: "Elevation data by OpenTopoData",
        },
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`${providerName} request failed:`, message);
    return {
      data: null,
      availability: {
        source: providerName,
        isMock: false,
        available: [],
        unavailable: ["elevation"],
        errors: [message],
        attribution: "Elevation data by OpenTopoData",
      },
    };
  }
}
