/**
 * Returns the full URL for an API path.
 *
 * In same-origin deployment (the correct production setup for mobile
 * compatibility), VITE_API_URL is NOT set and this function returns the
 * path as-is (e.g. "/api/auth/login"). The browser sends the request to
 * the same origin that served the page — cookies are included automatically,
 * and iOS Safari / Samsung Internet work correctly.
 *
 * VITE_API_URL should only ever be set in local development when the
 * Vite dev server and API server run on different ports. It must NEVER
 * be set in a Render (production) build — the render-build.sh script
 * will abort the build if it detects this misconfiguration.
 */
const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

if (base && import.meta.env.PROD) {
  console.error(
    "[api-url] WARNING: VITE_API_URL is set in a production build. " +
    "This creates a cross-origin setup that breaks mobile login on iOS Safari. " +
    "Delete VITE_API_URL from your Render environment variables.",
  );
}

export function apiUrl(path: string): string {
  return base ? `${base}${path}` : path;
}
