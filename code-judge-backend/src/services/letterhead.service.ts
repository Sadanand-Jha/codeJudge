import type { PoolClient } from "pg";
import pool from "../config/database.ts";
import {
  cloudinary,
  getCloudinaryCredentials,
} from "../config/cloudinary.ts";
import { getEntitlements } from "./entitlement.service.ts";
import {
  type HeaderConfig,
  normalizeHeaderConfig,
  sanitizeLetterheadName,
} from "../utils/letterheadConfig.ts";

export type LetterheadFormat = "pdf" | "png" | "jpg" | "jpeg";

export const CUSTOM_HEADER_PLAN_SLUGS = new Set(["pro", "institute"]);
export const LETTERHEAD_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_LETTERHEADS = 10;
const ALLOWED_FORMATS: LetterheadFormat[] = ["pdf", "png", "jpg", "jpeg"];
const ALLOWED_FORMAT_STRING = ALLOWED_FORMATS.join(",");

export class LetterheadError extends Error {
  statusCode: number;
  code: string;
  upgradeUrl?: string;

  constructor(statusCode: number, code: string, message: string, upgradeUrl?: string) {
    super(message);
    this.name = "LetterheadError";
    this.statusCode = statusCode;
    this.code = code;
    this.upgradeUrl = upgradeUrl;
  }
}

