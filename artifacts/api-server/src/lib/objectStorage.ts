import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";

import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import { db, settingsTable } from "@workspace/db";

const IMAGE_MAX_PX = 1920;
const IMAGE_QUALITY = 82;
const COMPRESSIBLE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
]);

async function compressImage(
  data: Buffer,
  contentType: string,
): Promise<{ data: Buffer; contentType: string }> {
  if (!COMPRESSIBLE_TYPES.has(contentType.toLowerCase())) {
    return { data, contentType };
  }
  try {
    const compressed = await sharp(data)
      .rotate()
      .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_QUALITY })
      .toBuffer();
    return { data: compressed, contentType: "image/webp" };
  } catch {
    return { data, contentType };
  }
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-|-$/g, "");
}

// ── Upload token map ─────────────────────────────────────────────────────────
// Maps UUID token → intended GCS path (bucket-relative, no /objects/ prefix).
// Populated by getObjectEntityUploadURL; consumed by saveGcsObject +
// normalizeObjectEntityPath. Tokens expire after 30 minutes.

export interface UploadContext {
  uploadType?:
    | "account-image"
    | "seller-cnic-front"
    | "seller-cnic-back"
    | "seller-selfie"
    | "logo";
  sellerId?: number;
  accountId?: number;
  accountSlug?: string;
}

const _uploadTokens = new Map<string, { gcsPath: string; expiresAt: number }>();

const _tokenPruner = setInterval(
  () => {
    const now = Date.now();
    for (const [k, v] of _uploadTokens) {
      if (v.expiresAt < now) _uploadTokens.delete(k);
    }
  },
  10 * 60 * 1000,
);
if (typeof (_tokenPruner as NodeJS.Timeout).unref === "function") {
  (_tokenPruner as NodeJS.Timeout).unref();
}

/**
 * Builds an organized, root-level GCS path based on upload context.
 * Paths have NO bucket/folder prefix — they are root-level in the bucket
 * so existing uploads (which use prefix-based paths) remain untouched.
 */
