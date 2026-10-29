import { CryptoError } from "./errors";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const CHUNK_SIZE = 0x8000;

export function utf8Encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, bytes.length))
    );
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (typeof value !== "string" || value.length === 0) {
    throw new CryptoError("INVALID_ENVELOPE");
  }
  if (!BASE64URL_PATTERN.test(value)) {
    throw new CryptoError("INVALID_ENVELOPE");
  }
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new CryptoError("INVALID_ENVELOPE");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}
