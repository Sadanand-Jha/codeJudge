import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { Request } from "express";
import {
  cardCountryMismatch,
  choosePricingCountry,
  countryFromDevOverride,
  countryFromMobile,
  countryFromTrustedProxyHeaders,
  getCurrencyMinorUnitExponent,
  verifySignedFrontendCountry,
} from "../services/countryPricing.service.ts";
import { isTrustedPeer } from "../utils/trustedProxy.ts";

assert.deepEqual(
  choosePricingCountry({ ipCountry: "US", mobileCountry: "IN" }),
  { countryCode: "US", source: "ip" }
);
assert.deepEqual(
  choosePricingCountry({ mobileCountry: "NP" }),
  { countryCode: "NP", source: "mobile" }
);
assert.deepEqual(
  choosePricingCountry({ ipCountry: "XX", mobileCountry: "not-a-country" }),
  { countryCode: null, source: "fallback" }
);

assert.equal(countryFromMobile("+91 98765 43210"), "IN");
assert.equal(countryFromMobile("+44 20 1234 5678"), "GB");
assert.equal(countryFromMobile("+1 416 555 0100"), null);
assert.equal(countryFromMobile("9876543210"), null);

const trustedProxyIps = new Set(["10.0.0.5"]);
assert.equal(
  countryFromTrustedProxyHeaders({
    peerAddress: "10.0.0.5",
    cloudflareCountry: "IN",
    isTrustedPeer: (peer) => trustedProxyIps.has(peer),
  }),
  "IN"
);
assert.equal(
  countryFromTrustedProxyHeaders({
    peerAddress: "192.0.2.10",
    cloudflareCountry: "US",
    isTrustedPeer: (peer) => trustedProxyIps.has(peer),
  }),
  null
);
assert.equal(
  countryFromTrustedProxyHeaders({
    peerAddress: "10.0.0.5",
    cloudflareCountry: "XX",
    vercelCountry: "GB",
    isTrustedPeer: (peer) => trustedProxyIps.has(peer),
  }),
  null
);

// CIDR trust via GEO_TRUSTED_PROXY_IPS (exact IPs and ranges, IPv4 and IPv6).
process.env.GEO_TRUSTED_PROXY_IPS = "10.0.0.5, 173.245.48.0/20, 2400:cb00::/32, not-an-ip";
assert.equal(isTrustedPeer("173.245.50.9"), true);
assert.equal(isTrustedPeer("173.245.64.1"), false);
assert.equal(isTrustedPeer("::ffff:10.0.0.5"), true);
assert.equal(isTrustedPeer("2400:cb00:1::1"), true);
assert.equal(isTrustedPeer("2400:cb01::1"), false);
assert.equal(isTrustedPeer(null), false);
process.env.GEO_TRUSTED_PROXY_IPS = "";
assert.equal(isTrustedPeer("10.0.0.5"), false);

// Dev-only ?country= override: honored outside production, ignored in production.
const queryCountry = { query: { country: "in" } } as unknown as Request;
assert.equal(countryFromDevOverride(queryCountry, { NODE_ENV: "development" }), "IN");
assert.equal(countryFromDevOverride(queryCountry, { NODE_ENV: "test" }), "IN");
assert.equal(countryFromDevOverride(queryCountry, { NODE_ENV: "production" }), null);
assert.equal(countryFromDevOverride(queryCountry, { NODE_ENV: "development", VERCEL: "1" }), null);
assert.equal(countryFromDevOverride(queryCountry, { NODE_ENV: "development", VERCEL_ENV: "production" }), null);
assert.equal(
  countryFromDevOverride({ query: { country: "XX" } } as unknown as Request, { NODE_ENV: "development" }),
  null
);
assert.equal(countryFromDevOverride(undefined, { NODE_ENV: "development" }), null);

// Card-country mismatch: flag only, never a hard reject.
assert.equal(cardCountryMismatch("IN", { country: "IN" }), null);
assert.deepEqual(cardCountryMismatch("IN", { country: "US" }), { reason: "card_country", cardCountry: "US" });
assert.deepEqual(cardCountryMismatch("IN", { international: true }), { reason: "international_card", cardCountry: null });
assert.equal(cardCountryMismatch("US", { international: true }), null);
assert.equal(cardCountryMismatch("IN", null), null);
assert.equal(cardCountryMismatch(null, { country: "US" }), null);

const secret = "test-only-pricing-secret-that-is-long-enough";
const timestamp = "1700000000";
const signature = createHmac("sha256", secret)
  .update(`US:${timestamp}`)
  .digest("hex");
assert.equal(
  verifySignedFrontendCountry({
    countryValue: "US",
    timestampValue: timestamp,
    signatureValue: signature,
    secret,
    nowSeconds: Number(timestamp),
  }),
  "US"
);
assert.equal(
  verifySignedFrontendCountry({
    countryValue: "IN",
    timestampValue: timestamp,
    signatureValue: signature,
    secret,
    nowSeconds: Number(timestamp),
  }),
  null
);
assert.equal(
  verifySignedFrontendCountry({
    countryValue: "US",
    timestampValue: timestamp,
    signatureValue: signature,
    secret,
    nowSeconds: Number(timestamp) + 301,
  }),
  null
);

assert.equal(getCurrencyMinorUnitExponent("USD"), 2);
assert.equal(getCurrencyMinorUnitExponent("IDR"), 0);

console.log("Country pricing resolution tests passed.");
