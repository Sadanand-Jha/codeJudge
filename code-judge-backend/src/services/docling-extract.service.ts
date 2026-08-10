import { Docling } from "docling-sdk";
import type { DoclingAPIClient } from "docling-sdk";

/**
 * Thin wrapper around Docling Serve for document → text extraction.
 *
 * Docling runs as a separate service (Docling Serve) — point it at the service
 * via env `DOCLING_URL` (default `http://localhost:5001`). All calls are wrapped
 * in a short connect-timeout check so the backend stays healthy when Docling is
 * not running; callers then fall back to simpler extraction or a clear error.
 */

const DOCLING_URL = process.env.DOCLING_URL || "http://localhost:5001";
const DOCLING_TIMEOUT_MS = Number(process.env.DOCLING_TIMEOUT_MS || 60_000);

let cachedClient: DoclingAPIClient | null = null;
let lastHealthCheck = 0;
let healthy = false;
const HEALTH_CHECK_TTL_MS = 30_000;

const getClient = (): DoclingAPIClient => {
  if (!cachedClient) {
    console.log(DOCLING_URL, DOCLING_TIMEOUT_MS);
    cachedClient = new Docling({
      api: {
        baseUrl: DOCLING_URL,
        timeout: DOCLING_TIMEOUT_MS,
        retries: 1,
      },
    });
  }
  return cachedClient;
};

/**
 * Cheap, memoized liveness check against Docling Serve. Cached for a short TTL
 * so we don't hammer an unavailable service on every request.
 */
export const isDoclingAvailable = async (): Promise<boolean> => {
  const now = Date.now();
  // Return cached status if within TTL
  if (now - lastHealthCheck < HEALTH_CHECK_TTL_MS) return healthy;

  // Update timestamp immediately to prevent concurrent redundant checks
  lastHealthCheck = now; 
  let timeoutId: NodeJS.Timeout;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Docling health check timed out")), 2000);
    });
    
    const client = getClient();
    console.log("Checking Docling Serve health...", client);
    await Promise.race([client.health(), timeout]);
    healthy = true;
  } catch (error) {
    console.warn("Docling Serve unavailable:", (error as Error).message);
    healthy = false;
  } finally {
    // Always clean up the timer to prevent memory leaks
    if (timeoutId!) clearTimeout(timeoutId);
  }
  
  return healthy;
};

/**
 * Extract markdown/text content from a document (PDF, PPTX, DOCX, images, ...)
 * using Docling Serve. Throws if Docling cannot process the file.
 */
export const extractTextWithDocling = async (
  buffer: Uint8Array,
  filename: string
): Promise<string> => {
  const result = await getClient().convert(buffer, filename, {
    to_formats: ["md"],
  });

  const content = result.document?.md_content || result.document?.text_content;
  if (!content || !content.trim()) {
    throw new Error(`Docling returned no content for ${filename}`);
  }
  return content.trim();
};

export const getDoclingUrl = (): string => DOCLING_URL;