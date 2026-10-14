import { getOrSetCache } from "@/lib/api/cache";
import { fetchJson, isRecord } from "@/lib/api/http";
import type { ProviderResult } from "@/types/provider";

const providerName = "data.gov.in";

export interface GovernmentDatasetQuery {
  resourceId: string;
  filters?: Record<string, string | number>;
  limit?: number;
}

export async function queryGovernmentDataset(
  query: GovernmentDatasetQuery,
): Promise<ProviderResult<unknown>> {
  const apiKey = process.env.DATA_GOV_IN_API_KEY?.trim();
  if (!apiKey) {
    return unavailable("DATA_GOV_IN_API_KEY is not configured");
  }

  const cacheKey = `datagovin:${query.resourceId}:${JSON.stringify(query.filters ?? {})}:${query.limit ?? 10}`;
  try {
    return await getOrSetCache(cacheKey, 30 * 60 * 1000, async () => {
      const params = new URLSearchParams({
        "api-key": apiKey,
        format: "json",
        limit: String(Math.min(Math.max(query.limit ?? 10, 1), 100)),
      });
      for (const [key, value] of Object.entries(query.filters ?? {})) {
        params.set(key, String(value));
      }
      const raw = await fetchJson<unknown>(
        `https://api.data.gov.in/resource/${encodeURIComponent(query.resourceId)}?${params}`,
        { provider: providerName },
      );
      if (!isRecord(raw) || !Array.isArray(raw.records)) {
        throw new Error("Configured dataset returned no records");
      }
      return {
        data: raw,
        availability: {
          source: providerName,
          isMock: false,
          available: ["configured government dataset"],
          unavailable: [],
        },
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`${providerName} request failed:`, message);
    return unavailable(message);
  }
}

function unavailable(message: string): ProviderResult<unknown> {
  return {
    data: null,
    availability: {
      source: providerName,
      isMock: false,
      available: [],
      unavailable: ["government demographics and infrastructure"],
      errors: [message],
    },
  };
}
