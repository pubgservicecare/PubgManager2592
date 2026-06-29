import { execFile } from "child_process";
import { promisify } from "util";
import {
  existsSync,
  readdirSync,
  mkdirSync,
  statSync,
  unlinkSync,
  chmodSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { randomBytes } from "crypto";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import https from "https";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

// ── Binary resolution ──────────────────────────────────────────────────────
const HOME = homedir();

// Writable cache directory — works on Render without root permissions.
const CACHE_BIN = join(process.cwd(), ".cache", "yt-dlp");

// Known system locations (may or may not exist depending on the host)
const SYSTEM_CANDIDATES = [
  join(HOME, ".local/bin/yt-dlp"),
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
];

let YT_DLP = SYSTEM_CANDIDATES.find((p) => existsSync(p)) ?? "";

const YT_DLP_URL =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

// ── Cookie support ─────────────────────────────────────────────────────────
//
// Set YOUTUBE_COOKIES_B64 to a base64-encoded Netscape cookies.txt file.
// On startup the value is decoded and written to a secure temp file.
// Every yt-dlp invocation then receives --cookies <path>.
//
// If the variable is absent the downloader works without cookies (but YouTube
// may rate-limit or block requests from data-centre IPs).

let COOKIES_FILE: string | null = null;

function initCookies(): void {
  const raw = process.env.YOUTUBE_COOKIES_B64;
  if (!raw) {
    logger.info("yt-dlp: YOUTUBE_COOKIES_B64 not set — running without cookies");
    return;
  }

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const dest = join(tmpdir(), `yt-cookies-${randomBytes(6).toString("hex")}.txt`);
    writeFileSync(dest, decoded, { encoding: "utf8", mode: 0o600 });
    COOKIES_FILE = dest;
    logger.info({ cookiesFile: dest }, "yt-dlp: cookies loaded from YOUTUBE_COOKIES_B64");
  } catch (err) {
    logger.error({ err }, "yt-dlp: failed to write cookies file — continuing without cookies");
  }
}

// Run once at module load time so the file is ready before the first request.
initCookies();

// ── Auto-download at first use ─────────────────────────────────────────────
//
// Downloads the yt-dlp binary into a writable application directory the first
// time it is needed, then caches it for all subsequent calls.

let downloadPromise: Promise<string> | null = null;

async function ensureYtDlp(): Promise<string> {
  if (YT_DLP && existsSync(YT_DLP)) return YT_DLP;

  if (existsSync(CACHE_BIN)) {
    YT_DLP = CACHE_BIN;
    return YT_DLP;
  }

  if (!downloadPromise) {
    downloadPromise = (async () => {
      const cacheDir = join(process.cwd(), ".cache");
      mkdirSync(cacheDir, { recursive: true });

      const tmpPath = CACHE_BIN + ".tmp";
      logger.info("yt-dlp: binary not found — downloading from GitHub releases…");
      await downloadFile(YT_DLP_URL, tmpPath);
      chmodSync(tmpPath, 0o755);

      const fs = await import("fs");
      fs.renameSync(tmpPath, CACHE_BIN);

      YT_DLP = CACHE_BIN;
      logger.info({ bin: CACHE_BIN }, "yt-dlp: binary downloaded and cached");
      return YT_DLP;
    })().finally(() => {
      downloadPromise = null;
    });
  }

  return downloadPromise;
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      https
        .get(u, (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            return follow(res.headers.location);
          }
          if (res.statusCode !== 200) {
            return reject(
              new Error(`yt-dlp download failed with HTTP ${res.statusCode}`),
            );
          }
          const out = createWriteStream(dest);
          pipeline(res, out).then(resolve).catch(reject);
        })
        .on("error", reject);
    };
    follow(url);
  });
}

// ── Shared env for all yt-dlp spawns ──────────────────────────────────────
const YT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: `${join(process.cwd(), ".cache")}:${join(HOME, ".local/bin")}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
};

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

/** Returns true when the stderr indicates YouTube requires a login / bot check. */
function isLoginRequired(stderr: string): boolean {
  return (
    stderr.includes("Sign in to confirm") ||
    stderr.includes("bot") ||
    stderr.includes("This video is available to") ||
    stderr.includes("cookies") ||
    stderr.includes("login_required") ||
    stderr.includes("Please sign in")
  );
}

/** Prepend --cookies flag when a cookies file is configured. */
function withCookies(args: string[]): string[] {
  return COOKIES_FILE ? ["--cookies", COOKIES_FILE, ...args] : args;
}

function buildYtDlpArgs(
  url: string,
  itag: string | undefined,
  type: "video" | "audio",
  outputTemplate: string,
): string[] {
  let args: string[];

  if (type === "audio") {
    if (itag && itag.startsWith("mp3-")) {
      const bitrate = itag.split("-")[1] + "K";
      args = [
        "-x", "--audio-format", "mp3", "--audio-quality", bitrate,
        "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
      ];
    } else {
      args = [
        "-f", itag || "bestaudio",
        "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
      ];
    }
  } else {
    const formatStr = itag ? `${itag}+bestaudio/best` : "bestvideo+bestaudio/best";
    args = [
      "-f", formatStr, "--merge-output-format", "mp4",
      "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
    ];
  }

  return withCookies(args);
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const bin = await ensureYtDlp();

  const args = withCookies([
    "--dump-single-json", "--flat-playlist", "--no-warnings", "--no-playlist", url,
  ]);

  const { stdout } = await execFileAsync(bin, args, {
    maxBuffer: 20 * 1024 * 1024,
    timeout: 30_000,
    env: YT_ENV,
  });

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
      f.protocol !== "m3u8",
  );

  const videoMap = new Map<string, any>();
  for (const f of rawVideo) {
    const key = `${f.height || 0}-${Math.round(f.fps || 30)}-${f.ext}`;
    if (!videoMap.has(key) || (f.filesize || 0) > (videoMap.get(key).filesize || 0)) {
      videoMap.set(key, f);
    }
  }

  const videoFormats: VideoFormat[] = Array.from(videoMap.values())
    .sort(
      (a, b) =>
        (b.height || 0) - (a.height || 0) || (b.fps || 30) - (a.fps || 30),
    )
    .map((f, i) => ({
      itag: f.format_id,
      qualityLabel: f.height
        ? `${f.height}p${f.fps > 30 ? f.fps : ""}`
        : f.format_note || "Unknown",
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

  const baseAudioSize =
    bestAudio?.filesize || bestAudio?.filesize_approx || null;

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
  type: "video" | "audio",
): Promise<DownloadResult> {
  const bin = await ensureYtDlp();

  const tempId = randomBytes(8).toString("hex");
  const prefix = `yt-dl-${tempId}`;
  const template = join(TEMP_DIR, `${prefix}.%(ext)s`);

  const args = buildYtDlpArgs(url, itag, type, template);

  await execFileAsync(bin, args, {
    timeout: 5 * 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
    env: YT_ENV,
  });

  const filePath = findTempFile(TEMP_DIR, prefix);
  if (!filePath)
    throw new Error("Download completed but file not found on disk");

  const filesize = statSync(filePath).size;
  const ext =
    filePath.split(".").pop() || (type === "audio" ? "m4a" : "mp4");

  return {
    filePath,
    ext,
    filesize,
    cleanup() {
      try {
        unlinkSync(filePath);
      } catch {}
    },
  };
}

// Re-export the login-required check so routes can map it to a clean 403.
export { isLoginRequired };
