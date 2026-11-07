import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Request } from "express";
import { isRazorpayConfigured } from "../config/razorpay.ts";
import * as countryPricingRepository from "../repositories/countryPricing.repository.ts";

type CountrySignal = "subscription" | "payment" | "ip" | "mobile" | "fallback";

export interface CountryPricingSelection {
  countryCode: string | null;
  countryName: string;
  currency: string;
  amount: number;
  amountMinor: number;
  minorUnitExponent: number;
  version: number;
  configId: number;
  isFallback: boolean;
  checkoutAvailable: boolean;
  source: CountrySignal;
}

function currencyExponent(currency: string): number {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

function normalizeCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const country = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) && !["XX", "T1", "A1"].includes(country)
    ? country
    : null;
}

function normalizeIp(value: string): string {
  const ip = value.trim().toLowerCase();
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function trustedProxyAddresses(): Set<string> {
  return new Set(
    (process.env.GEO_TRUSTED_PROXY_IPS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => isIP(normalizeIp(value)) !== 0)
      .map(normalizeIp)
  );
}

function firstHeader(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export function countryFromTrustedProxyHeaders(input: {
  peerAddress: string | null;
  cloudflareCountry?: unknown;
  vercelCountry?: unknown;
  trustedProxyIps?: Set<string>;
}): string | null {
  const peer = input.peerAddress;
  const trusted = input.trustedProxyIps ?? trustedProxyAddresses();
  if (!peer || !trusted.has(normalizeIp(peer))) return null;
  return normalizeCountry(
    input.cloudflareCountry ?? input.vercelCountry
  );
}

export function verifySignedFrontendCountry(input: {
  countryValue: unknown;
  timestampValue: unknown;
  signatureValue: unknown;
  secret: string;
  nowSeconds?: number;
}): string | null {
  const secret = input.secret.trim();
  const country = normalizeCountry(input.countryValue);
  const timestampText =
    typeof input.timestampValue === "string" ? input.timestampValue : null;
  const signature =
    typeof input.signatureValue === "string" ? input.signatureValue : null;
  if (
    secret.length < 32 ||
    !country ||
    !timestampText ||
    !signature ||
    !/^\d{10}$/.test(timestampText)
  ) {
    return null;
  }
  const timestamp = Number(timestampText);
  if (
    !Number.isSafeInteger(timestamp) ||
    Math.abs((input.nowSeconds ?? Date.now() / 1000) - timestamp) > 300
  ) {
    return null;
  }
  const expected = createHmac("sha256", secret)
    .update(`${country}:${timestampText}`)
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return null;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected)
    ? country
    : null;
}

function countryFromSignedFrontend(request: Request): string | null {
  return verifySignedFrontendCountry({
    countryValue: firstHeader(request.headers["x-pricing-country"]),
    timestampValue: firstHeader(request.headers["x-pricing-timestamp"]),
    signatureValue: firstHeader(request.headers["x-pricing-signature"]),
    secret: process.env.PRICING_GEO_SHARED_SECRET ?? "",
  });
}

function countryFromTrustedProxy(request: Request): string | null {
  return countryFromTrustedProxyHeaders({
    peerAddress: request.socket.remoteAddress ?? null,
    cloudflareCountry: firstHeader(request.headers["cf-ipcountry"]),
    vercelCountry: firstHeader(request.headers["x-vercel-ip-country"]),
  });
}

export function countryFromMobile(mobile: string | null): string | null {
  if (!mobile) return null;
  const normalized = mobile.replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) return null;
  const callingCodes: Array<[string, string]> = [
    ["33", "FR"],
    ["44", "GB"],
    ["49", "DE"],
    ["52", "MX"],
    ["55", "BR"],
    ["61", "AU"],
    ["62", "ID"],
    ["63", "PH"],
    ["65", "SG"],
    ["91", "IN"],
    ["92", "PK"],
    ["971", "AE"],
    ["880", "BD"],
    ["977", "NP"],
    ["27", "ZA"],
    ["41", "CH"],
    ["43", "AT"],
    ["32", "BE"],
    ["34", "ES"],
    ["39", "IT"],
    ["81", "JP"],
    ["82", "KR"],
    ["86", "CN"],
    ["64", "NZ"],
  ];
  const digits = normalized.slice(1);
  const match = callingCodes
    .sort((a, b) => b[0].length - a[0].length)
    .find(([callingCode]) => digits.startsWith(callingCode));
  return match?.[1] ?? null;
}

