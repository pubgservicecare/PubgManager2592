import { execFile } from "child_process";
import { promisify } from "util";
import { readdirSync, mkdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { randomBytes } from "crypto";

const execFileAsync = promisify(execFile);

// ── Binary resolution ──────────────────────────────────────────────────────
const YT_DLP_CANDIDATES = [
  join(homedir(), ".local/bin/yt-dlp"),
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
  "yt-dlp",
];

function resolveYtDlp(): string {
  const { existsSync } = require("fs");
  return YT_DLP_CANDIDATES.find((p) => existsSync(p)) ?? "yt-dlp";
}

const YT_DLP = resolveYtDlp();

export const TEMP_DIR = join(tmpdir(), "yt-downloads");
mkdirSync(TEMP_DIR, { recursive: true });

// ── Types ──────────────────────────────────────────────────────────────────
export interface VideoFormat {
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

export interface VideoInfo {
  type: "single";
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
  viewCount: number;
  formats: VideoFormat[];
}

export interface DownloadResult {
  filePath: string;
  ext: string;
  filesize: number;
  cleanup(): void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
export function isValidYoutubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "youtu.be" ||
      u.hostname === "m.youtube.com"
    );
  } catch {
    return false;
  }
}

function findTempFile(dir: string, prefix: string): string | null {
  try {
    const files = readdirSync(dir);
    const match = files.find((f) => f.startsWith(prefix));
    return match ? join(dir, match) : null;
  } catch {
    return null;
  }
}

function buildYtDlpArgs(
  url: string,
  itag: string | undefined,
  type: "video" | "audio",
  outputTemplate: string
): string[] {
  if (type === "audio") {
    if (itag && itag.startsWith("mp3-")) {
      const bitrate = itag.split("-")[1] + "K";
      return [
        "-x", "--audio-format", "mp3", "--audio-quality", bitrate,
        "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
      ];
    }
    return [
      "-f", itag || "bestaudio",
      "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
    ];
  }
  const formatStr = itag ? `${itag}+bestaudio/best` : "bestvideo+bestaudio/best";
  return [
    "-f", formatStr, "--merge-output-format", "mp4",
    "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
  ];
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync(
    YT_DLP,
    ["--dump-single-json", "--flat-playlist", "--no-warnings", "--no-playlist", url],
    { maxBuffer: 20 * 1024 * 1024, timeout: 30_000 }
  );

  const info = JSON.parse(stdout);

  const title = info.title || "Unknown Title";
  const thumbnail = info.thumbnail || "";
  const duration: number = info.duration || 0;
  const author: string = info.uploader || "Unknown";
  const viewCount: number = info.view_count || 0;

  const allFormats: any[] = info.formats || [];

  // ── Video formats ──────────────────────────────────────────────────────
  const rawVideo = allFormats.filter(
    (f) =>
      f.vcodec &&
      f.vcodec !== "none" &&
      f.ext !== "mhtml" &&
      f.protocol !== "m3u8_native" &&
      f.protocol !== "m3u8"
  );

  const videoMap = new Map<string, any>();
  for (const f of rawVideo) {
    const key = `${f.height || 0}-${Math.round(f.fps || 30)}-${f.ext}`;
    if (!videoMap.has(key) || (f.filesize || 0) > (videoMap.get(key).filesize || 0)) {
      videoMap.set(key, f);
    }
  }

  const videoFormats: VideoFormat[] = Array.from(videoMap.values())
    .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.fps || 30) - (a.fps || 30))
    .map((f, i) => ({
      itag: f.format_id,
      qualityLabel: f.height ? `${f.height}p${f.fps > 30 ? f.fps : ""}` : (f.format_note || "Unknown"),
      resolution: f.resolution || `${f.height}p`,
      fps: Math.round(f.fps) || null,
      vcodec: f.vcodec,
      acodec: f.acodec,
      container: f.ext,
      type: "video",
      filesize: f.filesize || f.filesize_approx || null,
      isRecommended: i === 0,
      height: f.height || 0,
    }));

  // ── Audio formats ──────────────────────────────────────────────────────
  const bestAudio = allFormats
    .filter((f) => f.vcodec === "none" && f.acodec !== "none")
    .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

  const baseAudioSize = bestAudio?.filesize || bestAudio?.filesize_approx || null;

  const audioFormats: VideoFormat[] = [
    {
      itag: "bestaudio",
      qualityLabel: "Best Quality Audio",
      resolution: "Audio Only",
      fps: null,
      vcodec: "none",
      acodec: bestAudio?.acodec || "unknown",
      container: bestAudio?.ext || "m4a",
      type: "audio",
      filesize: baseAudioSize,
      isRecommended: false,
      height: 0,
    },
    {
      itag: "mp3-320",
      qualityLabel: "MP3 320 kbps",
      resolution: "Audio Only",
      fps: null,
      vcodec: "none",
      acodec: "mp3",
      container: "mp3",
      type: "audio",
      filesize: duration ? Math.round((320 * 1000 * duration) / 8) : null,
      isRecommended: false,
      height: 0,
    },
    {
      itag: "mp3-192",
      qualityLabel: "MP3 192 kbps",
      resolution: "Audio Only",
      fps: null,
      vcodec: "none",
      acodec: "mp3",
      container: "mp3",
      type: "audio",
      filesize: duration ? Math.round((192 * 1000 * duration) / 8) : null,
      isRecommended: false,
      height: 0,
    },
    {
      itag: "mp3-128",
      qualityLabel: "MP3 128 kbps",
      resolution: "Audio Only",
      fps: null,
      vcodec: "none",
      acodec: "mp3",
      container: "mp3",
      type: "audio",
      filesize: duration ? Math.round((128 * 1000 * duration) / 8) : null,
      isRecommended: false,
      height: 0,
    },
  ];

  return {
    type: "single",
    title,
    thumbnail,
    duration,
    author,
    viewCount,
    formats: [...videoFormats, ...audioFormats],
  };
}

export async function downloadToTemp(
  url: string,
  itag: string | undefined,
  type: "video" | "audio"
): Promise<DownloadResult> {
  const tempId = randomBytes(8).toString("hex");
  const prefix = `yt-dl-${tempId}`;
  const template = join(TEMP_DIR, `${prefix}.%(ext)s`);

  const args = buildYtDlpArgs(url, itag, type, template);

  await execFileAsync(YT_DLP, args, {
    timeout: 5 * 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const filePath = findTempFile(TEMP_DIR, prefix);
  if (!filePath) throw new Error("Download completed but file not found on disk");

  const filesize = statSync(filePath).size;
  const ext = filePath.split(".").pop() || (type === "audio" ? "m4a" : "mp4");

  return {
    filePath,
    ext,
    filesize,
    cleanup() {
      try { unlinkSync(filePath); } catch {}
    },
  };
}
