type CacheTier = {
  /** TTL in seconds */
  ttlSeconds: number;
};

const TIERS: Record<string, CacheTier> = {
  // analytics: 15 minutes
  analytics: { ttlSeconds: 15 * 60 },
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  opts: { tier: keyof typeof TIERS | string; staleWhileRevalidate?: boolean },
): Promise<T> {
  const tier = TIERS[opts.tier as string] ?? TIERS.analytics;
  const now = Date.now();
  const existing = store.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  // "staleWhileRevalidate" is best-effort in this simple in-memory cache.
  if (existing && opts.staleWhileRevalidate) {
    // Return stale value immediately, but refresh in background.
    void fn()
      .then((fresh) => {
        store.set(key, { value: fresh, expiresAt: Date.now() + tier.ttlSeconds * 1000 });
      })
      .catch(() => {
        // ignore refresh errors
      });
    return existing.value;
  }

  const value = await fn();
  store.set(key, { value, expiresAt: now + tier.ttlSeconds * 1000 });
  return value;
}

export async function invalidatePattern(pattern: string): Promise<void> {
  // Very small helper: support patterns like `analytics:AGENCY:*`
  // by converting * to .* and escaping other regex chars.
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const re = new RegExp(`^${escaped}$`);
  for (const key of store.keys()) {
    if (re.test(key)) store.delete(key);
  }
}

