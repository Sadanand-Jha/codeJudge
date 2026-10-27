// Razorpay signature helpers.
//
// Checkout returns `razorpay_signature` = HMAC-SHA256(order_id + "|" +
// payment_id, key_secret). Webhooks carry X-Razorpay-Signature =
// HMAC-SHA256(raw_request_body, webhook_secret). Both are lowercase hex.

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Computes the lowercase hexadecimal HMAC-SHA256 used by Razorpay. Both checkout signatures and webhook signatures use this primitive.
 */
export function hmacSha256Hex(secret: string, payload: string | Buffer): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Compares two signature strings in constant time. Length differences are rejected before timingSafeEqual, which requires equal-length buffers.
 */
export function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Verifies the checkout signature over orderId|paymentId using the API key secret. This proves the payment response was produced by Razorpay for this order.
 */
export function verifyPaymentSignature(input: {
  keySecret: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = hmacSha256Hex(
    input.keySecret,
    `${input.orderId}|${input.paymentId}`
  );
  return signaturesMatch(expected, input.signature);
}

/**
 * Verifies the X-Razorpay-Signature header over the exact raw request body. Re-serialized JSON must not be accepted because whitespace changes the digest.
 */
export function verifyWebhookSignature(input: {
  webhookSecret: string;
  rawBody: string | Buffer;
  signature: string;
}): boolean {
  const expected = hmacSha256Hex(input.webhookSecret, input.rawBody);
  return signaturesMatch(expected, input.signature);
}
