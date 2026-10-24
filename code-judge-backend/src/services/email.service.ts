// Quiz report emails. Sends the generated marksheet or the responses report
// (Excel workbook with registration form columns) to the quiz creator.
// Sends via Nodemailer/SMTP first, Resend API fallback (see ./smtp.ts and
// ./resend.ts for env configuration).
import logger from "../utils/logger.ts";
import { getTransporter, getFromAddress } from "./smtp.ts";
import { isResendConfigured, sendViaResend } from "./resend.ts";

export interface ResponsesReportEmailPayload {
  to: string;
  quizName: string;
  quizCode: string;
  responsesBuffer: Buffer;
  registrationFields: string[];
  stats: {
    totalParticipants: number;
    submitted: number;
    averageCorrect: number;
    averagePercentage: number;
    highestCorrect: number;
    totalQuestions: number;
  };
}

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
            <td style="padding: 8px 0;">${new Date(endTime).toLocaleString("en-IN", { timeZone: "UTC" })}</td>
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendResponsesReportEmail(payload: ResponsesReportEmailPayload): Promise<void> {
  const { to, quizName, quizCode, responsesBuffer, registrationFields, stats } = payload;

  const safeQuizName = escapeHtml(quizName);
  const safeQuizCode = escapeHtml(quizCode);
  const subject = `Quiz Responses Report - ${quizName}`;
  const filename = `responses_${quizCode}_${new Date().toISOString().split("T")[0]}.xlsx`;
  const accuracyWidth = Math.min(100, Math.max(0, Math.round(stats.averagePercentage)));
  const fieldsChips = registrationFields.length
    ? registrationFields
        .map(
          (field) =>
            `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 12px;border:2px solid #1a1240;border-radius:999px;background:#ffffff;font-size:12px;font-weight:700;color:#1a1240;">${escapeHtml(field)}</span>`
        )
        .join("")
    : `<span style="font-size:13px;color:#5c5679;">No custom registration fields were collected for this quiz.</span>`;

  const statCard = (label: string, value: string, sub: string) => `
    <div style="border:2px solid #1a1240;border-radius:14px;background:#f7f5ff;padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#5c5679;">${label}</p>
      <p style="margin:0;font-size:24px;line-height:1.2;font-weight:800;color:#1a1240;">${value}</p>
      <p style="margin:4px 0 0;font-size:11px;font-weight:600;color:#8b84a8;">${sub}</p>
    </div>`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Quiz Responses Report</title>
      </head>
      <body style="margin:0;padding:0;background-color:#efebff;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${safeQuizName} - ${stats.totalParticipants} students, ${stats.submitted} submitted. Your Excel report is attached.</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#efebff;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background-color:#ffffff;border:2px solid #1a1240;border-radius:20px;overflow:hidden;box-shadow:6px 6px 0 #ffd23f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <tr>
                  <td style="background-color:#6a3df0;background-image:linear-gradient(135deg,#6a3df0 0%,#8b5cf6 100%);padding:32px 32px 28px;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#e9e2ff;">QuizSupport Creator Studio</p>
                    <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:800;color:#ffffff;">Quiz Responses Report</h1>
                    <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#efeaff;">${safeQuizName}</p>
                    <span style="display:inline-block;margin-top:14px;padding:6px 12px;border:1px solid rgba(255,255,255,0.55);border-radius:999px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#ffffff;">CODE: ${safeQuizCode}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 32px 8px;">
                    <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1a1240;">Hello,</p>
                    <p style="margin:0;font-size:14px;line-height:1.65;color:#5c5679;">Your responses report is ready. Here is a quick snapshot of how the quiz went, with the full Excel sheet attached.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" valign="top" style="padding:0 6px 12px 0;">${statCard("Total students", String(stats.totalParticipants), "registered")}</td>
                        <td width="50%" valign="top" style="padding:0 0 12px 6px;">${statCard("Submitted", String(stats.submitted), "completed")}</td>
                      </tr>
                      <tr>
                        <td width="50%" valign="top" style="padding:0 6px 12px 0;">${statCard("Average correct", `${stats.averageCorrect} / ${stats.totalQuestions}`, "per student")}</td>
                        <td width="50%" valign="top" style="padding:0 0 12px 6px;">${statCard("Highest correct", `${stats.highestCorrect} / ${stats.totalQuestions}`, "top score")}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 32px 0;">
                    <div style="border:2px solid #1a1240;border-radius:14px;background:#fff8d6;padding:14px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#5c5679;">Average accuracy</td>
                          <td align="right" style="font-size:18px;font-weight:800;color:#1a1240;">${stats.averagePercentage}%</td>
                        </tr>
                      </table>
                      <div style="margin-top:10px;height:10px;border:1px solid #1a1240;border-radius:999px;background:#e8e0ff;overflow:hidden;">
                        <div style="width:${accuracyWidth}%;height:10px;background-color:#6a3df0;"></div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 0;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#5c5679;">Registration columns in the sheet</p>
                    <div>${fieldsChips}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 0;">
                    <div style="border:2px solid #1a1240;border-radius:16px;background:#ffd23f;padding:16px 18px;box-shadow:3px 3px 0 #1a1240;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="52" valign="top">
                            <div style="width:44px;height:44px;border:2px solid #1a1240;border-radius:12px;background:#ffffff;text-align:center;font-size:10px;font-weight:800;line-height:44px;letter-spacing:0.5px;color:#1a1240;">XLSX</div>
                          </td>
                          <td valign="top" style="padding-left:14px;">
                            <p style="margin:0;font-size:15px;font-weight:800;color:#1a1240;">Responses report attached</p>
                            <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#4a4366;">${escapeHtml(filename)}</p>
                            <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#4a4366;">All responses, registration answers, and question counts.</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 32px 30px;">
                    <p style="margin:24px 0 0;padding-top:20px;border-top:2px solid #e0dbf5;font-size:12px;line-height:1.6;color:#5c5679;">Sent automatically from <strong style="color:#1a1240;">QuizSupport</strong> after your quiz results were calculated.</p>
                    <p style="margin:10px 0 0;font-size:12px;color:#8b84a8;">QuizSupport Creator Studio</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  try {
    const { transporter, from } = requireTransport();
    const info = await transporter.sendMail({
      from: `QuizSupport <${from}>`,
      to,
      subject,
      html: htmlBody,
      attachments: [{ filename, content: responsesBuffer, contentType }],
    });
    logger.info(`Responses report email sent to ${to} for quiz ${quizCode}: ${info.messageId}`);
    return;
  } catch (smtpError) {
    logger.error(`SMTP responses report to ${to} for quiz ${quizCode} failed, trying Resend fallback:`, smtpError);
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
        attachments: [{ filename, content: responsesBuffer, contentType }],
      });
      logger.info(`Responses report email sent via Resend to ${to} for quiz ${quizCode}`);
    } catch (resendError) {
      logger.error(`Resend responses report fallback to ${to} also failed:`, resendError);
      throw new Error(
        `Failed to send email: ${resendError instanceof Error ? resendError.message : String(resendError)}`
      );
    }
  }
}
