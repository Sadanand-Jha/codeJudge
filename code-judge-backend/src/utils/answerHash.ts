import crypto from "node:crypto";

export function normalizeAnswerText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashAnswerText(value: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeAnswerText(value), "utf8")
    .digest("hex");
}
