import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import { db, settingsTable } from "@workspace/db";

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
   * Generates a presigned upload URL for a new object.
   *
   * For GCS: the signed URL is temporary (15 min TTL) and used only for
   * the browser-to-GCS PUT request. The permanent path stored in the DB
   * is returned separately via normalizeObjectEntityPath().
   *
   * Bug A fix: removed the leading slash that caused an empty bucket name
   * when folderPath was empty. Path is now constructed without a leading
   * slash and parsed correctly in all cases.
   */
  async getObjectEntityUploadURL(baseUrl: string): Promise<string> {
    const isLocal = await this.isLocalStorage();
    if (isLocal) {
      const objectId = randomUUID();
      return `${baseUrl}/api/storage/uploads/local/${objectId}`;
    }

    const client = await this.getStorageClient();
    const settings = await getStorageSettings();
    const folderPath =
      settings?.gcsFolderPath || settings?.gcsBucketPrivatePath || "";
    const bucketName = settings?.gcsBucketName || "";
    if (!bucketName) throw new GcsNotConfiguredError();

    const objectId = randomUUID();

    // Build the bucket-relative object name — no leading slash, no doubles.
    // folderPath is optional; when absent the object goes to uploads/ directly.
    const objectName = folderPath
      ? `${folderPath}/uploads/${objectId}`
      : `uploads/${objectId}`;

    return signObjectURL({
      client,
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
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

    // Already normalized to a permanent /objects/... path
    if (rawPath.startsWith("/objects/")) return rawPath;

    // GCS signed URL → extract permanent bucket-relative path.
    // Signed URL pathname: /bucketName/path/to/object
    // We want:             /objects/path/to/object
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      try {
        const url = new URL(rawPath);
        // pathname starts with /bucketName/...
        const pathParts = url.pathname.split("/").filter(Boolean);
        // pathParts[0] = bucketName, pathParts[1..] = object path segments
        if (pathParts.length >= 2) {
          const bucketRelativePath = pathParts.slice(1).join("/");
          return `/objects/${bucketRelativePath}`;
        }
      } catch {
        // malformed URL — fall through and return as-is
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
    const ext = extMap[contentType] || "";
    const fileName = uuid + ext;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, data);
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
