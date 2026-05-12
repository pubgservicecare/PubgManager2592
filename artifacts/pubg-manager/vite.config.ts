import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const isBuild = process.argv.includes("build");

const port = rawPort ? Number(rawPort) : 5000;

if (!isBuild && rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

const apiTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:8080";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Raise the warning threshold — chunks are now properly split
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor libraries into named, cacheable chunks
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // Charts (recharts + d3 deps) — only loaded on admin & seller dashboard
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory-vendor")) {
            return "vendor-charts";
          }

          // Framer Motion — only loaded on home & seller dashboard
          if (id.includes("framer-motion")) {
            return "vendor-framer";
          }

          // Uppy file-upload stack — only loaded on account create/edit forms
          if (id.includes("@uppy") || id.includes("/uppy/")) {
            return "vendor-uppy";
          }

          // Radix UI component primitives
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }

          // Lucide icons — tree-shaken per page, isolated for long-lived HTTP cache
          if (id.includes("lucide-react") || id.includes("lucide")) {
            return "vendor-lucide";
          }

          // TanStack Query + React — all in one vendor chunk to avoid circular
          // cross-chunk imports that occur when react/react-dom are isolated
          return "vendor";
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        // Tell the API server the original request was HTTPS so it sends
        // Secure session cookies back through the Vite dev proxy.
        // Without this, Express sees req.secure=false (HTTP internally) and
        // silently drops Set-Cookie — the session is saved to DB but the
        // cookie never reaches the browser.
        headers: {
          "x-forwarded-proto": "https",
        },
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
