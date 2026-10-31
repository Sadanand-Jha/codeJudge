/**
 * Native `fetch` requests authenticate with the httpOnly `session_token`
 * cookie (see `apiClient` in `src/lib/axios.ts`). No Authorization header or
 * JS-readable token is ever attached here.
 */
export function getAuthHeaders(): Record<string, string> {
  return {};
}
