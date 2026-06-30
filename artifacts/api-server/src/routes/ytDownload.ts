import { Router, type Request, type Response, type NextFunction, type IRouter } from "express";
import { createReadStream } from "fs";
import {
  isValidYoutubeUrl,
  getVideoInfo,
  downloadToTemp,
  classifyAuthError,
} from "../lib/ytDownloader";

const UNAVAILABLE = "Video download is temporarily unavailable. Please try again later.";

const router: IRouter = Router();

// ── Auth: any valid session (admin / customer / seller) ───────────────────
function requireAnyAuth(req: Request, res: Response, next: NextFunction): void {
  const sess = (req as any).session;
  if (sess?.isAdmin || sess?.customerId || sess?.sellerId) {
    next();
    return;
  }
  res.status(401).json({ error: "Login required to use the downloader." });
}

// ── POST /yt-info — fetch video metadata + available formats ──────────────
router.post("/yt-info", requireAnyAuth, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body ?? {};

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "A YouTube URL is required." });
    return;
  }
  if (!isValidYoutubeUrl(url)) {
    res.status(400).json({ error: "Please provide a valid YouTube URL." });
    return;
  }

  try {
    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err: any) {
    const stderr: string = err.stderr ?? "";
    req.log?.error({ err, stderr: stderr.slice(0, 500) }, "yt-info error");

    if (err.code === "ENOENT") {
      res.status(503).json({ error: "yt-dlp is not installed on the server." });
      return;
    }
    if (err.killed || err.code === "ETIMEDOUT") {
      res.status(504).json({ error: "Request timed out. Try again in a moment." });
      return;
    }

    const authKind = classifyAuthError(stderr);
    if (authKind) {
      req.log?.warn({ authKind }, "yt-info: YouTube auth required");
      res.status(503).json({ error: UNAVAILABLE });
      return;
    }

    res.status(500).json({
      error: "Failed to fetch video info. The video may be private, unavailable, or region-locked.",
    });
  }
});

// ── GET /yt-download — download + stream file to browser ─────────────────
router.get("/yt-download", requireAnyAuth, async (req: Request, res: Response): Promise<void> => {
  const url  = req.query.url  as string | undefined;
  const itag = req.query.itag as string | undefined;
  const type = (req.query.type as string) === "audio" ? "audio" : "video";

  if (!url) {
    res.status(400).json({ error: "URL parameter is required." });
    return;
  }
  if (!isValidYoutubeUrl(url)) {
    res.status(400).json({ error: "Please provide a valid YouTube URL." });
    return;
  }

  let result: Awaited<ReturnType<typeof downloadToTemp>> | null = null;

  try {
    req.log?.info({ url, itag, type }, "yt-download started");
    result = await downloadToTemp(url, itag, type as "video" | "audio");

    const { filePath, ext, filesize, cleanup } = result;

    const contentType =
      type === "audio"
        ? ext === "mp3" ? "audio/mpeg" : ext === "webm" ? "audio/webm" : "audio/mp4"
        : "video/mp4";

    res.setHeader("Content-Disposition", `attachment; filename="download.${ext}"`);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", filesize.toString());
    res.setHeader("Cache-Control", "no-store");

    const stream = createReadStream(filePath);

    stream.on("error", (err) => {
      req.log?.error({ err }, "yt-download stream error");
      cleanup();
      if (!res.headersSent) res.status(500).end();
    });

    stream.on("close", () => cleanup());

    req.on("aborted", () => {
      stream.destroy();
      cleanup();
    });

    stream.pipe(res);
  } catch (err: any) {
    result?.cleanup();
    req.log?.error({ err }, "yt-download error");

    if (err.code === "ENOENT") {
      res.status(503).json({ error: "yt-dlp is not available on the server." });
      return;
    }
    if (err.killed || err.code === "ETIMEDOUT") {
      res.status(504).json({ error: "Download timed out. The video may be too large." });
      return;
    }

    const authKind = classifyAuthError(err.stderr ?? "");
    if (authKind) {
      req.log?.warn({ authKind }, "yt-download: YouTube auth required");
      res.status(503).json({ error: UNAVAILABLE });
      return;
    }

    res.status(500).json({ error: "Download failed. The video may be unavailable or region-locked." });
  }
});

export default router;