export function choosePricingCountry(input: {
  billingCountry?: string | null;
  ipCountry?: string | null;
  mobileCountry?: string | null;
}): { countryCode: string | null; source: CountrySignal } {
  const billingCountry = normalizeCountry(input.billingCountry);
  if (billingCountry) return { countryCode: billingCountry, source: "subscription" };
  const ipCountry = normalizeCountry(input.ipCountry);
  if (ipCountry) return { countryCode: ipCountry, source: "ip" };
  const mobileCountry = normalizeCountry(input.mobileCountry);
  if (mobileCountry) return { countryCode: mobileCountry, source: "mobile" };
  return { countryCode: null, source: "fallback" };
}

function displayCountry(countryCode: string | null): string {
  if (!countryCode) return "Other countries";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ??
      countryCode;
  } catch {
    return countryCode;
  }
}

function supportedRazorpayCurrencies(): Set<string> {
  const configured = (process.env.RAZORPAY_SUPPORTED_CURRENCIES ?? "INR")
    .split(",")
    .map((currency) => currency.trim().toUpperCase())
    .filter((currency) => /^[A-Z]{3}$/.test(currency));
  return new Set(configured);
}

export function isRazorpayCurrencySupported(currency: string): boolean {
  return isRazorpayConfigured() &&
    supportedRazorpayCurrencies().has(currency.toUpperCase());
}

export async function resolveCountryPricing(
  userId: string | null,
  request?: Request
): Promise<CountryPricingSelection> {
  const billing = userId
    ? await countryPricingRepository.findVerifiedBillingPrice(userId)
    : null;
  if (billing) {
    return {
      countryCode: billing.countryCode,
      countryName: displayCountry(billing.countryCode),
      currency: billing.currency,
      amount: billing.amountMinor / 10 ** billing.minorUnitExponent,
      amountMinor: billing.amountMinor,
      minorUnitExponent: billing.minorUnitExponent,
      version: billing.version,
      configId: billing.id,
      isFallback: false,
      checkoutAvailable: isRazorpayCurrencySupported(billing.currency),
      source: billing.source,
    };
  }

  const ipCountry =
    (request ? countryFromTrustedProxy(request) : null) ??
    (request ? countryFromSignedFrontend(request) : null);
  const mobileCountry = !ipCountry && userId
    ? countryFromMobile(await countryPricingRepository.findUserMobile(userId))
    : null;
  const detected = choosePricingCountry({ ipCountry, mobileCountry });
  const detectedCountry = detected.countryCode;
  const detectedSource = detected.source;
  const regionalPrice = detectedCountry
    ? await countryPricingRepository.findCurrentPrice(detectedCountry)
    : null;
  const price = regionalPrice ?? await countryPricingRepository.findFallbackPrice();
  if (!price) {
    throw new Error("No active country pricing fallback is configured.");
  }
  return {
    countryCode: detectedCountry,
    countryName: displayCountry(detectedCountry),
    currency: price.currency,
    amount: price.amountMajor,
    amountMinor: price.amountMinor,
    minorUnitExponent: price.minorUnitExponent,
    version: price.version,
    configId: price.id,
    isFallback: price.isFallback || !regionalPrice,
    checkoutAvailable: isRazorpayCurrencySupported(price.currency),
    source: detectedSource,
  };
}

export function getCurrencyMinorUnitExponent(currency: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new RangeError("Invalid ISO currency code.");
  }
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function getRazorpaySupportedCurrencies(): string[] {
  return [...supportedRazorpayCurrencies()].sort();
}

export const countryPricingAdminRepository = countryPricingRepository;
