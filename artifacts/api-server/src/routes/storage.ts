import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { Readable } from "stream";
import fs from "fs";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError, GcsNotConfiguredError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// ─── Constants ────────────────────────────────────────────────────────────────

/** 10 MB hard cap for all proxy uploads */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for uploads */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/bmp",
  "video/mp4",
  "application/pdf",
]);

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Allows: admin | approved seller | logged-in customer.
 * Blocks anonymous visitors from generating upload URLs or uploading files.
 */
function requireUploadAuth(req: Request, res: Response, next: NextFunction): void {
  const session = (req as any).session;
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const isAdmin = !!session.isAdmin;
  const isApprovedSeller =
    !!session.sellerId && session.sellerStatus === "approved";
  const isCustomer = !!session.customerId;

  if (isAdmin || isApprovedSeller || isCustomer) {
    next();
    return;
  }
  res.status(401).json({ error: "Authentication required to upload files" });
}

/**
 * Admin-only guard for sensitive storage management endpoints.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getBaseUrl(req: Request): string {
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDevDomain) return `https://${replitDevDomain}`;
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) return backendUrl;
  return `${req.protocol}://${req.get("host")}`;
}

function validateMimeType(contentType: string): boolean {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return ALLOWED_MIME_TYPES.has(base);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /storage/uploads/request-url
 *
 * Generates an upload URL for a new object.
 * Requires: admin | approved seller | logged-in customer.
 */
router.post(
  "/storage/uploads/request-url",
  requireUploadAuth,
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    const { contentType } = parsed.data;
    if (contentType && !validateMimeType(contentType)) {
      res.status(400).json({ error: "File type not allowed" });
      return;
    }

    try {
      const { name, size, accountTitle } = parsed.data;

      if (size !== undefined && size > MAX_UPLOAD_BYTES) {
        res.status(400).json({ error: "File exceeds the 10 MB size limit" });
        return;
      }

      const baseUrl = getBaseUrl(req);
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(baseUrl, accountTitle);
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
  },
);

/**
 * PUT /storage/uploads/gcs/:uuid
 *
 * Proxy upload for GCS: browser sends the raw file here, we upload to GCS
 * server-side using the storage client (no signed URLs, no CORS issues).
 * Requires: admin | approved seller | logged-in customer.
 */
router.put(
  "/storage/uploads/gcs/:uuid",
  requireUploadAuth,
  express_raw_middleware,
  async (req: Request, res: Response) => {
    try {
      const uuid = req.params.uuid as string;
      if (!uuid || !/^[a-z0-9]([a-z0-9-]{0,80}[a-z0-9])?$/i.test(uuid)) {
        res.status(400).json({ error: "Invalid upload token" });
        return;
      }

      const rawContentType =
        (req.headers["content-type"] as string) || "application/octet-stream";
      if (!validateMimeType(rawContentType)) {
        res.status(400).json({ error: "File type not allowed" });
        return;
      }

      const data = req.body as Buffer;
      if (!Buffer.isBuffer(data) || data.length === 0) {
        res.status(400).json({ error: "No file data received" });
        return;
      }
      if (data.length > MAX_UPLOAD_BYTES) {
        res.status(400).json({ error: "File exceeds the 10 MB size limit" });
        return;
      }

      const objectPath = await objectStorageService.saveGcsObject(
        uuid,
        data,
        rawContentType,
      );
      res.status(200).json({ ok: true, objectPath });
    } catch (error) {
      req.log.error({ err: error }, "Error in GCS proxy upload");
      res.status(500).json({ error: "Failed to upload file to GCS" });
    }
  },
);

/**
 * PUT /storage/uploads/local/:uuid
 *
 * Accept raw file body for local storage mode.
 * Requires: admin | approved seller | logged-in customer.
 */
