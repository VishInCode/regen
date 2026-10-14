const lastRequestAt = new Map<string, number>();

export async function waitForRateLimit(
  key: string,
  minimumIntervalMs: number,
): Promise<void> {
  const previous = lastRequestAt.get(key) ?? 0;
  const waitMs = Math.max(0, previous + minimumIntervalMs - Date.now());

  if (waitMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
  }

  lastRequestAt.set(key, Date.now());
}
