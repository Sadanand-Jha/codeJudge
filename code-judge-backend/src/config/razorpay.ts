// Razorpay credentials and API endpoint configuration.
//
// Keys are read lazily so the API can boot on machines that only serve the
// public catalog. Payment routes fail with a clear 503 until the keys exist.

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  apiBaseUrl: string;
}

/**
 * Reads and trims an environment variable, returning an empty string when it is unset. Blank values from the dashboard therefore behave like missing configuration.
 */
function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/**
 * Reports whether both API key values exist. Checkout creation and payment verification require these credentials, while read-only pricing stays available without them.
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(readEnv("RAZORPAY_KEY_ID") && readEnv("RAZORPAY_KEY_SECRET"));
}

/**
 * Builds the Razorpay configuration from environment variables, or returns null when the API key pair is incomplete. The webhook secret is optional because only webhook handling needs it.
 */
export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = readEnv("RAZORPAY_KEY_ID");
  const keySecret = readEnv("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return null;

  return {
    keyId,
    keySecret,
    webhookSecret: readEnv("RAZORPAY_WEBHOOK_SECRET"),
    apiBaseUrl: readEnv("RAZORPAY_API_BASE_URL") || "https://api.razorpay.com/v1",
  };
}

/**
 * Returns the webhook signing secret on its own. Webhook verification must keep working even when the API key pair is being rotated or is temporarily absent.
 */
export function getRazorpayWebhookSecret(): string {
  return readEnv("RAZORPAY_WEBHOOK_SECRET");
}