function buildOrganizedGcsPath(
  shortId: string,
  accountTitle: string | undefined,
  context: UploadContext,
): string {
  const { uploadType, sellerId, accountId, accountSlug } = context;

  switch (uploadType) {
    case "logo":
      return `logo/code-x-stocks-logo-${shortId}`;

    case "account-image": {
      // accountSlug is already a DB slug — use as-is (don't re-run through toSlug).
      // accountTitle is a raw human title that needs slugifying.
      const slug = accountSlug
        ? accountSlug.slice(0, 40).replace(/^-|-$/g, "")
        : accountTitle
          ? toSlug(accountTitle)
          : shortId;
      if (accountId) {
        return `accounts/account-${accountId}-${slug}/thumbnail-${shortId}`;
      }
      return `accounts/new-${slug}/thumbnail-${shortId}`;
    }

    case "seller-cnic-front":
      return sellerId
        ? `sellers/pending/seller-${sellerId}/cnic-front-${shortId}`
        : `sellers/pending/signup-${shortId}/cnic-front`;

    case "seller-cnic-back":
      return sellerId
        ? `sellers/pending/seller-${sellerId}/cnic-back-${shortId}`
        : `sellers/pending/signup-${shortId}/cnic-back`;

    case "seller-selfie":
      return sellerId
        ? `sellers/pending/seller-${sellerId}/selfie-${shortId}`
        : `sellers/pending/signup-${shortId}/selfie`;

    default:
      return `uploads/${shortId}`;
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class GcsNotConfiguredError extends Error {
  constructor() {
    super(
      "Google Cloud Storage is not configured. Go to Admin → Settings → File Storage to set it up.",
    );
    this.name = "GcsNotConfiguredError";
    Object.setPrototypeOf(this, GcsNotConfiguredError.prototype);
  }
}

async function getStorageSettings() {
  const [settings] = await db
    .select({
      storageProvider: settingsTable.storageProvider,
      gcsKeyJson: settingsTable.gcsKeyJson,
      gcsBucketPublicPath: settingsTable.gcsBucketPublicPath,
      gcsBucketPrivatePath: settingsTable.gcsBucketPrivatePath,
      gcsBucketName: settingsTable.gcsBucketName,
      gcsProjectId: settingsTable.gcsProjectId,
      gcsServiceAccountEmail: settingsTable.gcsServiceAccountEmail,
      gcsPrivateKey: settingsTable.gcsPrivateKey,
      gcsPublicBaseUrl: settingsTable.gcsPublicBaseUrl,
      gcsFolderPath: settingsTable.gcsFolderPath,
    })
    .from(settingsTable)
    .limit(1);
  return settings ?? null;
}

function buildGcsKeyJson(settings: {
  gcsKeyJson?: string | null;
  gcsProjectId?: string | null;
  gcsServiceAccountEmail?: string | null;
  gcsPrivateKey?: string | null;
}): string | null {
  if (settings.gcsKeyJson) return settings.gcsKeyJson;
  if (
    settings.gcsProjectId &&
    settings.gcsServiceAccountEmail &&
    settings.gcsPrivateKey
  ) {
    return JSON.stringify({
      type: "service_account",
      project_id: settings.gcsProjectId,
      private_key: settings.gcsPrivateKey.replace(/\\n/g, "\n"),
      client_email: settings.gcsServiceAccountEmail,
    });
  }
  return null;
}

function buildStorageClient(keyJson: string): Storage {
  const credentials = JSON.parse(keyJson);
  return new Storage({ credentials });
}

function getLocalUploadDir(): string {
  const dir =
    process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class ObjectStorageService {
  constructor() {}

  async isLocalStorage(): Promise<boolean> {
    const settings = await getStorageSettings();
    return (settings?.storageProvider ?? "local") === "local";
  }

  async getGcsSettings() {
    return getStorageSettings();
  }

  async getPublicObjectSearchPaths(): Promise<Array<string>> {
    const settings = await getStorageSettings();
    const pathsStr =
      settings?.gcsBucketPublicPath ||
      process.env.PUBLIC_OBJECT_SEARCH_PATHS ||
      "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0),
      ),
    ) as string[];
    if (paths.length === 0) throw new GcsNotConfiguredError();
    return paths;
  }

  /**
   * Returns the optional folder path prefix within the bucket.
   * Empty string when not configured — folder path is not required.
   * Never throws; callers that need it should validate themselves.
   */
  async getPrivateObjectDir(): Promise<string> {
    const settings = await getStorageSettings();
    return (
      settings?.gcsBucketPrivatePath || settings?.gcsFolderPath || ""
    );
  }

  async getStorageClient(): Promise<Storage> {
    const settings = await getStorageSettings();
    const keyJson = buildGcsKeyJson(settings ?? {});
    if (keyJson) {
      return buildStorageClient(keyJson);
    }
    throw new GcsNotConfiguredError();
  }

  async testGcsConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const settings = await getStorageSettings();
      const keyJson = buildGcsKeyJson(settings ?? {});
      if (!keyJson) return { ok: false, error: "GCS credentials not configured" };

      const client = buildStorageClient(keyJson);
      const bucketName = settings?.gcsBucketName || "";
      if (!bucketName) return { ok: false, error: "Bucket name not configured" };

      const bucket = client.bucket(bucketName);
      await bucket.getMetadata();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Connection failed" };
    }
  }

  /**
   * Configures CORS on the GCS bucket so browsers can PUT files directly
   * using presigned upload URLs. Without this, uploads fail with "Failed to fetch".
   */
  async configureBucketCors(): Promise<{ ok: boolean; error?: string }> {
    try {
      const settings = await getStorageSettings();
      const keyJson = buildGcsKeyJson(settings ?? {});
      if (!keyJson) return { ok: false, error: "GCS credentials not configured" };

      const client = buildStorageClient(keyJson);
      const bucketName = settings?.gcsBucketName || "";
      if (!bucketName) return { ok: false, error: "Bucket name not configured" };

      const bucket = client.bucket(bucketName);
      await bucket.setCorsConfiguration([
        {
          origin: ["*"],
          method: ["GET", "PUT", "HEAD", "OPTIONS", "POST", "DELETE"],
          responseHeader: [
            "Content-Type",
            "Content-MD5",
            "Authorization",
            "x-goog-resumable",
            "x-goog-meta-*",
          ],
          maxAgeSeconds: 3600,
        },
      ]);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to configure CORS" };
    }
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    const client = await this.getStorageClient();
    for (const searchPath of await this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = client.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  async downloadObject(
    file: File,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type":
        (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) headers["Content-Length"] = String(metadata.size);

    return new Response(webStream, { headers });
  }

  /**
   * Generates an upload URL for a new object.
   *
   * For local storage: returns a direct local upload URL.
   * For GCS: returns a PROXY upload URL (browser → our API → GCS).
   *
   * When context.uploadType is provided, registers a UUID token → organized
   * GCS path mapping so saveGcsObject + normalizeObjectEntityPath can use it.
   * Existing uploads without context continue to use the legacy slug/UUID path.
   */
  async getObjectEntityUploadURL(
    baseUrl: string,
    accountTitle?: string,
    context?: UploadContext,
  ): Promise<string> {
    const isLocal = await this.isLocalStorage();
    const uuid = randomUUID();
    const shortId = uuid.replace(/-/g, "").slice(0, 8);

    if (isLocal) {
      const slug = accountTitle ? toSlug(accountTitle) : "";
      const objectId = slug ? `${slug}-${shortId}` : uuid;
      return `${baseUrl}/api/storage/uploads/local/${objectId}`;
    }

    // GCS with organized path context: register token → gcsPath
    if (context?.uploadType) {
      const gcsPath = buildOrganizedGcsPath(shortId, accountTitle, context);
      _uploadTokens.set(uuid, {
        gcsPath,
        expiresAt: Date.now() + 30 * 60 * 1000,
      });
      return `${baseUrl}/api/storage/uploads/gcs/${uuid}`;
    }

    // Legacy: slug-based or raw UUID (no token registration)
    const slug = accountTitle ? toSlug(accountTitle) : "";
    const objectId = slug ? `${slug}-${shortId}` : uuid;
    return `${baseUrl}/api/storage/uploads/gcs/${objectId}`;
  }

  /**
   * Saves a file buffer to GCS. Called by the proxy upload endpoint.
   * Returns the permanent bucket-relative object path.
   */
  async saveGcsObject(
    objectId: string,
    data: Buffer,
    contentType: string,
  ): Promise<string> {
    const compressed = await compressImage(data, contentType);

    const client = await this.getStorageClient();
    const settings = await getStorageSettings();
    const bucketName = settings?.gcsBucketName || "";
    if (!bucketName) throw new GcsNotConfiguredError();

    // Organized path: consume token registered by getObjectEntityUploadURL
    let objectName: string;
    const tokenEntry = _uploadTokens.get(objectId);
    if (tokenEntry) {
      objectName = tokenEntry.gcsPath;
      _uploadTokens.delete(objectId);
    } else {
      // Legacy: folder prefix + uploads/{objectId}
      const folderPath =
        settings?.gcsFolderPath || settings?.gcsBucketPrivatePath || "";
      objectName = folderPath
        ? `${folderPath}/uploads/${objectId}`
        : `uploads/${objectId}`;
    }

    const bucket = client.bucket(bucketName);
    const file = bucket.file(objectName);
    await file.save(compressed.data, {
      contentType: compressed.contentType,
      resumable: false,
    });
    return `/objects/${objectName}`;
  }

  /**
   * Converts a raw upload URL/path into a permanent, stable object path
   * suitable for storage in the database.
   *
   * Bug B fix: previously, when the folder path was empty, getPrivateObjectDir()
   * threw GcsNotConfiguredError and the full signed URL was stored in the DB.
   * Signed URLs expire after ~15 min, breaking image retrieval.
   *
   * Now we parse the permanent path directly from the GCS signed URL's pathname,
   * stripping the leading /bucketName segment to get the bucket-relative path.
   * The result is always a stable /objects/... path — never a signed URL.
   *
   * Stored format:  /objects/uploads/{uuid}
   *              or /objects/{folder}/uploads/{uuid}
   */
  async normalizeObjectEntityPath(rawPath: string): Promise<string> {
    // Local storage: extract UUID from local upload URL
    if (rawPath.includes("/api/storage/uploads/local/")) {
      const uuid = rawPath.split("/api/storage/uploads/local/").pop()!;
      return `/objects/local/${uuid}`;
    }

    // GCS proxy upload URL → compute the permanent path.
    if (rawPath.includes("/api/storage/uploads/gcs/")) {
      const token = rawPath
        .split("/api/storage/uploads/gcs/")
        .pop()!
        .split("?")[0];

      // Organized path: token was registered by getObjectEntityUploadURL
      const tokenEntry = _uploadTokens.get(token);
      if (tokenEntry) {
        return `/objects/${tokenEntry.gcsPath}`;
      }

      // Legacy: derive path from folder settings
      const settings = await getStorageSettings();
      const folderPath =
        settings?.gcsFolderPath || settings?.gcsBucketPrivatePath || "";
      const objectName = folderPath
        ? `${folderPath}/uploads/${token}`
        : `uploads/${token}`;
      return `/objects/${objectName}`;
    }

    // Already normalized to a permanent /objects/... path
    if (rawPath.startsWith("/objects/")) return rawPath;

    // GCS signed URL (legacy) → extract permanent bucket-relative path.
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      try {
        const url = new URL(rawPath);
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2) {
          const bucketRelativePath = pathParts.slice(1).join("/");
          return `/objects/${bucketRelativePath}`;
        }
      } catch {
        // malformed URL — fall through
      }
    }

    // Fallback: return unchanged
    return rawPath;
  }

  /**
   * Resolves a stored /objects/... path to the actual GCS File object.
   *
   * Bug C fix: previously called getPrivateObjectDir() which threw when
   * no folder path was configured, breaking retrieval for objects uploaded
   * without a folder prefix.
   *
   * New approach: everything after /objects/ is the full bucket-relative
   * path. We only need the bucket name to resolve it — the folder prefix
   * is already embedded in the stored path when it was uploaded.
   *
   * Supports both:
   *   /objects/uploads/{uuid}          → bucket: uploads/{uuid}
   *   /objects/{folder}/uploads/{uuid} → bucket: {folder}/uploads/{uuid}
   */
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();

    // Everything after the leading "/objects/" is the bucket-relative path
    const bucketRelativePath = objectPath.slice("/objects/".length);
    if (!bucketRelativePath) throw new ObjectNotFoundError();

    const client = await this.getStorageClient();
    const settings = await getStorageSettings();
    const bucketName = settings?.gcsBucketName || "";
    if (!bucketName) throw new GcsNotConfiguredError();

    const bucket = client.bucket(bucketName);
    const objectFile = bucket.file(bucketRelativePath);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return objectFile;
  }

  async serveLocalObject(
    objectPath: string,
  ): Promise<{ filePath: string; contentType: string } | null> {
    if (!objectPath.startsWith("/objects/local/")) return null;
    const uuid = objectPath.replace("/objects/local/", "");
    const uploadDir = getLocalUploadDir();
    const files = fs.readdirSync(uploadDir);
    const match = files.find((f) => f === uuid || f.startsWith(uuid + "."));
    if (!match) return null;
    const filePath = path.join(uploadDir, match);
    const ext = path.extname(match).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";
    return { filePath, contentType };
  }

  async saveLocalObject(
    uuid: string,
    data: Buffer,
    contentType: string,
  ): Promise<void> {
    const compressed = await compressImage(data, contentType);
    const uploadDir = getLocalUploadDir();
    const extMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "application/pdf": ".pdf",
      "video/mp4": ".mp4",
    };
    const ext = extMap[compressed.contentType] || "";
    const fileName = uuid + ext;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, compressed.data);
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = await this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;
    if (normalizedPath.startsWith("/objects/local/")) return normalizedPath;

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

