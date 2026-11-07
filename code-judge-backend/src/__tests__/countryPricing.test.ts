import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  choosePricingCountry,
  countryFromMobile,
  countryFromTrustedProxyHeaders,
  getCurrencyMinorUnitExponent,
  verifySignedFrontendCountry,
} from "../services/countryPricing.service.ts";

assert.deepEqual(
  choosePricingCountry({
    billingCountry: "GB",
    ipCountry: "IN",
    mobileCountry: "US",
  }),
  { countryCode: "GB", source: "subscription" }
);
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
    trustedProxyIps,
  }),
  "IN"
);
assert.equal(
  countryFromTrustedProxyHeaders({
    peerAddress: "192.0.2.10",
    cloudflareCountry: "US",
    trustedProxyIps,
  }),
  null
);
assert.equal(
  countryFromTrustedProxyHeaders({
    peerAddress: "10.0.0.5",
    cloudflareCountry: "XX",
    vercelCountry: "GB",
    trustedProxyIps,
  }),
  null
);

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
