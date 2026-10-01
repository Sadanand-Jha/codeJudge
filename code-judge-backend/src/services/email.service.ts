// Marksheet email service. Sends a formatted email to the quiz creator with the
// generated marksheet Excel file as an attachment and quiz statistics.
// Sends via Nodemailer/SMTP first, Resend API fallback (see ./smtp.ts and
// ./resend.ts for env configuration).
import logger from "../utils/logger.ts";
import { getTransporter, getFromAddress } from "./smtp.ts";
import { isResendConfigured, sendViaResend } from "./resend.ts";

export interface MarksheetEmailPayload {
  to: string;
  quizName: string;
  quizCode: string;
  endTime: Date;
  marksheetBuffer: Buffer;
  stats: {
    totalParticipants: number;
    totalSubmissions: number;
    completionRate: number;
    averageMarks: number;
    highestMarks: number;
    lowestMarks: number;
    averageTimeTaken: number;
    highestPercentage: number;
  };
}

function requireTransport() {
  const transporter = getTransporter();
  const from = getFromAddress();
  if (!transporter || !from) {
    throw new Error("Email configuration is incomplete. Please set RESEND_API_KEY (Resend fallback) or SMTP_HOST/SMTP_USER/SMTP_PASS (or EMAIL1/GMAIL_APP_PASSWORD1) environment variables.");
  }
  return { transporter, from };
}

/**
 * Send marksheet email to quiz creator via SMTP
 */
export async function sendMarksheetEmail(payload: MarksheetEmailPayload): Promise<void> {
  const { to, quizName, quizCode, endTime, marksheetBuffer, stats } = payload;

  // Email subject
  const subject = `Quiz Report - ${quizName}`;


  // Email body
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #EC4899; margin-bottom: 20px;">Quiz Report</h2>
      
      <p style="font-size: 16px; margin-bottom: 10px;">Hello,</p>
      
      <p style="font-size: 14px; margin-bottom: 20px;">
        Your quiz has been completed. Please find the attached marksheet containing the performance of all participating students.
      </p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #111827; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Summary</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold; width: 40%;">Quiz Name</td>
            <td style="padding: 8px 0;">${quizName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold;">Quiz Code</td>
            <td style="padding: 8px 0;">${quizCode}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold;">Quiz End Time</td>
            <td style="padding: 8px 0;">${new Date(endTime).toLocaleString("en-IN")}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #111827; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Statistics</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold; width: 40%;">Total Participants</td>
            <td style="padding: 8px 0;">${stats.totalParticipants}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold;">Total Submissions</td>
            <td style="padding: 8px 0;">${stats.totalSubmissions}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold;">Completion Rate</td>
            <td style="padding: 8px 0;">${stats.completionRate.toFixed(2)}%</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold;">Average Score</td>
            <td style="padding: 8px 0;">${stats.averageMarks.toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold;">Highest Score</td>
            <td style="padding: 8px 0;">${stats.highestMarks}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold;">Lowest Score</td>
            <td style="padding: 8px 0;">${stats.lowestMarks}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold;">Average Time Taken</td>
            <td style="padding: 8px 0;">${Math.floor(stats.averageTimeTaken / 60)} min</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Highest Percentage</td>
            <td style="padding: 8px 0;">${stats.highestPercentage.toFixed(2)}%</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; margin-bottom: 10px;">The detailed marksheet is attached as an Excel file.</p>

      <p style="font-size: 14px; margin-top: 30px; color: #666;">
        Regards,<br>
        <strong>Quiz System</strong>
      </p>
    </div>
  `;

  const filename = `marksheet_${quizCode}_${new Date().toISOString().split("T")[0]}.xlsx`;
  const attachmentContentType =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  // Primary: SMTP with attachment. On failure, fall back to Resend.
  try {
    const { transporter, from } = requireTransport();
    const info = await transporter.sendMail({
      from: `Quiz System <${from}>`,
      to,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename,
          content: marksheetBuffer,
          contentType: attachmentContentType,
        },
      ],
    });

    logger.info(`Marksheet email sent to ${to} for quiz ${quizCode}: ${info.messageId}`);
    return;
  } catch (smtpError) {
    logger.error(
      `SMTP marksheet email to ${to} for quiz ${quizCode} failed, trying Resend fallback:`,
      smtpError
    );
    if (!isResendConfigured()) {
      throw new Error(
        `Failed to send email: ${smtpError instanceof Error ? smtpError.message : String(smtpError)}`
      );
    }
    try {
      await sendViaResend({
        to,
        subject,
        html: htmlBody,
        attachments: [
          { filename, content: marksheetBuffer, contentType: attachmentContentType },
        ],
      });
      logger.info(`Marksheet email sent via Resend to ${to} for quiz ${quizCode}`);
    } catch (resendError) {
      logger.error(`Resend marksheet fallback to ${to} also failed:`, resendError);
      throw new Error(
        `Failed to send email: ${resendError instanceof Error ? resendError.message : String(resendError)}`
      );
    }
  }
}
