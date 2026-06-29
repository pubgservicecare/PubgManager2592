import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────
export interface DownloadItem {
  id: string;
  title: string;
  quality: string;
  state: "downloading" | "done" | "error";
  received: number;
  total: number;
  speed: number;
  error: string;
}

interface StartParams {
  url: string;
  itag: string;
  type: "video" | "audio";
  title: string;
  quality: string;
  container: string;
}

interface DownloadManagerCtx {
  downloads: DownloadItem[];
  startDownload: (p: StartParams) => void;
  removeDownload: (id: string) => void;
  clearDone: () => void;
  activeCount: number;
}

// ── Context ────────────────────────────────────────────────────────────────
const Ctx = createContext<DownloadManagerCtx | null>(null);

export function useDownloadManager(): DownloadManagerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDownloadManager must be used inside DownloadManagerProvider");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────
export function DownloadManagerProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  // Speed samples stored in a ref so updating them never causes a re-render.
  const speedSamples = useRef<Map<string, Array<[number, number]>>>(new Map());

  const setItem = useCallback((id: string, patch: Partial<DownloadItem>) => {
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
  }, []);

  const computeSpeed = useCallback(
    (id: string, received: number): number => {
      const now = Date.now();
      const samples = speedSamples.current.get(id) ?? [];
      samples.push([now, received]);
      const cutoff = now - 3000;
      const recent = samples.filter(([t]) => t >= cutoff);
      speedSamples.current.set(id, recent);
      if (recent.length < 2) return 0;
      const [t0, b0] = recent[0];
      const [t1, b1] = recent[recent.length - 1];
      const dt = (t1 - t0) / 1000;
      return dt > 0 ? (b1 - b0) / dt : 0;
    },
    [],
  );

  const startDownload = useCallback(
    ({ url, itag, type, title, quality, container }: StartParams) => {
      const id = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: DownloadItem = {
        id,
        title,
        quality,
        state: "downloading",
        received: 0,
        total: 0,
        speed: 0,
        error: "",
      };
      setDownloads((prev) => [item, ...prev]);
      speedSamples.current.set(id, []);

      // Stream the download in the background
      (async () => {
        try {
          const params = new URLSearchParams({ url, itag, type });
          const res = await fetch(`/api/yt-download?${params}`, {
            credentials: "include",
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            let msg = (body as any).error ?? `Server error ${res.status}`;
            if (res.status === 403)
              msg =
                "Server YouTube authentication failed. The server cookies are missing, expired, or invalid.";
            setItem(id, { state: "error", error: msg });
            return;
          }

          const total = Number(res.headers.get("Content-Length") ?? 0);
          const reader = res.body?.getReader();
          if (!reader) {
            setItem(id, { state: "error", error: "Stream not available" });
            return;
          }

          const chunks: Uint8Array[] = [];
          let received = 0;

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.byteLength;
            const speed = computeSpeed(id, received);
            setItem(id, { received, total, speed });
          }

          // Trigger browser save
          const disposition = res.headers.get("Content-Disposition") ?? "";
          const match = disposition.match(/filename="?([^"]+)"?/);
          const safeTitle = title.replace(/[^\w\s-]/gi, "").trim().slice(0, 60) || "download";
          const filename = match?.[1] ?? `${safeTitle}.${container}`;

          const blob = new Blob(chunks);
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);

          setItem(id, { state: "done", received, total, speed: 0 });
        } catch (e: any) {
          setItem(id, {
            state: "error",
            error: e.message || "Download failed",
          });
        } finally {
          speedSamples.current.delete(id);
        }
      })();
    },
    [setItem, computeSpeed],
  );

  const removeDownload = useCallback((id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setDownloads((prev) => prev.filter((d) => d.state !== "done"));
  }, []);

  const activeCount = downloads.filter((d) => d.state === "downloading").length;

  return (
    <Ctx.Provider
      value={{ downloads, startDownload, removeDownload, clearDone, activeCount }}
    >
      {children}
    </Ctx.Provider>
  );
}
