import "server-only";
import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { EMPTY_PRICING, type PricingCatalog } from "@/services/pricing";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://api.quizsupport.com");
const PUBLIC_BACKEND_URL = "https://api.quizsupport.com";

function pricingUrls(path: string): string[] {
  const urls = new Set<string>();
  if (process.env.PRICING_API_URL) {
    urls.add(`${process.env.PRICING_API_URL.replace(/\/$/, "")}/api/v1${path}`);
  }
  urls.add(`${BACKEND_URL.replace(/\/$/, "")}/api/v1${path}`);
  urls.add(`${PUBLIC_BACKEND_URL}/api/v1${path}`);
  return [...urls];
}

async function fetchPricing(
  path: string,
  requestHeaders?: HeadersInit
): Promise<Response | null> {
  for (const url of pricingUrls(path)) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: requestHeaders,
      });
      if (response.ok) return response;
    } catch {
      // Try the next backend origin.
    }
  }
  return null;
}

function readCatalog(value: unknown): PricingCatalog {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as Partial<PricingCatalog>).plans) ||
    !Array.isArray((value as Partial<PricingCatalog>).creditPacks)
  ) {
    throw new Error("The pricing catalog returned an invalid response.");
  }
  return value as PricingCatalog;
}

export async function getPricingCatalogServer(): Promise<PricingCatalog> {
  try {
    const incomingHeaders = await headers();
    const forwardedHeaders = new Headers();
    const trustedGeoHeader = process.env.PRICING_FRONTEND_TRUSTED_GEO_HEADER
      ?.trim()
      .toLowerCase();
    const country =
      trustedGeoHeader === "cf-ipcountry" || trustedGeoHeader === "x-vercel-ip-country"
        ? incomingHeaders.get(trustedGeoHeader)?.trim().toUpperCase()
        : null;
    const sharedSecret = process.env.PRICING_GEO_SHARED_SECRET?.trim();
    if (country && /^[A-Z]{2}$/.test(country) && sharedSecret && sharedSecret.length >= 32) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createHmac("sha256", sharedSecret)
        .update(`${country}:${timestamp}`)
        .digest("hex");
      forwardedHeaders.set("x-pricing-country", country);
      forwardedHeaders.set("x-pricing-timestamp", timestamp);
      forwardedHeaders.set("x-pricing-signature", signature);
    }
    const sessionToken = (await cookies()).get("session_token")?.value;
    if (sessionToken) forwardedHeaders.set("authorization", `Bearer ${sessionToken}`);
    const response = await fetchPricing("/pricing", forwardedHeaders);
    if (!response) return EMPTY_PRICING;
    const payload = (await response.json()) as { data?: unknown };
    return readCatalog(payload.data);
  } catch {
    return EMPTY_PRICING;
  }
}

export async function getPricingContentServer(): Promise<Record<string, string>> {
  try {
    const response = await fetchPricing("/pricing/content");
    if (!response) return {};
    const payload = (await response.json()) as { data?: { content?: unknown } };
    const content = payload.data?.content;
    if (!content || typeof content !== "object") return {};
    return Object.fromEntries(
      Object.entries(content as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}
