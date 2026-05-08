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
    super("Google Cloud Storage is not configured. Go to Admin → Settings → File Storage to set it up.");
    this.name = "GcsNotConfiguredError";
    Object.setPrototypeOf(this, GcsNotConfiguredError.prototype);
  }
}

async function getStorageSettings() {
  const [settings] = await db.select({
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
  }).from(settingsTable).limit(1);
  return settings ?? null;
}

function buildGcsKeyJson(settings: {
  gcsKeyJson?: string | null;
  gcsProjectId?: string | null;
  gcsServiceAccountEmail?: string | null;
  gcsPrivateKey?: string | null;
}): string | null {
  if (settings.gcsKeyJson) return settings.gcsKeyJson;
  if (settings.gcsProjectId && settings.gcsServiceAccountEmail && settings.gcsPrivateKey) {
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
  const dir = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), "uploads");
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
    const pathsStr = settings?.gcsBucketPublicPath || process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0)
      )
    ) as string[];
    if (paths.length === 0) throw new GcsNotConfiguredError();
    return paths;
  }

  async getPrivateObjectDir(): Promise<string> {
    const settings = await getStorageSettings();
    const dir = settings?.gcsBucketPrivatePath || settings?.gcsFolderPath || process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) throw new GcsNotConfiguredError();
    return dir;
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

  async downloadObject(file: File, cacheTtlSec: number = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) headers["Content-Length"] = String(metadata.size);

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(baseUrl: string): Promise<string> {
    const isLocal = await this.isLocalStorage();
    if (isLocal) {
      const objectId = randomUUID();
      return `${baseUrl}/api/storage/uploads/local/${objectId}`;
    }

    const client = await this.getStorageClient();
    const settings = await getStorageSettings();
    const folderPath = settings?.gcsFolderPath || settings?.gcsBucketPrivatePath || "";
    const bucketName = settings?.gcsBucketName || "";
    const objectId = randomUUID();
    const fullPath = folderPath
      ? `${bucketName}/${folderPath}/uploads/${objectId}`
      : `/${bucketName}/uploads/${objectId}`;
    const { bucketName: bn, objectName } = parseObjectPath(`/${fullPath}`);

    return signObjectURL({ client, bucketName: bn, objectName, method: "PUT", ttlSec: 900 });
  }

  async normalizeObjectEntityPath(rawPath: string): Promise<string> {
    if (rawPath.includes("/api/storage/uploads/local/")) {
      const uuid = rawPath.split("/api/storage/uploads/local/").pop()!;
      return `/objects/local/${uuid}`;
    }
    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;

    const privateObjectDir = await this.getPrivateObjectDir().catch(() => "");
    if (!privateObjectDir) return rawPath;

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = privateObjectDir;
    if (!objectEntityDir.endsWith("/")) objectEntityDir = `${objectEntityDir}/`;

    if (!rawObjectPath.startsWith(objectEntityDir)) return rawObjectPath;

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();

    const client = await this.getStorageClient();
    const entityId = parts.slice(1).join("/");
    let entityDir = await this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;

    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = client.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return objectFile;
  }

  async serveLocalObject(objectPath: string): Promise<{ filePath: string; contentType: string } | null> {
    if (!objectPath.startsWith("/objects/local/")) return null;
    const uuid = objectPath.replace("/objects/local/", "");
    const uploadDir = getLocalUploadDir();
    const files = fs.readdirSync(uploadDir);
    const match = files.find((f) => f === uuid || f.startsWith(uuid + "."));
    if (!match) return null;
    const filePath = path.join(uploadDir, match);
    const ext = path.extname(match).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
      ".pdf": "application/pdf", ".mp4": "video/mp4",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";
    return { filePath, contentType };
  }

  async saveLocalObject(uuid: string, data: Buffer, contentType: string): Promise<void> {
    const uploadDir = getLocalUploadDir();
    const extMap: Record<string, string> = {
      "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif",
      "image/webp": ".webp", "image/svg+xml": ".svg", "application/pdf": ".pdf",
      "video/mp4": ".mp4",
    };
    const ext = extMap[contentType] || "";
    const fileName = uuid + ext;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, data);
  }

  async trySetObjectEntityAclPolicy(rawPath: string, aclPolicy: ObjectAclPolicy): Promise<string> {
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

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (path.startsWith("gs://")) {
    path = path.slice(5);
    const slashIdx = path.indexOf("/");
    if (slashIdx === -1) return { bucketName: path, objectName: "" };
    return { bucketName: path.slice(0, slashIdx), objectName: path.slice(slashIdx + 1) };
  }
  if (!path.startsWith("/")) path = `/${path}`;
  const pathParts = path.split("/");
  if (pathParts.length < 3) throw new Error("Invalid path: must contain at least a bucket name");
  return { bucketName: pathParts[1], objectName: pathParts.slice(2).join("/") };
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
  const [url] = await file.getSignedUrl({ action: method === "PUT" ? "write" : "read", expires });
  return url;
}

export { getLocalUploadDir };
