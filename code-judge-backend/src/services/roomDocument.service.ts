// Room documents service. Creators upload files directly to Cloudinary using a
// short-lived signature; only verified, room-owned assets are saved to
// Postgres. Students can list and download files only while they are members
// of the room.
import pool from "../config/database.ts";
import {
  cloudinary,
  getCloudinaryCredentials,
} from "../config/cloudinary.ts";
import { RoomRepository } from "../repositories/room.repository.ts";

export const ROOM_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

export const ROOM_DOCUMENT_FORMATS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "csv",
  "png",
  "jpg",
  "jpeg",
] as const;

const ALLOWED_FORMATS = new Set<string>(ROOM_DOCUMENT_FORMATS);
const ALLOWED_FORMAT_STRING = ROOM_DOCUMENT_FORMATS.join(",");

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const roomRepo = new RoomRepository();

export class RoomDocumentError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "RoomDocumentError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface RoomDocumentRow {
  id: number;
  room_id: number;
  uploaded_by: number;
  name: string;
  format: string;
  mime_type: string;
  bytes: string | number;
  cloudinary_public_id: string;
  cloudinary_version: string | number;
  secure_url: string;
  created_at: Date | string;
  uploader_username?: string | null;
  uploader_display_name?: string | null;
}

export interface RoomDocumentDTO {
  id: string;
  roomId: string;
  name: string;
  format: string;
  type: string;
  mimeType: string;
  bytes: number;
  addedAt: string;
  uploadedBy: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
}

export interface RoomDocumentUploadSignatureParams {
  timestamp: number;
  folder: string;
  allowed_formats: string;
  tags: string;
  overwrite: string;
  use_filename: string;
  unique_filename: string;
}

export function roomDocumentFolder(roomId: number | string): string {
  const id = Number(roomId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new RoomDocumentError(400, "INVALID_ROOM", "Invalid room id.");
  }
  return `room-documents/${id}`;
}

function positiveRoomId(roomId: unknown): number {
  const id = Number(roomId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new RoomDocumentError(400, "INVALID_ROOM", "Invalid room id.");
  }
  return id;
}

function positiveDocumentId(documentId: unknown): number {
  const id = Number(documentId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new RoomDocumentError(400, "INVALID_DOCUMENT", "Invalid document id.");
  }
  return id;
}

function isOwnedRoomPublicId(publicId: unknown, roomId: number | string): boolean {
  if (typeof publicId !== "string") return false;
  const value = publicId.trim();
  if (!value || value.length > 300) return false;
  if (value.includes("..") || /[?#]/.test(value)) return false;
  return value.startsWith(`${roomDocumentFolder(roomId)}/`);
}

export function buildSignatureParams(
  roomId: number | string,
  now: Date = new Date()
): RoomDocumentUploadSignatureParams {
  const folder = roomDocumentFolder(roomId);
  const id = Number(roomId);
  return {
    timestamp: Math.round(now.getTime() / 1000),
    folder,
    allowed_formats: ALLOWED_FORMAT_STRING,
    tags: `room_document,room_${id}`,
    overwrite: "false",
    use_filename: "true",
    unique_filename: "true",
  };
}

export function signUploadParams(
  params: RoomDocumentUploadSignatureParams,
  apiSecret: string
): string {
  return cloudinary.utils.api_sign_request(
    params as unknown as Record<string, string | number>,
    apiSecret
  );
}

async function assertRoomOwner(roomId: number, userId: string) {
  const room = await roomRepo.getRoomById(String(roomId), String(userId));
  if (!room) {
    throw new RoomDocumentError(404, "ROOM_NOT_FOUND", "Room not found.");
  }
  return room;
}

async function assertRoomMember(roomId: number, userId: string) {
  const room = await roomRepo.getRoomForMember(String(roomId), String(userId));
  if (!room) {
    throw new RoomDocumentError(404, "ROOM_NOT_FOUND", "Room not found.");
  }
  return room;
}

export async function buildRoomDocumentUploadSignature(
  roomIdInput: string | number,
  userId: string
) {
  const roomId = positiveRoomId(roomIdInput);
  await assertRoomOwner(roomId, userId);
  const credentials = getCloudinaryCredentials();
  const params = buildSignatureParams(roomId);
  return {
    ...params,
    signature: signUploadParams(params, credentials.apiSecret),
    apiKey: credentials.apiKey,
    cloudName: credentials.cloudName,
  };
}

function serializeDocument(row: RoomDocumentRow): RoomDocumentDTO {
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    name: row.name,
    format: row.format,
    type: row.format.toUpperCase(),
    mimeType: row.mime_type,
    bytes: Number(row.bytes),
    addedAt: new Date(row.created_at).toISOString(),
    uploadedBy: {
      id: String(row.uploaded_by),
      username: row.uploader_username ?? null,
      displayName: row.uploader_display_name ?? null,
    },
  };
}

export async function listRoomDocuments(
  roomIdInput: string | number,
  userId: string
): Promise<RoomDocumentDTO[]> {
  const roomId = positiveRoomId(roomIdInput);
  await assertRoomMember(roomId, userId);
  const result = await pool.query<RoomDocumentRow>(
    `SELECT rd.*, u.username AS uploader_username, u.display_name AS uploader_display_name
     FROM room_documents rd
     JOIN users u ON u.id = rd.uploaded_by
     WHERE rd.room_id = $1
     ORDER BY rd.created_at DESC, rd.id DESC`,
    [roomId]
  );
  return result.rows.map(serializeDocument);
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
    throw new RoomDocumentError(
      500,
      "CLOUDINARY_VERIFY_UNAVAILABLE",
      "Upload verification is unavailable right now."
    );
  }
  return utils.verify_api_response_signature(publicId, version, signature);
}

