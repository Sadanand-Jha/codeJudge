// Transactional email sent when an owner approves a user-requested Basic trial.
import { findInvoiceContactById } from "../repositories/billing.repository.ts";
import { getBrandLogo, OTP_LOGO_CID, sendEmail } from "./email.ts";
import logger from "../utils/logger.ts";

function envValue(name: string): string {
  return (process.env[name] || "").trim();
}

function supportEmail(): string {
  return (
    envValue("INVOICE_SUPPORT_EMAIL") ||
    envValue("SUPPORT_EMAIL") ||
    "support@quizsupport.app"
  );
}

function frontendUrl(): string {
  return (envValue("FRONTEND_URL") || "http://localhost:3000").replace(/\/$/, "");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export interface TrialApprovalEmailInput {
  userId: number;
  planName: string;
  trialDays: number;
  trialEndsAt: Date;
  credits: number;
}

function renderTrialEmail(
  input: TrialApprovalEmailInput,
  name: string,
  hasLogo: boolean
): string {
  const endsOn = formatDate(input.trialEndsAt);
  const support = supportEmail();
  const startLink = `${frontendUrl()}/creator`;
  const brandMark = hasLogo
    ? `<img src="cid:${OTP_LOGO_CID}" alt="QuizSupport" width="170" style="display:block;width:170px;max-width:100%;height:auto;border:0;outline:none;" />`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-.02em;">Quiz<span style="color:#ffd23f;">Support</span></div>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your trial is approved</title></head>
<body style="margin:0;padding:0;background:#f6f4ff;">
<div style="background:#f6f4ff;padding:30px 14px;font-family:Onest,Inter,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:2px solid #1b1340;border-radius:20px;overflow:hidden;">
    <tr><td style="background:#2d2260;padding:24px 26px;color:#ffffff;">
      ${brandMark}
      <div style="display:inline-block;margin-top:12px;background:#ffd23f;color:#1b1340;font-size:10.5px;font-weight:800;letter-spacing:.08em;padding:5px 12px;border-radius:999px;border:2px solid #1b1340;">${input.trialDays}-DAY TRIAL ACTIVE</div>
      <h1 style="margin:12px 0 6px 0;font-size:28px;line-height:1.1;letter-spacing:-.03em;">Your trial is approved</h1>
      <p style="margin:0;font-size:14px;color:#cfc8ff;">${escapeHtml(input.planName)} plan · ends ${escapeHtml(endsOn)}</p>
    </td></tr>
    <tr><td style="padding:24px 26px 8px 26px;">
      <p style="margin:0 0 12px 0;font-size:14px;color:#1b1340;line-height:22px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px 0;font-size:14px;color:#5d5878;line-height:22px;">Great news — your ${escapeHtml(input.planName)} trial request has been approved. Your workspace is ready with <strong style="color:#1b1340;">${input.credits} AI credits</strong> until <strong style="color:#1b1340;">${escapeHtml(endsOn)}</strong>.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1edff;border:2px solid #ddd6fe;border-radius:14px;margin:0 0 18px 0;">
        <tr><td style="padding:14px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#1b1340;">
            <tr><td style="padding:4px 0;color:#5d5878;font-weight:600;">Plan</td><td align="right" style="padding:4px 0;"><strong>${escapeHtml(input.planName)} trial</strong></td></tr>
            <tr><td style="padding:4px 0;color:#5d5878;font-weight:600;">Trial ends</td><td align="right" style="padding:4px 0;"><strong>${escapeHtml(endsOn)}</strong></td></tr>
            <tr><td style="padding:4px 0;color:#5d5878;font-weight:600;">AI credits</td><td align="right" style="padding:4px 0;"><strong style="color:#12805c;">${input.credits}</strong></td></tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:0 0 16px 0;font-size:13px;color:#5d5878;line-height:20px;"><strong style="color:#1b1340;">What you can do now</strong><br>Create quizzes and tests, generate questions with AI, and explore everything included in your trial.</p>
      <a href="${startLink}" style="display:inline-block;background:#6b3fef;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 20px;border-radius:12px;border:2px solid #1b1340;">Start creating</a>
    </td></tr>
    <tr><td style="padding:18px 26px 24px 26px;border-top:2px dashed #ddd6fe;font-size:12px;color:#5d5878;line-height:18px;">
      Need help? Write to <a href="mailto:${escapeHtml(support)}" style="color:#6b3fef;font-weight:700;">${escapeHtml(support)}</a> and mention your trial.
    </td></tr>
  </table>
</div>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendTrialApprovalEmail(
  input: TrialApprovalEmailInput
): Promise<void> {
  try {
    const contact = await findInvoiceContactById(String(input.userId));
    if (!contact) {
      logger.warn(`Trial approval email skipped for user ${input.userId}: no email`);
      return;
    }

    const logo = await getBrandLogo("dark");
    const endsOn = formatDate(input.trialEndsAt);
    const support = supportEmail();

    await sendEmail({
      to: contact.email,
      subject: `Your ${input.planName} trial is active · ends ${endsOn}`,
      text: `Great news — your ${input.planName} trial is active until ${endsOn}. You have ${input.credits} AI credits. Start creating: ${frontendUrl()}/creator. Need help? Write to ${support}.`,
      html: renderTrialEmail(input, contact.name, Boolean(logo)),
      inlineAttachments: logo
        ? [
            {
              filename: "quizsupport-logo.png",
              content: logo,
              contentType: "image/png",
              cid: OTP_LOGO_CID,
            },
          ]
        : [],
    });
  } catch (error) {
    logger.error(`Trial approval email failed for user ${input.userId}:`, error);
  }
}
