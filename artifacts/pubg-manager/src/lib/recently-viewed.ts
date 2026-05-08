const KEY = "recentlyViewedAccountIds";
const MAX = 8;

export function addRecentlyViewed(id: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const next = [id, ...arr.filter((x) => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function getRecentlyViewed(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearRecentlyViewed() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
