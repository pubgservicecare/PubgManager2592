import { useRef, useState, useEffect } from "react";
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { useDownloadManager, type DownloadItem } from "@/hooks/use-download-manager";

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtBytes(b: number): string {
  if (b <= 0) return "0 B";
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  if (b >= 1_024) return `${(b / 1_024).toFixed(0)} KB`;
  return `${b} B`;
}

function fmtSpeed(bps: number): string {
  if (bps <= 0) return "";
  if (bps >= 1_048_576) return `${(bps / 1_048_576).toFixed(1)} MB/s`;
  if (bps >= 1_024) return `${(bps / 1_024).toFixed(0)} KB/s`;
  return `${bps.toFixed(0)} B/s`;
}

// ── Single download row ────────────────────────────────────────────────────
function DownloadRow({ item, onRemove }: { item: DownloadItem; onRemove: () => void }) {
  const percent = item.total > 0 ? Math.min(100, (item.received / item.total) * 100) : 0;
  const isActive = item.state === "downloading";
  const isDone = item.state === "done";
  const isError = item.state === "error";

  return (
    <div className={`rounded-xl border p-3 space-y-2 transition-colors ${
      isError
        ? "border-destructive/30 bg-destructive/5"
        : isDone
        ? "border-emerald-500/25 bg-emerald-500/5"
        : "border-border bg-secondary/30"
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 shrink-0 ${
          isDone ? "text-emerald-400" : isError ? "text-destructive" : "text-primary"
        }`}>
          {isActive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
          {isError && <AlertCircle className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white truncate leading-tight">
            {item.title}
          </p>
          <p className={`text-[10px] font-semibold mt-0.5 ${
            isDone ? "text-emerald-400" : isError ? "text-destructive" : "text-primary"
          }`}>
            MP4 · {item.quality}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-white transition-colors p-0.5"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Progress bar */}
      {(isActive || isDone) && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDone ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${isDone ? 100 : percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">
              {isDone
                ? `${fmtBytes(item.total || item.received)} — complete`
                : item.total > 0
                ? `${fmtBytes(item.received)} / ${fmtBytes(item.total)}`
                : item.received > 0
                ? `${fmtBytes(item.received)} downloaded`
                : "Processing on server…"}
            </span>
            {isActive && item.speed > 0 && (
              <span className="text-[9px] font-bold text-primary">
                {fmtSpeed(item.speed)}
              </span>
            )}
          </div>
        </div>
      )}

      {isError && (
        <p className="text-[10px] text-destructive leading-snug">{item.error}</p>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────
export function DownloadManager() {
  const { downloads, activeCount, removeDownload, clearDone } = useDownloadManager();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasDone = downloads.some((d) => d.state === "done");
  const totalCount = downloads.length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (totalCount === 0) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-sm transition-all ${
          activeCount > 0
            ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
            : "bg-secondary/50 border-border text-white hover:bg-secondary"
        }`}
        aria-label={`Downloads (${totalCount})`}
      >
        {activeCount > 0 ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline text-xs">Downloads</span>
        {/* Badge */}
        <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
          activeCount > 0
            ? "bg-primary text-primary-foreground"
            : "bg-emerald-500 text-white"
        }`}>
          {totalCount}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background/60">
            <div className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Downloads
              </span>
              {activeCount > 0 && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {activeCount} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasDone && (
                <button
                  onClick={clearDone}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white transition-colors px-1.5 py-1 rounded"
                  title="Clear completed"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-white transition-colors p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Download list */}
          <div className="p-2.5 space-y-2 max-h-[420px] overflow-y-auto">
            {downloads.map((item) => (
              <DownloadRow
                key={item.id}
                item={item}
                onRemove={() => removeDownload(item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
