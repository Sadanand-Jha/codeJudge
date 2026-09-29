// General-purpose email sender using Nodemailer/SMTP.
import logger from '../utils/logger.js';
import { getTransporter, getFromAddress } from './smtp.js';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

function requireTransport() {
  const transporter = getTransporter();
  const from = getFromAddress();
  if (!transporter || !from) {
    logger.warn('SMTP is not configured - email will be mocked (not sent). Set SMTP_HOST/SMTP_USER/SMTP_PASS (or EMAIL1/GMAIL_APP_PASSWORD1) in .env / Vercel Dashboard.');
    return null;
  }
  return { transporter, from };
}

/**
 * Send through the shared Nodemailer transport. The transport is cached and
 * pooled in smtp.ts, allowing warm Vercel functions to reuse an authenticated
 * SMTP connection. Callers await acceptance because background promises can
 * be frozen as soon as a serverless response is returned.
 */
async function deliverEmail(options: EmailOptions): Promise<string> {
  const ctx = requireTransport();
  if (!ctx) {
    logger.warn(`[MOCK EMAIL] to=${options.to} subject="${options.subject}" - SMTP missing, skipping send`);
    return 'mock';
  }

  const info = await ctx.transporter.sendMail({
    from: ctx.from,
    to: options.to,
    subject: options.subject,
    html: options.html || (options.text ? `<p>${options.text}</p>` : '<p></p>'),
    ...(options.text ? { text: options.text } : {}),
  });
  logger.info(`Email dispatched via SMTP to ${options.to}: ${info.messageId}`);
  return info.messageId;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await deliverEmail(options);
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}:`, error);
    throw error;
  }
}

/**
 * Sends OTP email - Primary OTP method.
 * Required signature per spec: sendOtpEmail({ to, otp })
 * Also supports legacy call: sendOtpEmail(email, otp) for backward compat.
 */
export async function sendOtpEmail(
  toOrPayload: string | { to: string; otp: string },
  otpMaybe?: string
): Promise<void> {
  const to = typeof toOrPayload === 'string' ? toOrPayload : toOrPayload.to;
  const otp = typeof toOrPayload === 'string' ? otpMaybe! : toOrPayload.otp;

  if (!to || !otp) {
    throw new Error('sendOtpEmail requires { to, otp }');
  }

  const subject = 'Your OTP Verification Code';
  // OTP digits separated with non-breaking spaces + nowrap styling.
  // Regular spaces let narrow clients (e.g. Gmail app) line-break mid-code,
  // rendering "6 9 9 1" over "2 3" on two lines.
  const spacedOtp = otp.split('').join('&nbsp;');
  const html = `
  <div style="background-color:#f8f7ff;padding:32px 16px;font-family:Inter,Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ede9fe;border-radius:16px;box-shadow:0 8px 24px rgba(124,58,237,0.08);">
      <tr><td style="padding:28px 28px 20px 28px;">
        <!-- Header: brand + lock icon -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:22px;font-weight:800;color:#1e1b4b;letter-spacing:-0.5px;vertical-align:middle;">byteclash</td>
          <td style="text-align:right;vertical-align:middle;">
            <div style="display:inline-block;width:48px;height:48px;background:#f5f3ff;border-radius:12px;text-align:center;line-height:48px;">
              <span style="font-size:22px;">🔒</span>
            </div>
          </td>
        </tr></table>

        <h1 style="margin:20px 0 8px 0;font-size:24px;font-weight:800;color:#1e1b4b;letter-spacing:-0.3px;line-height:1.2;">byteclash Registration</h1>
        <p style="margin:0 0 18px 0;font-size:14px;color:#64748b;line-height:20px;">Your One-Time Password (OTP) for registration is:</p>

        <!-- OTP box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;border:1px solid #ede9fe;border-radius:12px;margin:0 0 20px 0;"><tr>
          <td style="padding:18px 16px;text-align:center;vertical-align:middle;white-space:nowrap;">
            <span style="font-size:30px;font-weight:800;letter-spacing:8px;text-indent:8px;color:#7c3aed;line-height:1.2;display:inline-block;white-space:nowrap;word-break:keep-all;">${spacedOtp}</span>
          </td>
          <td style="width:50px;text-align:center;vertical-align:middle;padding-right:12px;">
            <div style="display:inline-block;width:36px;height:36px;background:#ede9fe;border-radius:8px;text-align:center;line-height:36px;">
              <span style="font-size:16px;color:#7c3aed;">⧉</span>
            </div>
          </td>
        </tr></table>

        <!-- Info row 1 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;"><tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;">
            <div style="width:28px;height:28px;background:#ecfdf5;border-radius:50%;text-align:center;line-height:28px;">
              <span style="font-size:14px;">🕒</span>
            </div>
          </td>
          <td style="vertical-align:middle;padding-left:2px;">
            <p style="margin:2px 0 0 0;font-size:13px;color:#475569;line-height:18px;">This OTP is valid for <strong style="color:#1e293b;">5 minutes</strong>. Do not share this code with anyone.</p>
          </td>
        </tr></table>

        <!-- Info row 2 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;"><tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;">
            <div style="width:28px;height:28px;background:#fef2f2;border-radius:50%;text-align:center;line-height:28px;">
              <span style="font-size:14px;">🛡️</span>
            </div>
          </td>
          <td style="vertical-align:middle;padding-left:2px;">
            <p style="margin:2px 0 0 0;font-size:13px;color:#475569;line-height:18px;">If you did not request this OTP, please ignore this email.</p>
          </td>
        </tr></table>

        <hr style="border:none;border-top:1px solid #f1f5f9;margin:18px 0 14px 0;" />
        <p style="margin:0;font-size:12px;color:#64748b;">byteclash Team</p>
      </td></tr>
    </table>
    <div style="max-width:560px;margin:12px auto 0 auto;text-align:center;font-size:11px;color:#94a3b8;">This is an automated email, please do not reply.</div>
  </div>
  `;
  const text = `Your OTP for verification is: ${otp}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.`;

  try {
    await deliverEmail({ to, subject, html, text });
  } catch (error) {
    logger.error(`Failed to send OTP email to ${to}:`, error);
    throw error;
  }
}

/**
 * Sends a collaborator invitation email to the invitee.
 * The link opens their profile page where the collaborator requests inbox lives.
 */
export async function sendCollaboratorInviteEmail(payload: {
  to: string;
  quizName: string;
  inviterUsername: string;
  inviteUrl: string;
}): Promise<void> {
  const { to, quizName, inviterUsername, inviteUrl } = payload;
  const subject = `Collaboration Invitation: ${quizName}`;
  const text = `Hi ${to},\n\n${inviterUsername} has invited you to collaborate on the quiz "${quizName}".\n\nOpen the link below to view the invitation and accept or decline it:\n${inviteUrl}\n\nIf you did not expect this, you can ignore this email.\n\nbyteclash Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #333;">Collaboration Invitation</h2>
      <p style="font-size: 16px; color: #555;">${inviterUsername} has invited you to collaborate on the quiz <strong>"${quizName}"</strong>.</p>
      <p style="font-size: 16px; color: #555;">Click the button below to view the invitation and accept or decline it:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${inviteUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">View Invitation</a>
      </div>
      <p style="font-size: 14px; color: #888;">If you did not expect this invitation, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #aaa;">byteclash Team</p>
    </div>
  `;

  try {
    await deliverEmail({ to, subject, html, text });
  } catch (error) {
    logger.error(`Failed to send collaborator invite to ${to}:`, error);
    throw error;
  }
}
