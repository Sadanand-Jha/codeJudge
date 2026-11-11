import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { isRazorpayConfigured } from "../config/razorpay.ts";
import * as countryPricingRepository from "../repositories/countryPricing.repository.ts";
import type { CountryPriceRow } from "../repositories/countryPricing.repository.ts";
import { isTrustedPeer } from "../utils/trustedProxy.ts";

// "locked" = price taken from the subscriber's saved billing currency.
// "dev_override" = ?country= query, only outside production.
type CountrySignal = "ip" | "mobile" | "default" | "fallback" | "dev_override" | "locked";

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

function firstHeader(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * True for any deployment that must never accept ?country=. NODE_ENV is the
 * primary switch; the Vercel checks are a second guard in case NODE_ENV is unset.
 */
export function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.VERCEL === "1"
  );
}

/**
 * Dev-only ?country= override. Returns null in production regardless of input,
 * so the query parameter is simply ignored there.
 */
export function countryFromDevOverride(
  request: Pick<Request, "query"> | undefined,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  if (!request || isProductionRuntime(env)) return null;
  const raw = request.query?.country;
  return normalizeCountry(typeof raw === "string" ? raw : null);
}

export function countryFromTrustedProxyHeaders(input: {
  peerAddress: string | null;
  cloudflareCountry?: unknown;
  vercelCountry?: unknown;
  isTrustedPeer?: (peerAddress: string) => boolean;
}): string | null {
  const peer = input.peerAddress;
  const trusted = input.isTrustedPeer ?? isTrustedPeer;
  if (!peer || !trusted(peer)) return null;
  return normalizeCountry(
    input.cloudflareCountry ?? input.vercelCountry
  );
}

export interface CardCountrySignal {
  country?: string | null;
  international?: boolean | null;
}

export interface CardCountryMismatch {
  reason: "card_country" | "international_card";
  cardCountry: string | null;
}

/**
 * Compares the card's issuing country (from the Razorpay payment entity) with
 * the country used to price the order. Returns null when there is no card
 * (UPI, netbanking, wallet) or no basis for comparison (unknown pricing country).
 * Callers log and flag only; this never rejects a payment.
 */
export function cardCountryMismatch(
  pricingCountry: string | null,
  card: CardCountrySignal | null | undefined
): CardCountryMismatch | null {
  if (!card || !pricingCountry) return null;
  const cardCountry = normalizeCountry(card.country ?? null);
  if (cardCountry) {
    return cardCountry === pricingCountry
      ? null
      : { reason: "card_country", cardCountry };
  }
  // Razorpay does not guarantee an ISO country on the card entity. An
  // international card for an INR-priced order is still worth flagging.
  if (pricingCountry === "IN" && card.international === true) {
    return { reason: "international_card", cardCountry: null };
  }
  return null;
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
  ipCountry?: string | null;
  mobileCountry?: string | null;
}): { countryCode: string | null; source: CountrySignal } {
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

function selectionFromPrice(
  price: CountryPriceRow,
  countryCode: string | null,
  source: CountrySignal,
  isFallback: boolean
): CountryPricingSelection {
  return {
    countryCode,
    countryName: displayCountry(countryCode),
    currency: price.currency,
    amount: price.amountMajor,
    amountMinor: price.amountMinor,
    minorUnitExponent: price.minorUnitExponent,
    version: price.version,
    configId: price.id,
    isFallback,
    checkoutAvailable: isRazorpayCurrencySupported(price.currency),
    source,
  };
}

export async function resolveCountryPricing(
  userId: string | null,
  request?: Request
): Promise<CountryPricingSelection> {
  // Saved-currency lock: a subscriber who has paid before keeps the currency of
  // their last subscription (billing_currency), regardless of travel or VPN.
  // The lock wins over the dev override so the behavior can be tested locally.
  if (userId) {
    const lock = await countryPricingRepository.findBillingCurrencyLock(userId);
    if (lock) {
      const locked = await countryPricingRepository.findCurrentPriceByCurrency(
        lock.currency,
        lock.country
      );
      if (locked) {
        return selectionFromPrice(locked, locked.countryCode, "locked", locked.isFallback);
      }
      // The locked currency has no active price row (for example, it was disabled
      // in /platform). Fall through to detection and log, rather than failing checkout.
      console.warn("Country pricing: locked currency has no active price", {
        currency: lock.currency,
        country: lock.country,
      });
    }
  }

  const devOverride = countryFromDevOverride(request);
  const ipCountry =
    (request ? countryFromTrustedProxy(request) : null) ??
    (request ? countryFromSignedFrontend(request) : null);
  const mobileCountry = !ipCountry && !devOverride && userId
    ? countryFromMobile(await countryPricingRepository.findUserMobile(userId))
    : null;
  const detected = devOverride
    ? { countryCode: devOverride, source: "dev_override" as CountrySignal }
    : choosePricingCountry({ ipCountry, mobileCountry });
  const defaultCountry = detected.countryCode
    ? null
    : normalizeCountry(process.env.PRICING_DEFAULT_COUNTRY);
  const detectedCountry = detected.countryCode ?? defaultCountry;
  const detectedSource = detected.countryCode
    ? detected.source
    : defaultCountry
      ? "default"
      : detected.source;
  const regionalPrice = detectedCountry
    ? await countryPricingRepository.findCurrentPrice(detectedCountry)
    : null;
  const price = regionalPrice ?? await countryPricingRepository.findFallbackPrice();
  if (!price) {
    throw new Error("No active country pricing fallback is configured.");
  }
  return selectionFromPrice(
    price,
    detectedCountry,
    detectedSource,
    price.isFallback || !regionalPrice
  );
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