router.put(
  "/storage/uploads/local/:uuid",
  requireUploadAuth,
  express_raw_middleware,
  async (req: Request, res: Response) => {
    try {
      const uuid = req.params.uuid as string;
      if (!uuid || !/^[a-z0-9]([a-z0-9-]{0,80}[a-z0-9])?$/i.test(uuid)) {
        res.status(400).json({ error: "Invalid upload token" });
        return;
      }

      const rawContentType =
        (req.headers["content-type"] as string) || "application/octet-stream";
      if (!validateMimeType(rawContentType)) {
        res.status(400).json({ error: "File type not allowed" });
        return;
      }

      const data = req.body as Buffer;
      if (!Buffer.isBuffer(data)) {
        res.status(400).json({ error: "No file data received" });
        return;
      }
      if (data.length > MAX_UPLOAD_BYTES) {
        res.status(400).json({ error: "File exceeds the 10 MB size limit" });
        return;
      }

      await objectStorageService.saveLocalObject(uuid, data, rawContentType);
      res.status(200).json({ ok: true });
    } catch (error) {
      req.log.error({ err: error }, "Error saving local upload");
      res.status(500).json({ error: "Failed to save file" });
    }
  },
);

/**
 * POST /storage/test-connection
 * Admin only — tests GCS connectivity.
 */
router.post(
  "/storage/test-connection",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const isLocal = await objectStorageService.isLocalStorage();
      if (isLocal) {
        res.json({ ok: true, message: "Local storage is active and ready." });
        return;
      }
      const result = await objectStorageService.testGcsConnection();
      if (result.ok) {
        await objectStorageService.configureBucketCors().catch(() => {});
        res.json({ ok: true, message: "Google Cloud Storage connection successful." });
      } else {
        res.status(400).json({ ok: false, error: result.error || "Connection failed" });
      }
    } catch (error: any) {
      req.log.error({ err: error }, "Error testing storage connection");
      res.status(500).json({ ok: false, error: error?.message || "Connection test failed" });
    }
  },
);

/**
 * POST /storage/configure-cors
 * Admin only — configures CORS on the GCS bucket.
 */
router.post(
  "/storage/configure-cors",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const isLocal = await objectStorageService.isLocalStorage();
      if (isLocal) {
        res.json({ ok: true, message: "Local storage does not need CORS configuration." });
        return;
      }
      const result = await objectStorageService.configureBucketCors();
      if (result.ok) {
        res.json({ ok: true, message: "CORS configured successfully. Image uploads should now work." });
      } else {
        res.status(400).json({ ok: false, error: result.error || "Failed to configure CORS" });
      }
    } catch (error: any) {
      req.log.error({ err: error }, "Error configuring CORS");
      res.status(500).json({ ok: false, error: error?.message || "CORS configuration failed" });
    }
  },
);

/**
 * GET /storage/public-objects/<anything>
 * Uses a regex route for Express 5 / path-to-regexp v8 compatibility.
 */
router.get(/^\/storage\/public-objects\/(.+)$/, async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0] as string;
    if (!filePath) {
      res.status(400).json({ error: "File path required" });
      return;
    }
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
 * GET /storage/objects/<anything>
 *
 * Serves a stored object by its path.
 * If the object has an ACL policy with visibility "private", only admins
 * may access it (protects seller verification documents — CNIC, selfie).
 * Objects without an ACL policy (account images) are served freely.
 *
 * Uses a regex route for Express 5 / path-to-regexp v8 compatibility.
 */
router.get(/^\/storage\/objects\/(.+)$/, async (req: Request, res: Response) => {
  try {
    const wildcardPath = req.params[0] as string;
    if (!wildcardPath) {
      res.status(400).json({ error: "Object path required" });
      return;
    }
    const objectPath = `/objects/${wildcardPath}`;

    // Local storage — serve directly (no ACL concept for local files)
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

    // ACL check: if the object is explicitly marked private, require admin.
    // Objects without an ACL policy are served freely (public marketplace images).
    const { getObjectAclPolicy } = await import("../lib/objectAcl");
    const aclPolicy = await getObjectAclPolicy(objectFile);
    if (aclPolicy && aclPolicy.visibility === "private") {
      const session = (req as any).session;
      if (!session?.isAdmin) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    }

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
  let totalSize = 0;
  req.on("data", (chunk: Buffer) => {
    totalSize += chunk.length;
    if (totalSize > MAX_UPLOAD_BYTES) {
      res.status(400).json({ error: "File exceeds the 10 MB size limit" });
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => {
    (req as any).body = Buffer.concat(chunks);
    next();
  });
  req.on("error", (_err) => {
    res.status(500).json({ error: "Failed to read request body" });
  });
}

export default router;
