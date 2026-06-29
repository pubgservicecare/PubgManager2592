import { execFile } from "child_process";
import { promisify } from "util";
import {
  existsSync,
  readdirSync,
  mkdirSync,
  statSync,
  unlinkSync,
  chmodSync,
  createWriteStream,
} from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { randomBytes } from "crypto";
import { pipeline } from "stream/promises";
import https from "https";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);
const HOME = homedir();

// ── yt-dlp binary resolution ───────────────────────────────────────────────
//
// Checked in order; first match wins.
// If none exist, the binary is auto-downloaded to .cache/yt-dlp on first use.

const CACHE_BIN = join(process.cwd(), ".cache", "yt-dlp");

const SYSTEM_CANDIDATES = [
  join(HOME, ".local/bin/yt-dlp"),
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
];

let YT_DLP: string = SYSTEM_CANDIDATES.find((p) => existsSync(p)) ?? "";

const YT_DLP_URL =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

// ── Cookie authentication ──────────────────────────────────────────────────
//
// Production setup (Render):
//   1. In your Render dashboard go to Settings → Secret Files.
//   2. Create a secret file at /etc/secrets/youtube-cookies.txt and paste
//      your Netscape-format cookies.txt content.
//   3. Add an environment variable:
//        YOUTUBE_COOKIES_FILE=/etc/secrets/youtube-cookies.txt
//
// The server validates the file on startup and passes it to every yt-dlp
// invocation via --cookies.  Cookie contents are never logged.
//
// If the variable is absent or the file does not exist, yt-dlp runs without
// authentication and callers receive a clear HTTP 403 when YouTube requires
// sign-in.

let COOKIES_FILE: string | null = null;

function initCookies(): void {
  const filePath = process.env.YOUTUBE_COOKIES_FILE;

  if (!filePath) {
    logger.info("yt-dlp: YOUTUBE_COOKIES_FILE not set — running without cookies");
    return;
  }

  if (!existsSync(filePath)) {
    logger.warn(
      { path: filePath },
      "yt-dlp: YOUTUBE_COOKIES_FILE points to a missing file — running without cookies",
    );
    return;
  }

  try {
    // Tighten permissions in case the file was created with looser defaults.
    chmodSync(filePath, 0o600);
  } catch {
    // Read-only mount (e.g. Render secret files) — acceptable, continue.
  }

  COOKIES_FILE = filePath;
  // Log only confirmation — never log path, size, or any cookie content.
  logger.info("YouTube cookies loaded.");
}

// Run once at module load so cookies are ready before the first request.
initCookies();

// ── yt-dlp auto-download ───────────────────────────────────────────────────
//
// If the binary is not found on the host, it is fetched from the official
// GitHub release and cached in .cache/yt-dlp (gitignored).  Only one
// concurrent download is allowed.

let downloadPromise: Promise<string> | null = null;

async function ensureYtDlp(): Promise<string> {
  if (YT_DLP && existsSync(YT_DLP)) return YT_DLP;
  if (existsSync(CACHE_BIN)) {
    YT_DLP = CACHE_BIN;
    return YT_DLP;
  }

  if (!downloadPromise) {
    downloadPromise = (async () => {
      mkdirSync(join(process.cwd(), ".cache"), { recursive: true });
      const tmp = CACHE_BIN + ".tmp";
      logger.info("yt-dlp: binary not found — downloading…");
      await downloadFile(YT_DLP_URL, tmp);
      chmodSync(tmp, 0o755);
      const { renameSync } = await import("fs");
      renameSync(tmp, CACHE_BIN);
      YT_DLP = CACHE_BIN;
      logger.info({ bin: CACHE_BIN }, "yt-dlp: binary ready");
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
              new Error(`yt-dlp download failed: HTTP ${res.statusCode}`),
            );
          }
          pipeline(res, createWriteStream(dest)).then(resolve).catch(reject);
        })
        .on("error", reject);
    };
    follow(url);
  });
}

// ── Shared environment for spawned yt-dlp processes ───────────────────────
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
    const match = readdirSync(dir).find((f) => f.startsWith(prefix));
    return match ? join(dir, match) : null;
  } catch {
    return null;
  }
}

/**
 * Classify a yt-dlp stderr string into one of three auth-related categories,
 * or null if the error is unrelated to authentication.
 */
export type AuthErrorKind =
  | "bot_check"      // "Sign in to confirm you're not a bot"
  | "login_required" // video requires a signed-in account
  | "cookies_expired"// cookies present but no longer valid
  | null;

export function classifyAuthError(stderr: string): AuthErrorKind {
  if (
    stderr.includes("Sign in to confirm") ||
    stderr.includes("confirm you") ||
    stderr.includes("bot")
  )
    return "bot_check";

  if (
    stderr.includes("login_required") ||
    stderr.includes("Please sign in") ||
    stderr.includes("This video is available to") ||
    stderr.includes("members only")
  )
    return "login_required";

  if (
    stderr.includes("cookies") &&
    (stderr.includes("expired") || stderr.includes("invalid") || stderr.includes("rejected"))
  )
    return "cookies_expired";

  return null;
}

/** Human-readable message for each auth error kind. */
export function authErrorMessage(kind: NonNullable<AuthErrorKind>): string {
  switch (kind) {
    case "bot_check":
      return "YouTube authentication is required. Server cookies are missing.";
    case "login_required":
      return "This video requires a signed-in YouTube account. Configure YOUTUBE_COOKIES_FILE on the server.";
    case "cookies_expired":
      return "The server's YouTube cookies have expired and must be refreshed. Contact the site administrator.";
  }
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
  let core: string[];

  if (type === "audio") {
    if (itag?.startsWith("mp3-")) {
      const bitrate = itag.split("-")[1] + "K";
      core = [
        "-x", "--audio-format", "mp3", "--audio-quality", bitrate,
        "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
      ];
    } else {
      core = [
        "-f", itag || "bestaudio",
        "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
      ];
    }
  } else {
    const fmt = itag ? `${itag}+bestaudio/best` : "bestvideo+bestaudio/best";
    core = [
      "-f", fmt, "--merge-output-format", "mp4",
      "-o", outputTemplate, "--no-warnings", "--no-playlist", url,
    ];
  }

  return withCookies(core);
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
    .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.fps || 30) - (a.fps || 30))
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

  const duration: number = info.duration || 0;

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
      filesize: bestAudio?.filesize || bestAudio?.filesize_approx || null,
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
    title: info.title || "Unknown Title",
    thumbnail: info.thumbnail || "",
    duration,
    author: info.uploader || "Unknown",
    viewCount: info.view_count || 0,
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

  await execFileAsync(bin, buildYtDlpArgs(url, itag, type, template), {
    timeout: 5 * 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
    env: YT_ENV,
  });

  const filePath = findTempFile(TEMP_DIR, prefix);
  if (!filePath) throw new Error("Download completed but output file not found");

  const ext = filePath.split(".").pop() || (type === "audio" ? "m4a" : "mp4");

  return {
    filePath,
    ext,
    filesize: statSync(filePath).size,
    cleanup() {
      try { unlinkSync(filePath); } catch {}
    },
  };
}