interface CloudinaryRawResource {
  public_id?: string;
  version?: number | string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  secure_url?: string;
  original_filename?: string;
}

function sanitizeDocumentName(value: string): string {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 255);
  return cleaned || "document";
}

function extensionOf(value: unknown): string {
  if (typeof value !== "string") return "";
  const path = value.split(/[?#]/)[0];
  const file = path.split("/").pop() ?? "";
  const dot = file.lastIndexOf(".");
  if (dot <= 0 || dot === file.length - 1) return "";
  return file.slice(dot + 1).toLowerCase();
}

function displayNameFor(
  inputName: unknown,
  resource: CloudinaryRawResource,
  publicId: string,
  format: string
): string {
  let candidate = typeof inputName === "string" ? inputName.trim() : "";
  if (!candidate && typeof resource.original_filename === "string") {
    candidate = resource.original_filename.trim();
  }
  if (!candidate) {
    candidate = publicId.split("/").pop() || "document";
  }
  candidate = sanitizeDocumentName(candidate);
  if (candidate.toLowerCase().endsWith(`.${format}`)) return candidate;
  return sanitizeDocumentName(`${candidate}.${format}`);
}

export interface CreateRoomDocumentInput {
  publicId: unknown;
  version: unknown;
  signature: unknown;
  originalFilename?: unknown;
}

export async function createRoomDocument(
  roomIdInput: string | number,
  userId: string,
  input: CreateRoomDocumentInput
): Promise<RoomDocumentDTO> {
  getCloudinaryCredentials();
  const roomId = positiveRoomId(roomIdInput);
  await assertRoomOwner(roomId, userId);

  const publicId = typeof input.publicId === "string" ? input.publicId.trim() : "";
  const version = Number(input.version);
  const signature = typeof input.signature === "string" ? input.signature.trim() : "";

  if (!isOwnedRoomPublicId(publicId, roomId)) {
    throw new RoomDocumentError(
      400,
      "INVALID_PUBLIC_ID",
      "That upload does not belong to this room."
    );
  }
  if (!Number.isInteger(version) || version <= 0) {
    throw new RoomDocumentError(400, "INVALID_VERSION", "The upload version is invalid.");
  }
  if (!signature) {
    throw new RoomDocumentError(400, "MISSING_SIGNATURE", "The upload could not be verified.");
  }

  let resource: CloudinaryRawResource;
  try {
    resource = (await cloudinary.api.resource(publicId, {
      resource_type: "raw",
    })) as CloudinaryRawResource;
  } catch (error) {
    console.error("Cloudinary room document lookup failed:", error);
    throw new RoomDocumentError(
      400,
      "UPLOAD_NOT_FOUND",
      "The uploaded file could not be found."
    );
  }

  if (String(resource.public_id ?? "") !== publicId) {
    throw new RoomDocumentError(400, "UPLOAD_NOT_FOUND", "The uploaded file could not be found.");
  }
  if (!verifyUploadSignature(publicId, version, signature)) {
    throw new RoomDocumentError(400, "INVALID_SIGNATURE", "The upload signature is invalid.");
  }

  const format = (
    String(resource.format ?? "").toLowerCase() ||
    extensionOf(input.originalFilename) ||
    extensionOf(publicId)
  ).toLowerCase();
  if (!ALLOWED_FORMATS.has(format)) {
    throw new RoomDocumentError(
      400,
      "UNSUPPORTED_FORMAT",
      "Upload a PDF, Office document, text file or image."
    );
  }

  const bytes = Number(resource.bytes);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw new RoomDocumentError(400, "INVALID_FILE", "The uploaded file could not be read.");
  }
  if (bytes > ROOM_DOCUMENT_MAX_BYTES) {
    throw new RoomDocumentError(400, "FILE_TOO_LARGE", "Documents must be 25 MB or smaller.");
  }

  const secureUrl =
    String(resource.secure_url ?? "").trim() ||
    cloudinary.url(publicId, {
      resource_type: "raw",
      type: "upload",
      secure: true,
      format,
    });
  try {
    const parsed = new URL(secureUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
      throw new Error("unexpected host");
    }
  } catch {
    throw new RoomDocumentError(400, "INVALID_UPLOAD", "The uploaded file URL is invalid.");
  }

  const name = displayNameFor(input.originalFilename, resource, publicId, format);
  const mimeType = MIME_TYPES[format] ?? "application/octet-stream";

  try {
    const inserted = await pool.query<RoomDocumentRow>(
      `INSERT INTO room_documents (
         room_id, uploaded_by, name, format, mime_type, bytes,
         cloudinary_public_id, cloudinary_version, secure_url
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [roomId, Number(userId), name, format, mimeType, bytes, publicId, version, secureUrl]
    );
    return serializeDocument(inserted.rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new RoomDocumentError(
        409,
        "DUPLICATE_DOCUMENT",
        "That document is already shared in this room."
      );
    }
    throw error;
  }
}

export async function deleteRoomDocument(
  roomIdInput: string | number,
  documentIdInput: string | number,
  userId: string
): Promise<{ deletedId: string }> {
  getCloudinaryCredentials();
  const roomId = positiveRoomId(roomIdInput);
  const documentId = positiveDocumentId(documentIdInput);
  await assertRoomOwner(roomId, userId);

  const found = await pool.query<RoomDocumentRow>(
    "SELECT * FROM room_documents WHERE id = $1 AND room_id = $2",
    [documentId, roomId]
  );
  const row = found.rows[0];
  if (!row) {
    throw new RoomDocumentError(404, "NOT_FOUND", "Document not found.");
  }

  let destroyResult: string;
  try {
    const result = (await cloudinary.uploader.destroy(row.cloudinary_public_id, {
      resource_type: "raw",
      invalidate: true,
    })) as { result?: string };
    destroyResult = String(result.result ?? "");
  } catch (error) {
    console.error("Cloudinary room document delete failed:", error);
    throw new RoomDocumentError(
      502,
      "DELETE_FAILED",
      "The document could not be deleted. Please try again."
    );
  }
  if (destroyResult !== "ok" && destroyResult !== "not found") {
    throw new RoomDocumentError(
      502,
      "DELETE_FAILED",
      "The document could not be deleted. Please try again."
    );
  }

  await pool.query("DELETE FROM room_documents WHERE id = $1 AND room_id = $2", [
    documentId,
    roomId,
  ]);
  return { deletedId: String(documentId) };
}

export interface RoomDocumentDownload {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export async function downloadRoomDocument(
  roomIdInput: string | number,
  documentIdInput: string | number,
  userId: string
): Promise<RoomDocumentDownload> {
  const roomId = positiveRoomId(roomIdInput);
  const documentId = positiveDocumentId(documentIdInput);
  await assertRoomMember(roomId, userId);

  const found = await pool.query<RoomDocumentRow>(
    "SELECT * FROM room_documents WHERE id = $1 AND room_id = $2",
    [documentId, roomId]
  );
  const row = found.rows[0];
  if (!row) {
    throw new RoomDocumentError(404, "NOT_FOUND", "Document not found.");
  }

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(row.secure_url, {
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error("Cloudinary room document download failed:", error);
    throw new RoomDocumentError(
      502,
      "DOWNLOAD_FAILED",
      "The document could not be downloaded. Please try again."
    );
  }
  if (!upstream.ok) {
    throw new RoomDocumentError(
      502,
      "DOWNLOAD_FAILED",
      "The document could not be downloaded. Please try again."
    );
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.length === 0 || buffer.length > ROOM_DOCUMENT_MAX_BYTES * 2) {
    throw new RoomDocumentError(
      502,
      "DOWNLOAD_FAILED",
      "The document could not be downloaded. Please try again."
    );
  }

  return {
    buffer,
    filename: row.name,
    contentType: row.mime_type || "application/octet-stream",
  };
}
