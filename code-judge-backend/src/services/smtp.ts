// Shared Nodemailer/SMTP transport for all outgoing email.
//
// Configuration (user provides these env vars themselves):
//   Generic SMTP:
//     SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"), SMTP_USER, SMTP_PASS, SMTP_FROM
//   Gmail app-password fallback (used when SMTP_HOST is not set):
//     EMAIL1 (gmail address), GMAIL_APP_PASSWORD1 (app password), GMAIL_APP_NAME1 (sender name)
//
// When nothing is configured, getTransporter() returns null and callers
// fall back to their mock/skip behavior (dev without env never crashes).
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function parseSecure(port: number): boolean {
  const raw = (process.env.SMTP_SECURE || "").trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return port === 465;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = process.env.SMTP_PASS || "";
  if (host && user && pass) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const fromAddr = (process.env.SMTP_FROM || "").trim() || user;
    return { host, port, secure: parseSecure(port), user, pass, from: fromAddr };
  }

  // Gmail app-password fallback.
  const gmailUser = (process.env.EMAIL1 || "").trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD1 || "";
  if (gmailUser && gmailPass) {
    const senderName = (process.env.GMAIL_APP_NAME1 || "").trim();
    const fromAddr =
      (process.env.SMTP_FROM || "").trim() ||
      (senderName ? `${senderName} <${gmailUser}>` : gmailUser);
    return {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      user: gmailUser,
      pass: gmailPass,
      from: fromAddr,
    };
  }

  return null;
}

export function isEmailConfigured(): boolean {
  return getSmtpConfig() !== null;
}

let cached: Transporter | null = null;
let cachedKey = "";

export function getTransporter(): Transporter | null {
  const cfg = getSmtpConfig();
  if (!cfg) return null;
  const key = `${cfg.host}:${cfg.port}:${cfg.user}`;
  if (!cached || cachedKey !== key) {
    cached = nodemailer.createTransport({
      // Pooling is especially useful on Vercel: a warm function can reuse the
      // authenticated socket instead of repeating DNS + TLS + SMTP handshakes.
      pool: true,
      maxConnections: 1,
      maxMessages: 50,
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 7_000,
      socketTimeout: 20_000,
      tls: { servername: cfg.host },
    });
    cachedKey = key;
  }
  return cached;
}

export function getFromAddress(): string | null {
  return getSmtpConfig()?.from ?? null;
}
