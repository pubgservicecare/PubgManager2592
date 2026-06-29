import { useState, useRef } from "react";
import {
  Youtube,
  Download,
  Music2,
  Video,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  FileVideo,
  FileAudio,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface VideoFormat {
  itag: string;
  qualityLabel: string;
  resolution: string;
  fps: number | null;
  vcodec: string;
  acodec: string;
  container: string;
  type: "video" | "audio";
  filesize: number | null;
  isRecommended: boolean;
  height: number;
}

interface VideoInfo {
  type: "single";
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
  viewCount: number;
  formats: VideoFormat[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDuration(sec: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024)         return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

// ── FormatRow component ────────────────────────────────────────────────────
function FormatRow({
  fmt,
  url,
  onDownloadStart,
  onDownloadEnd,
}: {
  fmt: VideoFormat;
  url: string;
  onDownloadStart(itag: string): void;
  onDownloadEnd(itag: string): void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const isAudio = fmt.type === "audio";

  const handleDownload = async () => {
    if (state === "loading") return;
    setState("loading");
    setErrMsg("");
    onDownloadStart(fmt.itag);

    const params = new URLSearchParams({
      url,
      itag: fmt.itag,
      type: fmt.type,
    });

    try {
      const res = await fetch(`/api/yt-download?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `Server error ${res.status}`);
      }

      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `download.${fmt.container}`;

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);

      setState("done");
      setTimeout(() => setState("idle"), 4000);
    } catch (e: any) {
      setErrMsg(e.message || "Download failed. Please try again.");
      setState("error");
      setTimeout(() => setState("idle"), 6000);
    } finally {
      onDownloadEnd(fmt.itag);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-background border border-border hover:border-primary/40 transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAudio ? "bg-violet-500/15 text-violet-400" : "bg-primary/15 text-primary"}`}>
          {isAudio ? <FileAudio className="w-3.5 h-3.5" /> : <FileVideo className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
            {fmt.qualityLabel}
            {fmt.isRecommended && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">BEST</span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {fmt.container.toUpperCase()}
            {fmt.fps && fmt.fps > 30 ? ` · ${fmt.fps}fps` : ""}
            {fmt.filesize ? ` · ~${formatBytes(fmt.filesize)}` : ""}
          </p>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {state === "error" && (
          <span className="text-[11px] text-destructive max-w-[140px] truncate">{errMsg}</span>
        )}
        <button
          onClick={handleDownload}
          disabled={state === "loading"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            state === "done"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : state === "error"
              ? "bg-destructive/20 text-destructive border border-destructive/30"
              : state === "loading"
              ? "bg-primary/10 text-primary/60 border border-primary/20 cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary"
          }`}
        >
          {state === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
          {state === "done"    && <CheckCircle2 className="w-3 h-3" />}
          {state === "error"   && <AlertCircle className="w-3 h-3" />}
          {state === "idle"    && <Download className="w-3 h-3" />}
          {state === "loading" ? "Downloading…" : state === "done" ? "Done!" : state === "error" ? "Failed" : "Download"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function YoutubeDownloader() {
  const [url, setUrl] = useState("");
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "error">("idle");
  const [fetchError, setFetchError] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());
  const [showAllVideo, setShowAllVideo] = useState(false);
  const [showAllAudio, setShowAllAudio] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const videoFormats = info?.formats.filter((f) => f.type === "video") ?? [];
  const audioFormats = info?.formats.filter((f) => f.type === "audio") ?? [];

  const visibleVideo = showAllVideo ? videoFormats : videoFormats.slice(0, 5);
  const visibleAudio = showAllAudio ? audioFormats : audioFormats.slice(0, 3);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setFetchState("loading");
    setFetchError("");
    setInfo(null);
    setShowAllVideo(false);
    setShowAllAudio(false);

    try {
      const res = await fetch("/api/yt-info", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setInfo(data as VideoInfo);
      setFetchState("idle");
    } catch (e: any) {
      setFetchError(e.message || "Failed to fetch video info.");
      setFetchState("error");
    }
  };

  const onDownloadStart = (itag: string) =>
    setActiveDownloads((prev) => new Set(prev).add(itag));
  const onDownloadEnd = (itag: string) =>
    setActiveDownloads((prev) => { const s = new Set(prev); s.delete(itag); return s; });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-red-500/8 to-transparent">
        <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <Youtube className="w-4.5 h-4.5 text-red-400" />
        </div>
        <div>
          <h2 className="font-bold text-white text-sm uppercase tracking-wider">YouTube Downloader</h2>
          <p className="text-[11px] text-muted-foreground">Paste a YouTube link to download video or audio</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* URL Input */}
        <form onSubmit={handleFetch} className="flex gap-2">
          <div className="relative flex-1">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (fetchState === "error") { setFetchState("idle"); setFetchError(""); }
                if (info) setInfo(null);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
              disabled={fetchState === "loading"}
            />
          </div>
          <button
            type="submit"
            disabled={fetchState === "loading" || !url.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {fetchState === "loading"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
            {fetchState === "loading" ? "Analyzing…" : "Analyze"}
          </button>
        </form>

        {/* Error state */}
        {fetchState === "error" && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {fetchState === "loading" && (
          <div className="space-y-3 animate-pulse">
            <div className="flex gap-3">
              <div className="w-28 h-16 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded-full w-3/4" />
                <div className="h-3 bg-muted rounded-full w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Video info + formats */}
        {info && (
          <div className="space-y-4">
            {/* Video card */}
            <div className="flex gap-3 p-3 rounded-xl bg-background border border-border">
              {info.thumbnail && (
                <img
                  src={info.thumbnail}
                  alt={info.title}
                  className="w-28 h-16 object-cover rounded-lg shrink-0 bg-muted"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="flex-1 min-w-0 py-0.5">
                <p className="font-bold text-white text-sm line-clamp-2 leading-snug mb-1.5">{info.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-white/70">{info.author}</span>
                  {info.duration > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(info.duration)}
                    </span>
                  )}
                  {info.viewCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatViews(info.viewCount)} views
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Video formats */}
            {videoFormats.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Video Formats ({videoFormats.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {visibleVideo.map((fmt) => (
                    <FormatRow
                      key={fmt.itag}
                      fmt={fmt}
                      url={url.trim()}
                      onDownloadStart={onDownloadStart}
                      onDownloadEnd={onDownloadEnd}
                    />
                  ))}
                </div>
                {videoFormats.length > 5 && (
                  <button
                    onClick={() => setShowAllVideo((v) => !v)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-white transition-colors"
                  >
                    {showAllVideo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showAllVideo ? "Show less" : `Show ${videoFormats.length - 5} more formats`}
                  </button>
                )}
              </div>
            )}

            {/* Audio formats */}
            {audioFormats.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Music2 className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Audio Formats ({audioFormats.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {visibleAudio.map((fmt) => (
                    <FormatRow
                      key={fmt.itag}
                      fmt={fmt}
                      url={url.trim()}
                      onDownloadStart={onDownloadStart}
                      onDownloadEnd={onDownloadEnd}
                    />
                  ))}
                </div>
                {audioFormats.length > 3 && (
                  <button
                    onClick={() => setShowAllAudio((v) => !v)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-white transition-colors"
                  >
                    {showAllAudio ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showAllAudio ? "Show less" : `Show ${audioFormats.length - 3} more formats`}
                  </button>
                )}
              </div>
            )}

            {/* Active downloads notice */}
            {activeDownloads.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                Downloading {activeDownloads.size} file{activeDownloads.size > 1 ? "s" : ""}… Please wait and do not close this tab.
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground/60 text-center px-2">
              For personal use only. Temporary files are automatically deleted after download.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
