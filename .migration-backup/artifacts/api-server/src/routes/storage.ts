import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import fs from "fs";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError, GcsNotConfiguredError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function getBaseUrl(req: Request): string {
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDevDomain) return `https://${replitDevDomain}`;
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) return backendUrl;
  return `${req.protocol}://${req.get("host")}`;
}

/**
 * POST /storage/uploads/request-url
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;
    const baseUrl = getBaseUrl(req);

    const uploadURL = await objectStorageService.getObjectEntityUploadURL(baseUrl);
    const objectPath = await objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    if (error instanceof GcsNotConfiguredError) {
      res.status(503).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * PUT /storage/uploads/local/:uuid
 *
 * Accept raw file body for local storage mode.
 */
router.put("/storage/uploads/local/:uuid", express_raw_middleware, async (req: Request, res: Response) => {
  try {
    const uuid = req.params.uuid as string;
    if (!uuid || !/^[0-9a-f-]{36}$/i.test(uuid)) {
      res.status(400).json({ error: "Invalid upload token" });
      return;
    }
    const contentType = (req.headers["content-type"] as string) || "application/octet-stream";
    const data = req.body as Buffer;
    if (!Buffer.isBuffer(data)) {
      res.status(400).json({ error: "No file data received" });
      return;
    }
    await objectStorageService.saveLocalObject(uuid, data, contentType);
    res.status(200).json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Error saving local upload");
    res.status(500).json({ error: "Failed to save file" });
  }
});

/**
 * POST /storage/test-connection
 */
router.post("/storage/test-connection", async (req: Request, res: Response) => {
  try {
    const isLocal = await objectStorageService.isLocalStorage();
    if (isLocal) {
      res.json({ ok: true, message: "Local storage is active and ready." });
      return;
    }
    const result = await objectStorageService.testGcsConnection();
    if (result.ok) {
      res.json({ ok: true, message: "Google Cloud Storage connection successful." });
    } else {
      res.status(400).json({ ok: false, error: result.error || "Connection failed" });
    }
  } catch (error: any) {
    req.log.error({ err: error }, "Error testing storage connection");
    res.status(500).json({ ok: false, error: error?.message || "Connection test failed" });
  }
});

/**
 * GET /storage/public-objects/*
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    // Local storage path
    if (objectPath.startsWith("/objects/local/")) {
      const localObj = await objectStorageService.serveLocalObject(objectPath);
      if (!localObj) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      res.setHeader("Content-Type", localObj.contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      const stream = fs.createReadStream(localObj.filePath);
      stream.pipe(res);
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    if (error instanceof GcsNotConfiguredError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

function express_raw_middleware(req: Request, res: Response, next: () => void) {
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    (req as any).body = Buffer.concat(chunks);
    next();
  });
  req.on("error", (err) => {
    res.status(500).json({ error: "Failed to read request body" });
  });
}

export default router;
