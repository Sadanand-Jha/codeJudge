/**
 * Generate a random 16-character alphabetic quiz code (uppercase letters only)
 */
export function generateQuizCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/**
 * Validate quiz code format: exactly 16 uppercase letters
 */
export function isValidQuizCode(code: string): boolean {
  return /^[A-Z]{16}$/.test(code.toUpperCase());
}

/**
 * Normalize quiz code to uppercase
 */
export function normalizeQuizCode(code: string): string {
  return code.toUpperCase().trim();
}

/**
 * Format a quiz code with a hyphen after every 4 characters, e.g.
 * "VQBAMIDJETTWEFRT" → "VQBA-MIDJ-ETTW-EFRT"
 */
export function formatQuizCode(code: string): string {
  const raw = (code || "").replace(/[^a-z]/gi, "").toUpperCase();
  const groups = raw.match(/.{1,4}/g) ?? [];
  return groups.join("-");
}
