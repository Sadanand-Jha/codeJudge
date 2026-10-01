// Resend (resend.com) fallback for outgoing email.
//
// Used only when the primary Nodemailer/SMTP send fails (or SMTP is not
// configured at all). Configuration (user provides these env vars):
//   RESEND_API_KEY — required to enable the fallback
//   RESEND_FROM    — verified sender, e.g. "byteclash <noreply@example.com>".
//                    Falls back to the SMTP from address when set, since that
//                    is usually already a verified identity.
import { Resend } from "resend";
import logger from "../utils/logger.js";
import { getFromAddress } from "./smtp.js";

export interface ResendAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface ResendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: ResendAttachment[];
  from?: string;
}

export function getResendApiKey(): string | null {
  const key = (process.env.RESEND_API_KEY || "").trim();
  return key || null;
}

// Default test sender provided by Resend. Works without a verified domain but
// only delivers to the Resend account owner's own address — enough to keep
// auth/OTP flows alive until RESEND_FROM (verified domain) is set.
const ONBOARDING_FROM = "byteclash <onboarding@resend.dev>";

export function getResendFrom(): string {
  const from = (process.env.RESEND_FROM || "").trim();
  if (from) return from;
  return getFromAddress() || ONBOARDING_FROM;
}

export function isResendConfigured(): boolean {
  return getResendApiKey() !== null;
}

let cached: Resend | null = null;
let cachedKey = "";

export function getResendClient(): Resend | null {
  const key = getResendApiKey();
  if (!key) return null;
  if (!cached || cachedKey !== key) {
    cached = new Resend(key);
    cachedKey = key;
  }
  return cached;
}

/**
 * Send a single email through the Resend API. Throws when Resend is not
 * configured or the API rejects the send.
 */
export async function sendViaResend(options: ResendEmailOptions): Promise<string> {
  const client = getResendClient();
  const from = options.from || getResendFrom();
  if (!client) {
    throw new Error(
      "Resend fallback is not configured. Set the RESEND_API_KEY environment variable."
    );
  }
  if (!process.env.RESEND_FROM?.trim() && !options.from) {
    logger.warn(
      "RESEND_FROM is not set — sending via Resend test identity (onboarding@resend.dev), " +
        "which only delivers to the Resend account owner's address. Set RESEND_FROM to a verified domain sender for production."
    );
  }

  const base = {
    from,
    to: options.to,
    subject: options.subject,
    ...(options.attachments?.length
      ? {
          attachments: options.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            ...(a.contentType ? { contentType: a.contentType } : {}),
          })),
        }
      : {}),
  };

  // The SDK types its payload as a discriminated union (html | text | react
  // | template), so each branch passes a fully-narrowed object.
  const { data, error } = options.html
    ? await client.emails.send({
        ...base,
        html: options.html,
        ...(options.text ? { text: options.text } : {}),
      })
    : await client.emails.send({ ...base, text: options.text ?? "" });

  if (error) {
    throw new Error(`Resend rejected the email: ${error.message}`);
  }
  logger.info(`Email dispatched via Resend to ${options.to}: ${data?.id}`);
  return data?.id ?? "";
}