/**
 * Parses a GCS object path into { bucketName, objectName }.
 *
 * Accepted formats:
 *   gs://bucket/path/to/object
 *   /bucket/path/to/object
 *   bucket/path/to/object   ← note: must have at least one slash after bucket
 *
 * No leading slash is prepended here — callers pass clean paths.
 */
function parseObjectPath(input: string): {
  bucketName: string;
  objectName: string;
} {
  if (input.startsWith("gs://")) {
    const rest = input.slice(5);
    const slashIdx = rest.indexOf("/");
    if (slashIdx === -1) return { bucketName: rest, objectName: "" };
    return {
      bucketName: rest.slice(0, slashIdx),
      objectName: rest.slice(slashIdx + 1),
    };
  }

  // Normalise: strip any leading slash so split("/") always gives
  // ["bucket", "path", "to", "object"] with no empty first element.
  const normalised = input.startsWith("/") ? input.slice(1) : input;
  const parts = normalised.split("/");
  if (parts.length < 2 || !parts[0]) {
    throw new Error(
      `Invalid GCS path "${input}": must contain at least a non-empty bucket name and one path segment.`,
    );
  }
  return {
    bucketName: parts[0],
    objectName: parts.slice(1).join("/"),
  };
}

async function signObjectURL({
  client,
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  client: Storage;
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const bucket = client.bucket(bucketName);
  const file = bucket.file(objectName);
  const expires = Date.now() + ttlSec * 1000;
  const [url] = await file.getSignedUrl({
    action: method === "PUT" ? "write" : "read",
    expires,
  });
  return url;
}

export { getLocalUploadDir };
