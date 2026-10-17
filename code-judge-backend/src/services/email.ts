// QuizSupport OTP email — themed to match the qs-ui site theme.
// Brand: #6A3DF0, page #F7F5FF, ink #1A1240, sun #FFD23F, chunky 20px card.
// Logo loads from the public website URL (no attachments, so nothing shows
// as a separate file). Fully fluid + media-query responsive for mobile/desktop.
import logger from '../utils/logger.js';
import { getTransporter, getFromAddress } from './smtp.js';
import { isResendConfigured, sendViaResend } from './resend.js';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

function requireTransport() {
  const transporter = getTransporter();
  const from = getFromAddress();
  if (!transporter || !from) return null;
  return { transporter, from };
}

/**
 * Send through the shared Nodemailer transport, falling back to the Resend
 * API when SMTP fails. The transport is cached and pooled in smtp.ts,
 * allowing warm Vercel functions to reuse an authenticated SMTP connection.
 * Callers await acceptance because background promises can be frozen as soon
 * as a serverless response is returned.
 */
async function deliverEmail(options: EmailOptions): Promise<string> {
  const ctx = requireTransport();
  let smtpError: unknown = null;

  if (ctx) {
    try {
      const info = await ctx.transporter.sendMail({
        from: ctx.from,
        to: options.to,
        subject: options.subject,
        html: options.html || (options.text ? `<p>${options.text}</p>` : '<p></p>'),
        ...(options.text ? { text: options.text } : {}),
      });
      logger.info(`Email dispatched via SMTP to ${options.to}: ${info.messageId}`);
      return info.messageId;
    } catch (error) {
      smtpError = error;
      logger.error(`SMTP send to ${options.to} failed, trying Resend fallback:`, error);
    }
  }

  // Fallback: Resend API (also the primary path when SMTP is not configured).
  if (isResendConfigured()) {
    try {
      return await sendViaResend({
        to: options.to,
        subject: options.subject,
        html: options.html || (options.text ? `<p>${options.text}</p>` : undefined),
        text: options.text,
      });
    } catch (resendError) {
      logger.error(`Resend fallback to ${options.to} also failed:`, resendError);
      throw resendError;
    }
  }

  if (smtpError) throw smtpError;
  throw new Error(
    'Email delivery is not configured. Set RESEND_API_KEY (Resend fallback) or SMTP_HOST/SMTP_USER/SMTP_PASS or EMAIL1/GMAIL_APP_PASSWORD1.'
  );
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

  const subject = 'Your QuizSupport verification code';
  // OTP digits separated with non-breaking spaces + nowrap styling.
  // Regular spaces let narrow clients (e.g. Gmail app) line-break mid-code,
  // rendering "6 9 9 1" over "2 3" on two lines.
  const spacedOtp = otp.split('').join('&nbsp;');
  // Logo served from the public website — plain remote <img>, zero attachments,
  // so no separate file/download ever appears. FRONTEND_URL is the deployed
  // site (e.g. https://quizsupport.com); falls back to localhost in dev.
  const siteUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
  const logoUrl = `${siteUrl}/logos/name.png`;
  // Theme: qs-ui light — page #F7F5FF, surface #FFFFFF, ink #1A1240,
  // muted #5C5679, brand #6A3DF0, line #E0DBF5, sun #FFD23F, card radius 20px.
  const html = `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${subject}</title>
<style>
@media only screen and (max-width:480px){
  .otp-wrap{padding:20px 10px !important;}
  .otp-card-td{padding:22px 18px 18px 18px !important;}
  .otp-code{font-size:26px !important;letter-spacing:5px !important;text-indent:5px !important;}
  .otp-h1{font-size:22px !important;}
  .otp-logo{width:170px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#F7F5FF;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div class="otp-wrap" style="background-color:#F7F5FF;padding:32px 16px;font-family:'DM Sans',Inter,Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:560px;margin:0 auto;background:#FFFFFF;border:2px solid #1A1240;border-radius:20px;">
      <tr><td class="otp-card-td" style="padding:28px 28px 22px 28px;">
        <!-- Header: website logo IN PLACE OF the company name (no text brand) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" style="text-align:center;vertical-align:middle;">
            <img class="otp-logo" src="${logoUrl}" alt="QuizSupport" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;outline:none;margin:0 auto;" />
          </td>
        </tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="text-align:center;padding:14px 0 0 0;">
            <span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#6A3DF0;background:#F7F5FF;border:2px solid #E0DBF5;border-radius:999px;padding:6px 14px;">Email verification</span>
          </td>
        </tr></table>

        <h1 class="otp-h1" style="margin:18px 0 8px 0;font-size:26px;font-weight:800;color:#1A1240;letter-spacing:-0.5px;line-height:1.2;text-align:center;">Your verification code</h1>
        <p style="margin:0 0 18px 0;font-size:14px;color:#5C5679;line-height:21px;text-align:center;">Use this 6-digit code to continue on <strong style="color:#1A1240;">QuizSupport</strong>. It expires soon, so enter it right away.</p>

        <!-- OTP box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F5FF;border:2px solid #E0DBF5;border-radius:16px;margin:0 0 20px 0;"><tr>
          <td align="center" style="padding:20px 16px;text-align:center;vertical-align:middle;white-space:nowrap;">
            <span class="otp-code" style="font-size:32px;font-weight:800;letter-spacing:8px;text-indent:8px;color:#6A3DF0;line-height:1.2;display:inline-block;white-space:nowrap;word-break:keep-all;">${spacedOtp}</span>
          </td>
        </tr></table>

        <!-- Info row 1 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;"><tr>
          <td style="width:38px;vertical-align:top;padding-top:2px;">
            <div style="width:30px;height:30px;background:#6A3DF0;border-radius:10px;text-align:center;line-height:30px;">
              <span style="font-size:15px;color:#ffffff;">&#9719;</span>
            </div>
          </td>
          <td style="vertical-align:middle;padding-left:4px;">
            <p style="margin:2px 0 0 0;font-size:13px;color:#5C5679;line-height:18px;">This code is valid for <strong style="color:#1A1240;">5 minutes</strong>. Never share it with anyone — QuizSupport will never ask for it.</p>
          </td>
        </tr></table>

        <!-- Info row 2 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;"><tr>
          <td style="width:38px;vertical-align:top;padding-top:2px;">
            <div style="width:30px;height:30px;background:#FFD23F;border:2px solid #1A1240;border-radius:10px;text-align:center;line-height:26px;">
              <span style="font-size:14px;color:#1A1240;">&#9888;</span>
            </div>
          </td>
          <td style="vertical-align:middle;padding-left:4px;">
            <p style="margin:2px 0 0 0;font-size:13px;color:#5C5679;line-height:18px;">Didn&apos;t request this code? You can safely ignore this email.</p>
          </td>
        </tr></table>

        <hr style="border:none;border-top:2px solid #E0DBF5;margin:18px 0 14px 0;" />
        <p style="margin:0;font-size:12px;color:#5C5679;text-align:center;">QuizSupport Team &middot; AI quiz &amp; paper studio</p>
      </td></tr>
    </table>
    <div style="max-width:560px;margin:12px auto 0 auto;text-align:center;font-size:11px;color:#5C5679;">This is an automated email, please do not reply.</div>
  </div>
</body>
</html>
  `;
  const text = `QuizSupport verification\n\nYour OTP for verification is: ${otp}\n\nThis OTP is valid for 5 minutes. Never share it with anyone.\n\nIf you did not request this, please ignore this email.`;

  try {
    // No attachments — logo is a remote <img>, so Gmail/Outlook never show a separate file.
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
  const text = `Hi ${to},\n\n${inviterUsername} has invited you to collaborate on the quiz "${quizName}".\n\nOpen the link below to view the invitation and accept or decline it:\n${inviteUrl}\n\nIf you did not expect this, you can ignore this email.\n\nquizsupport Team`;
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
      <p style="font-size: 12px; color: #aaa;">quizsupport Team</p>
    </div>
  `;

  try {
    await deliverEmail({ to, subject, html, text });
  } catch (error) {
    logger.error(`Failed to send collaborator invite to ${to}:`, error);
    throw error;
  }
}
