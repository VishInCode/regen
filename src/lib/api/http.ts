export class ProviderError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(
    provider: string,
    message: string,
    status?: number,
    cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
    this.cause = cause;
  }
}

interface FetchJsonOptions {
  provider: string;
  timeoutMs?: number;
  headers?: HeadersInit;
}

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 8_000,
  );

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...options.headers,
        ...init?.headers,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new ProviderError(
        options.provider,
        `Provider returned HTTP ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ProviderError(options.provider, message, undefined, error);
  } finally {
    clearTimeout(timeout);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