export interface LetterheadRow {
  id: number;
  user_id: number;
  name: string;
  cloudinary_public_id: string;
  cloudinary_version: string | number;
  original_format: LetterheadFormat;
  width: number;
  height: number;
  bytes: string | number;
  secure_url: string;
  png_url: string;
  header_config: HeaderConfig | string;
  is_default: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LetterheadDTO {
  id: number;
  name: string;
  cloudinary: {
    publicId: string;
    version: number;
    originalFormat: LetterheadFormat;
    width: number;
    height: number;
    bytes: number;
    secureUrl: string;
    pngUrl: string;
  };
  headerConfig: HeaderConfig;
  isDefault: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadSignatureParams {
  timestamp: number;
  folder: string;
  allowed_formats: string;
  tags: string;
  overwrite: string;
}

export function letterheadFolder(userId: number | string): string {
  return `letterheads/${Number(userId)}`;
}

export function buildSignatureParams(
  userId: number | string,
  now: Date = new Date()
): UploadSignatureParams {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new LetterheadError(400, "INVALID_USER", "A valid user is required.");
  }
  return {
    timestamp: Math.round(now.getTime() / 1000),
    folder: letterheadFolder(id),
    allowed_formats: ALLOWED_FORMAT_STRING,
    tags: `letterhead,user_${id}`,
    overwrite: "false",
  };
}

export function signUploadParams(
  params: UploadSignatureParams,
  apiSecret: string
): string {
  return cloudinary.utils.api_sign_request(
    params as unknown as Record<string, string | number>,
    apiSecret
  );
}

export function buildUploadSignature(userId: number | string) {
  const credentials = getCloudinaryCredentials();
  const params = buildSignatureParams(userId);
  return {
    ...params,
    signature: signUploadParams(params, credentials.apiSecret),
    apiKey: credentials.apiKey,
    cloudName: credentials.cloudName,
  };
}

export function isOwnedPublicId(publicId: unknown, userId: number | string): boolean {
  if (typeof publicId !== "string") return false;
  const value = publicId.trim();
  if (!value || value.length > 300) return false;
  if (value.includes("..") || /[?#]/.test(value)) return false;
  return value.startsWith(`${letterheadFolder(userId)}/`);
}

export function isCustomHeaderPlan(isPaid: boolean, planSlug: string | null | undefined): boolean {
  return Boolean(isPaid && planSlug && CUSTOM_HEADER_PLAN_SLUGS.has(planSlug));
}

export async function canUseCustomHeader(userId: number | string): Promise<boolean> {
  const entitlements = await getEntitlements(userId);
  return isCustomHeaderPlan(entitlements.isPaid, entitlements.planSlug);
}

export async function requireCustomHeaderAccess(userId: number | string): Promise<void> {
  if (await canUseCustomHeader(userId)) return;
  throw new LetterheadError(
    403,
    "PLAN_UPGRADE_REQUIRED",
    "Custom letterheads are available on the Pro plan.",
    "/pricing"
  );
}

function getMaxLetterheads(): number {
  const configured = Number(process.env.LETTERHEAD_MAX_PER_USER);
  if (Number.isInteger(configured) && configured > 0) return configured;
  return DEFAULT_MAX_LETTERHEADS;
}

function parseHeaderConfig(row: LetterheadRow): HeaderConfig {
  const raw =
    typeof row.header_config === "string"
      ? (JSON.parse(row.header_config) as Partial<HeaderConfig>)
      : row.header_config;
  return normalizeHeaderConfig(raw, Number(row.width), Number(row.height));
}

export function serializeLetterhead(row: LetterheadRow, locked: boolean): LetterheadDTO {
  return {
    id: Number(row.id),
    name: row.name,
    cloudinary: {
      publicId: row.cloudinary_public_id,
      version: Number(row.cloudinary_version),
      originalFormat: row.original_format,
      width: Number(row.width),
      height: Number(row.height),
      bytes: Number(row.bytes),
      secureUrl: row.secure_url,
      pngUrl: row.png_url,
    },
    headerConfig: parseHeaderConfig(row),
    isDefault: Boolean(row.is_default),
    locked,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getLetterheadUsage(userId: number | string) {
  const result = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM letterhead_templates WHERE user_id = $1",
    [Number(userId)]
  );
  const count = Number(result.rows[0]?.count ?? 0);
  const max = getMaxLetterheads();
  return { count, max, remaining: Math.max(0, max - count) };
}

export async function assertCanCreateLetterhead(userId: number | string): Promise<void> {
  const usage = await getLetterheadUsage(userId);
  if (usage.count >= usage.max) {
    throw new LetterheadError(
      409,
      "LETTERHEAD_LIMIT_REACHED",
      `You can save up to ${usage.max} letterheads. Delete one to add another.`
    );
  }
}

export async function listLetterheads(
  userId: number | string,
  options?: { locked?: boolean }
): Promise<LetterheadDTO[]> {
  const result = await pool.query<LetterheadRow>(
    `SELECT * FROM letterhead_templates
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [Number(userId)]
  );
  return result.rows.map((row) => serializeLetterhead(row, Boolean(options?.locked)));
}

export async function getLetterhead(
  userId: number | string,
  id: number
): Promise<LetterheadDTO | null> {
  const result = await pool.query<LetterheadRow>(
    "SELECT * FROM letterhead_templates WHERE id = $1 AND user_id = $2",
    [id, Number(userId)]
  );
  return result.rows[0] ? serializeLetterhead(result.rows[0], false) : null;
}

function verifyUploadSignature(publicId: string, version: number, signature: string): boolean {
  const utils = cloudinary.utils as unknown as {
    verify_api_response_signature?: (
      publicId: string,
      version: number | string,
      signature: string
    ) => boolean;
  };
  if (typeof utils.verify_api_response_signature !== "function") {
    throw new LetterheadError(
      500,
      "CLOUDINARY_VERIFY_UNAVAILABLE",
      "Upload verification is unavailable right now."
    );
  }
  return utils.verify_api_response_signature(publicId, version, signature);
}

interface CloudinaryResource {
  public_id?: string;
  version?: number | string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  secure_url?: string;
}

function deriveAssetUrls(publicId: string, format: LetterheadFormat) {
  const secureUrl = cloudinary.url(publicId, {
    resource_type: "image",
    type: "upload",
    secure: true,
  });
  const pngUrl =
    format === "pdf"
      ? cloudinary.url(publicId, {
          resource_type: "image",
          type: "upload",
          secure: true,
          format: "png",
          page: 1,
          width: 1600,
          crop: "limit",
        })
      : secureUrl;
  return { secureUrl, pngUrl };
}

export interface CreateLetterheadInput {
  name: unknown;
  publicId: unknown;
  version: unknown;
  signature: unknown;
  headerConfig?: Partial<HeaderConfig> | null;
}

export async function createLetterhead(
  userId: number | string,
  input: CreateLetterheadInput
): Promise<LetterheadDTO> {
  getCloudinaryCredentials();
  const id = Number(userId);
  const publicId = typeof input.publicId === "string" ? input.publicId.trim() : "";
  const version = Number(input.version);
  const signature = typeof input.signature === "string" ? input.signature.trim() : "";
  const name = sanitizeLetterheadName(input.name);

  if (!isOwnedPublicId(publicId, id)) {
    throw new LetterheadError(
      400,
      "INVALID_PUBLIC_ID",
      "That upload does not belong to your account."
    );
  }
  if (!Number.isInteger(version) || version <= 0) {
    throw new LetterheadError(400, "INVALID_VERSION", "The upload version is invalid.");
  }
  if (!signature) {
    throw new LetterheadError(400, "MISSING_SIGNATURE", "The upload could not be verified.");
  }

  const resource = (await cloudinary.api.resource(publicId, {
    resource_type: "image",
  })) as CloudinaryResource;

  if (String(resource.public_id ?? "") !== publicId) {
    throw new LetterheadError(400, "UPLOAD_NOT_FOUND", "The uploaded file could not be found.");
  }
  if (!verifyUploadSignature(publicId, version, signature)) {
    throw new LetterheadError(400, "INVALID_SIGNATURE", "The upload signature is invalid.");
  }

  const format = String(resource.format ?? "").toLowerCase() as LetterheadFormat;
  if (!ALLOWED_FORMATS.includes(format)) {
    throw new LetterheadError(400, "UNSUPPORTED_FORMAT", "Upload a PDF, PNG or JPG file.");
  }
  const width = Number(resource.width);
  const height = Number(resource.height);
  const bytes = Number(resource.bytes);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new LetterheadError(400, "INVALID_IMAGE", "The uploaded file could not be read.");
  }
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > LETTERHEAD_MAX_BYTES) {
    throw new LetterheadError(400, "FILE_TOO_LARGE", "Letterheads must be 10 MB or smaller.");
  }

  const headerConfig = normalizeHeaderConfig(input.headerConfig, width, height);
  const { secureUrl, pngUrl } = deriveAssetUrls(publicId, format);

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`letterheads:${id}`]);
    const usage = await client.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM letterhead_templates WHERE user_id = $1",
      [id]
    );
    const count = Number(usage.rows[0]?.count ?? 0);
    const max = getMaxLetterheads();
    if (count >= max) {
      throw new LetterheadError(
        409,
        "LETTERHEAD_LIMIT_REACHED",
        `You can save up to ${max} letterheads. Delete one to add another.`
      );
    }

    const insert = await client.query<LetterheadRow>(
      `INSERT INTO letterhead_templates (
         user_id, name, cloudinary_public_id, cloudinary_version, original_format,
         width, height, bytes, secure_url, png_url, header_config, is_default
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
       RETURNING *`,
      [
        id,
        name,
        publicId,
        version,
        format,
        width,
        height,
        bytes,
        secureUrl,
        pngUrl,
        JSON.stringify(headerConfig),
        count === 0,
      ]
    );
    await client.query("COMMIT");
    return serializeLetterhead(insert.rows[0], false);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if ((error as { code?: string }).code === "23505") {
      throw new LetterheadError(409, "DUPLICATE_LETTERHEAD", "That header is already saved.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export interface UpdateLetterheadInput {
  name?: unknown;
  headerConfig?: Partial<HeaderConfig> | null;
  isDefault?: unknown;
}

export async function updateLetterhead(
  userId: number | string,
  letterheadId: number,
  input: UpdateLetterheadInput
): Promise<LetterheadDTO> {
  const id = Number(userId);
  const existing = await pool.query<LetterheadRow>(
    "SELECT * FROM letterhead_templates WHERE id = $1 AND user_id = $2",
    [letterheadId, id]
  );
  const row = existing.rows[0];
  if (!row) throw new LetterheadError(404, "NOT_FOUND", "Letterhead not found.");

  const hasName = input.name !== undefined;
  const hasConfig = input.headerConfig !== undefined && input.headerConfig !== null;
  const hasDefault = input.isDefault !== undefined;
  if (!hasName && !hasConfig && !hasDefault) {
    throw new LetterheadError(400, "NOTHING_TO_UPDATE", "No changes were provided.");
  }

  const name = hasName ? sanitizeLetterheadName(input.name) : row.name;
  const config = hasConfig
    ? normalizeHeaderConfig(
        { ...parseHeaderConfig(row), ...input.headerConfig },
        Number(row.width),
        Number(row.height)
      )
    : parseHeaderConfig(row);
  const isDefault = hasDefault ? Boolean(input.isDefault) : Boolean(row.is_default);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (isDefault) {
      await client.query(
        "UPDATE letterhead_templates SET is_default = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND id <> $2 AND is_default",
        [id, letterheadId]
      );
    }
    const updated = await client.query<LetterheadRow>(
      `UPDATE letterhead_templates
       SET name = $3, header_config = $4::jsonb, is_default = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [letterheadId, id, name, JSON.stringify(config), isDefault]
    );
    await client.query("COMMIT");
    return serializeLetterhead(updated.rows[0], false);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteLetterhead(
  userId: number | string,
  letterheadId: number
): Promise<{ deletedId: number; newDefaultId: number | null }> {
  getCloudinaryCredentials();
  const id = Number(userId);
  const found = await pool.query<LetterheadRow>(
    "SELECT * FROM letterhead_templates WHERE id = $1 AND user_id = $2",
    [letterheadId, id]
  );
  const row = found.rows[0];
  if (!row) throw new LetterheadError(404, "NOT_FOUND", "Letterhead not found.");

  let destroyResult: string;
  try {
    const result = (await cloudinary.uploader.destroy(row.cloudinary_public_id, {
      resource_type: "image",
      invalidate: true,
    })) as { result?: string };
    destroyResult = String(result.result ?? "");
  } catch (error) {
    console.error("Cloudinary letterhead delete failed:", error);
    throw new LetterheadError(
      502,
      "DELETE_FAILED",
      "The header file could not be deleted. Please try again."
    );
  }
  if (destroyResult !== "ok" && destroyResult !== "not found") {
    throw new LetterheadError(
      502,
      "DELETE_FAILED",
      "The header file could not be deleted. Please try again."
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query<{ is_default: boolean }>(
      "DELETE FROM letterhead_templates WHERE id = $1 AND user_id = $2 RETURNING is_default",
      [letterheadId, id]
    );
    let newDefaultId: number | null = null;
    if (deleted.rows[0]?.is_default) {
      const promoted = await client.query<{ id: number }>(
        `UPDATE letterhead_templates
         SET is_default = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT id FROM letterhead_templates
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 1
         )
         RETURNING id`,
        [id]
      );
      newDefaultId = promoted.rows[0]?.id ?? null;
    }
    await client.query("COMMIT");
    return { deletedId: letterheadId, newDefaultId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
