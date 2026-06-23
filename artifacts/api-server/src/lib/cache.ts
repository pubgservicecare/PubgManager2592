interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export const CACHE_KEYS = {
  ACCOUNTS_PUBLIC: "accounts:public",
  SETTINGS: "settings:public",
  HOME_REVIEWS: "home-reviews",
} as const;

export const TTL = {
  ACCOUNTS_PUBLIC: 30_000,
  SETTINGS: 60_000,
  HOME_REVIEWS: 120_000,
} as const;

export function getCache(key: string): unknown | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: unknown, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}
