import { useState } from "react";
import {
  Download,
  Loader2,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { useDownloadManager } from "@/hooks/use-download-manager";

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
  duration: number;
  thumbnail: string;
  author: string;
  formats: VideoFormat[];
}

// Only show these heights, in this order. Download will always be .mp4.
const ALLOWED_HEIGHTS = [1440, 1080, 720, 480] as const;
type AllowedHeight = (typeof ALLOWED_HEIGHTS)[number];

const HEIGHT_LABEL: Record<AllowedHeight, string> = {
  1440: "2K / 1440p",
  1080: "Full HD / 1080p",
  720:  "HD / 720p",
  480:  "SD / 480p",
};

function pickBestPerHeight(formats: VideoFormat[]): Map<AllowedHeight, VideoFormat> {
  const map = new Map<AllowedHeight, VideoFormat>();
  for (const fmt of formats) {
    if (fmt.type !== "video") continue;
    if (!(ALLOWED_HEIGHTS as readonly number[]).includes(fmt.height)) continue;
    const h = fmt.height as AllowedHeight;
    const existing = map.get(h);
    if (!existing || (fmt.filesize ?? 0) > (existing.filesize ?? 0)) {
      map.set(h, fmt);
    }
  }
  return map;
}

// ── Format button ──────────────────────────────────────────────────────────
function QualityButton({
  height,
  fmt,
  videoUrl,
  videoTitle,
}: {
  height: AllowedHeight;
  fmt: VideoFormat;
  videoUrl: string;
  videoTitle: string;
}) {
  const { startDownload } = useDownloadManager();
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    if (added) return;
    startDownload({
      url: videoUrl,
      itag: fmt.itag,
      type: "video",
      title: videoTitle,
      quality: `${height}p`,
      container: "mp4",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={added}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border font-bold text-sm transition-all ${
        added
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
          : "border-border bg-background hover:border-primary/40 hover:bg-primary/5 text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
          added ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/15 text-primary"
        }`}>
          {height}p
        </span>
        <span className="text-sm">{HEIGHT_LABEL[height]}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>MP4</span>
        {added ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <Download className="w-4 h-4 text-primary" />
        )}
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function YoutubeVideoDownloadButton({ videoUrl }: { videoUrl: string }) {
  const [open, setOpen] = useState(false);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [needsCookies, setNeedsCookies] = useState(false);
  const [info, setInfo] = useState<VideoInfo | null>(null);

  const fetchInfo = async () => {
    setFetchState("loading");
    setError("");
    setNeedsCookies(false);
    try {
      const res = await fetch("/api/yt-info", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsCookies) setNeedsCookies(true);
        throw new Error(data.error || `Server error ${res.status}`);
      }
      setInfo(data as VideoInfo);
      setFetchState("idle");
    } catch (e: any) {
      setError(e.message || "Could not load formats.");
      setFetchState("error");
    }
  };

  const handleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!info) await fetchInfo();
  };

  const handleRetry = () => {
    setInfo(null);
    setFetchState("idle");
    setError("");
    fetchInfo();
  };

  const formatMap = info ? pickBestPerHeight(info.formats) : null;
  const availableHeights = formatMap
    ? ALLOWED_HEIGHTS.filter((h) => formatMap.has(h))
    : [];

  return (
    <div className="mt-2">
      {/* Trigger */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-background border border-border hover:border-primary/50 text-white text-sm font-bold transition-all hover:bg-primary/5 group"
      >
        {fetchState === "loading" && !info ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <Download className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        )}
        Download Video
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background/50">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              {info
                ? `${info.title.slice(0, 38)}${info.title.length > 38 ? "…" : ""}`
                : "Select Quality"}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-2">
            {/* Loading */}
            {fetchState === "loading" && !info && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Fetching available qualities…</p>
              </div>
            )}

            {/* Error */}
            {fetchState === "error" && (
              <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/25">
                <div className="flex items-start gap-2 text-destructive text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>

                {needsCookies && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 space-y-2">
                    <p className="text-[11px] font-bold text-amber-400">
                      🍪 Render pe YouTube Cookies Setup Karein
                    </p>
                    <ol className="text-[10px] text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>Chrome mein <span className="text-white font-semibold">youtube.com</span> pe login karein</li>
                      <li>
                        Extension install karein:{" "}
                        <a
                          href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 underline font-semibold"
                        >
                          Get cookies.txt LOCALLY
                        </a>
                      </li>
                      <li>YouTube pe jakar extension se cookies export karein <span className="text-white">(Netscape format)</span></li>
                      <li>
                        Render Dashboard →{" "}
                        <span className="text-white font-semibold">Settings → Secret Files</span>
                      </li>
                      <li>
                        File path:{" "}
                        <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 text-[10px]">
                          /etc/secrets/youtube-cookies.txt
                        </code>
                      </li>
                      <li>
                        Environment variable add karein:
                        <br />
                        <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 text-[10px] break-all">
                          YOUTUBE_COOKIES_FILE=/etc/secrets/youtube-cookies.txt
                        </code>
                      </li>
                      <li>Render pe <span className="text-white font-semibold">Manual Deploy</span> karein</li>
                    </ol>
                  </div>
                )}

                <button
                  onClick={handleRetry}
                  className="self-start text-[11px] font-bold text-primary hover:underline"
                >
                  Dobara try karein
                </button>
              </div>
            )}

            {/* Quality buttons */}
            {info && formatMap && (
              <>
                {availableHeights.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No compatible formats found for this video.
                  </p>
                ) : (
                  availableHeights.map((h) => (
                    <QualityButton
                      key={h}
                      height={h}
                      fmt={formatMap.get(h)!}
                      videoUrl={videoUrl}
                      videoTitle={info.title}
                    />
                  ))
                )}
                <p className="text-[10px] text-muted-foreground/50 text-center pt-1">
                  Downloads appear in the header · Personal use only
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
