interface CacheEntry<T> {
  expiresAt: number;
  value?: T;
  pending?: Promise<T>;
}

const cache = new Map<string, CacheEntry<unknown>>();

export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    if (existing.pending) {
      return existing.pending;
    }

    if (existing.value !== undefined) {
      return existing.value;
    }
  }

  const pending = loader();
  cache.set(key, { expiresAt: now + ttlMs, pending });

  try {
    const value = await pending;
    cache.set(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

export function clearCache(): void {
  cache.clear();
}
