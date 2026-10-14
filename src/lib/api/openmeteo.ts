import { getOrSetCache } from "@/lib/api/cache";
import { fetchJson, isNumber, isRecord } from "@/lib/api/http";
import type { Coordinates } from "@/types/location";
import type { ProviderResult } from "@/types/provider";

const providerName = "Open-Meteo";

export interface WeatherData {
  temperatureCelsius?: number;
  precipitationMillimeters?: number;
  weatherCode?: number;
}

export async function getCurrentWeather(
  coordinates: Coordinates,
): Promise<ProviderResult<WeatherData>> {
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    current: "temperature_2m,precipitation,weather_code",
    timezone: "UTC",
  });
  const cacheKey = `open-meteo:current:${coordinates.latitude}:${coordinates.longitude}`;

  try {
    return await getOrSetCache(cacheKey, 10 * 60 * 1000, async () => {
      const raw = await fetchJson<unknown>(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { provider: providerName },
      );
      const current = isRecord(raw) && isRecord(raw.current) ? raw.current : undefined;
      if (!current) {
        throw new Error("Open-Meteo returned no current weather");
      }
      const data: WeatherData = {
        ...(isNumber(current.temperature_2m)
          ? { temperatureCelsius: current.temperature_2m }
          : {}),
        ...(isNumber(current.precipitation)
          ? { precipitationMillimeters: current.precipitation }
          : {}),
        ...(isNumber(current.weather_code) ? { weatherCode: current.weather_code } : {}),
      };
      return {
        data,
        availability: {
          source: providerName,
          isMock: false,
          available: Object.keys(data),
          unavailable: [],
          attribution: "Weather data by Open-Meteo.com",
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
        unavailable: ["current weather"],
        errors: [message],
        attribution: "Weather data by Open-Meteo.com",
      },
    };
  }
}
