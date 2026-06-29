import { useState } from "react";
import {
  Download,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Music2,
  Video,
  FileVideo,
  FileAudio,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
  duration: number;
  formats: VideoFormat[];
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1_048_576) return ` · ~${(bytes / 1_048_576).toFixed(0)}MB`;
  if (bytes >= 1_024)    return ` · ~${(bytes / 1_024).toFixed(0)}KB`;
  return "";
}

function FormatRow({
  fmt,
  url,
}: {
  fmt: VideoFormat;
  url: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const isAudio = fmt.type === "audio";

  const handleDownload = async () => {
    if (state === "loading") return;
    setState("loading");
    setErrMsg("");

    const params = new URLSearchParams({ url, itag: fmt.itag, type: fmt.type });
    try {
      const res = await fetch(`/api/yt-download?${params}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `Error ${res.status}`);
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
      setErrMsg(e.message || "Failed");
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isAudio ? "bg-violet-500/15 text-violet-400" : "bg-primary/15 text-primary"}`}>
          {isAudio ? <FileAudio className="w-3 h-3" /> : <FileVideo className="w-3 h-3" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white flex items-center gap-1">
            {fmt.qualityLabel}
            {fmt.isRecommended && <span className="text-[9px] font-black px-1 py-px rounded bg-primary/20 text-primary">BEST</span>}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {fmt.container.toUpperCase()}
            {fmt.fps && fmt.fps > 30 ? ` · ${fmt.fps}fps` : ""}
            {formatBytes(fmt.filesize)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {state === "error" && <span className="text-[10px] text-destructive max-w-[100px] truncate">{errMsg}</span>}
        <button
          onClick={handleDownload}
          disabled={state === "loading"}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
            state === "done"    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : state === "error"  ? "bg-destructive/20 text-destructive border border-destructive/30"
            : state === "loading"? "bg-primary/10 text-primary/60 border border-primary/20 cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary"
          }`}
        >
          {state === "loading" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
          {state === "done"    && <CheckCircle2 className="w-2.5 h-2.5" />}
          {state === "error"   && <AlertCircle className="w-2.5 h-2.5" />}
          {state === "idle"    && <Download className="w-2.5 h-2.5" />}
          {state === "loading" ? "…" : state === "done" ? "Done!" : state === "error" ? "Failed" : "Get"}
        </button>
      </div>
    </div>
  );
}

export function YoutubeVideoDownloadButton({ videoUrl }: { videoUrl: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [showAllVideo, setShowAllVideo] = useState(false);
  const [showAllAudio, setShowAllAudio] = useState(false);

  const videoFormats = info?.formats.filter((f) => f.type === "video") ?? [];
  const audioFormats = info?.formats.filter((f) => f.type === "audio") ?? [];
  const visibleVideo = showAllVideo ? videoFormats : videoFormats.slice(0, 4);
  const visibleAudio = showAllAudio ? audioFormats : audioFormats.slice(0, 2);

  const handleOpen = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (info) return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/yt-info", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setInfo(data as VideoInfo);
      setState("idle");
    } catch (e: any) {
      setError(e.message || "Could not load formats.");
      setState("error");
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-background border border-border hover:border-primary/50 text-white text-sm font-bold transition-all hover:bg-primary/5 group"
      >
        {state === "loading" && !info
          ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
          : <Download className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />}
        Download Video
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background/50">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Select Format</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
            {state === "loading" && !info && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Fetching available formats…</p>
              </div>
            )}

            {state === "error" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {info && (
              <>
                {videoFormats.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <Video className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Video ({videoFormats.length})</span>
                    </div>
                    {visibleVideo.map((fmt) => (
                      <FormatRow key={fmt.itag} fmt={fmt} url={videoUrl} />
                    ))}
                    {videoFormats.length > 4 && (
                      <button
                        onClick={() => setShowAllVideo((v) => !v)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors"
                      >
                        {showAllVideo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showAllVideo ? "Show less" : `+${videoFormats.length - 4} more`}
                      </button>
                    )}
                  </div>
                )}

                {audioFormats.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <Music2 className="w-3 h-3 text-violet-400" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Audio Only</span>
                    </div>
                    {visibleAudio.map((fmt) => (
                      <FormatRow key={fmt.itag} fmt={fmt} url={videoUrl} />
                    ))}
                    {audioFormats.length > 2 && (
                      <button
                        onClick={() => setShowAllAudio((v) => !v)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors"
                      >
                        {showAllAudio ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showAllAudio ? "Show less" : `+${audioFormats.length - 2} more`}
                      </button>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground/50 text-center pt-1 pb-0.5">
                  Personal use only · Temp files auto-deleted after download
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
