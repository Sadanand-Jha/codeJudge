/**
 * Generate a random 16-character alphanumeric quiz code (uppercase)
 */
export function generateQuizCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/**
 * Validate quiz code format: exactly 16 uppercase alphanumeric characters
 */
export function isValidQuizCode(code: string): boolean {
  return /^[A-Z0-9]{16}$/.test(code.toUpperCase());
}

/**
 * Normalize quiz code to uppercase
 */
export function normalizeQuizCode(code: string): string {
  return code.toUpperCase().trim();
}

/**
 * Format a quiz code with a hyphen after every 4 characters, e.g.
 * "VQBAMIDJE777EF6T" → "VQBA-MIDJ-E777-EF6T"
 */
export function formatQuizCode(code: string): string {
  const raw = (code || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  const groups = raw.match(/.{1,4}/g) ?? [];
  return groups.join("-");
}