import { getOrSetCache } from "@/lib/api/cache";
import { fetchJson, isNumber, isRecord } from "@/lib/api/http";
import type { ProviderResult } from "@/types/provider";

const providerName = "Census of India API";
const documentationUrl = "https://censusindia.gov.in/census.website/en/data/api/documentation";

export interface CensusDemographics {
  population: number;
  households: number;
  populationGrowth?: number;
  urbanPopulation?: number;
  ruralPopulation?: number;
  demographicBreakdown?: Record<string, number>;
  referenceYear: number;
}

interface CensusConfig {
  baseUrl: string;
  referenceYear: number;
  populationTableId: string;
  geographyLevel: string;
  geographyVariable: string;
  geographyCode: string;
  householdsTableId?: string;
}

function unavailable(message: string): ProviderResult<CensusDemographics> {
  return {
    data: null,
    availability: {
      source: providerName,
      isMock: false,
      available: [],
      unavailable: ["Census historical demographics"],
      unavailableReason: message,
      attribution: documentationUrl,
    },
  };
}

function config(): CensusConfig | null {
  const populationTableId = process.env.CENSUS_POPULATION_TABLE_ID?.trim();
  const geographyLevel = process.env.CENSUS_GEOGRAPHY_LEVEL?.trim();
  const geographyCode = process.env.CENSUS_GEOGRAPHY_CODE?.trim();
  if (!populationTableId || !geographyLevel || !geographyCode) return null;

  const referenceYear = Number(process.env.CENSUS_REFERENCE_YEAR ?? "2011");
  return {
    baseUrl: (process.env.CENSUS_API_BASE_URL ?? "http://digital-library.census.ihsn.org/index.php/api/tables").replace(/\/$/, ""),
    referenceYear: Number.isInteger(referenceYear) ? referenceYear : 2011,
    populationTableId,
    geographyLevel,
    geographyVariable: process.env.CENSUS_GEOGRAPHY_VARIABLE?.trim() || "state",
    geographyCode,
    householdsTableId: process.env.CENSUS_HOUSEHOLDS_TABLE_ID?.trim() || undefined,
  };
}

function numberFrom(record: Record<string, unknown>, names: string[]): number | undefined {
  for (const name of names) {
    const value = record[name];
    if (isNumber(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

async function fetchTable(configValue: CensusConfig, tableId: string): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    geo_level: configValue.geographyLevel,
    format: "JSON",
  });
  params.set(configValue.geographyVariable, configValue.geographyCode);
  const raw = await fetchJson<unknown>(
    `${configValue.baseUrl}/${configValue.referenceYear}/${encodeURIComponent(tableId)}/1000?${params}`,
    { provider: providerName, timeoutMs: 15_000 },
  );
  if (!isRecord(raw) || !Array.isArray(raw.records)) {
    throw new Error(`Census table ${tableId} returned no records`);
  }
  return raw.records.filter(isRecord);
}

function mergeRecords(records: Record<string, unknown>[]): CensusDemographics | null {
  const populationRecord = records.find((record) =>
    numberFrom(record, ["population", "total_population", "tot_p", "pca_tot_p"]) !== undefined,
  );
  const householdsRecord = records.find((record) =>
    numberFrom(record, ["households", "total_households", "hh_total", "no_hh"]) !== undefined,
  );
  const population = populationRecord
    ? numberFrom(populationRecord, ["population", "total_population", "tot_p", "pca_tot_p"])
    : undefined;
  const households = householdsRecord
    ? numberFrom(householdsRecord, ["households", "total_households", "hh_total", "no_hh"])
    : undefined;
  if (population === undefined || households === undefined) return null;

  return { population, households, referenceYear: 0 };
}

export async function getCensusDemographics(): Promise<ProviderResult<CensusDemographics>> {
  const configured = config();
  if (!configured) {
    return unavailable(
      "Census table/geography configuration is missing; coordinates cannot be mapped to a Census unit",
    );
  }

  const cacheKey = `census:${configured.referenceYear}:${configured.populationTableId}:${configured.geographyLevel}:${configured.geographyCode}`;
  try {
    return await getOrSetCache(cacheKey, 60 * 60 * 1000, async () => {
      const records = await fetchTable(configured, configured.populationTableId);
      if (configured.householdsTableId && configured.householdsTableId !== configured.populationTableId) {
        records.push(...(await fetchTable(configured, configured.householdsTableId)));
      }
      const demographics = mergeRecords(records);
      if (!demographics) {
        throw new Error("Configured Census table could not be mapped to population and households");
      }
      demographics.referenceYear = configured.referenceYear;
      return {
        data: demographics,
        availability: {
          source: providerName,
          isMock: false,
          available: ["population", "households"],
          unavailable: ["current population growth"],
          attribution: documentationUrl,
          referenceYear: configured.referenceYear,
        },
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Census provider error";
    console.error(`${providerName} request failed:`, message);
    return unavailable(message);
  }
}