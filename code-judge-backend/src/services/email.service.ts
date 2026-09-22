// Marksheet email service. Sends a formatted email to the quiz creator with the
// generated marksheet Excel file as an attachment and quiz statistics.
// Migrated from Nodemailer/SMTP to Resend SDK for Vercel serverless.
import { Resend } from "resend";
import logger from "../utils/logger.ts";

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

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is missing. Set it in .env and Vercel Dashboard.");
  }
  return new Resend(key);
}

function getFrom(): string {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

/**
 * Send marksheet email to quiz creator via Resend
 */
export async function sendMarksheetEmail(payload: MarksheetEmailPayload): Promise<void> {
  const { to, quizName, quizCode, endTime, marksheetBuffer, stats } = payload;

  // Validate Resend configuration
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Email configuration is incomplete. Please set RESEND_API_KEY and RESEND_FROM_EMAIL environment variables.");
  }

  const resend = getResend();
  const fromEmail = getFrom();

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

  // Send email via Resend with attachment (base64)
  try {
    const { data, error } = await resend.emails.send({
      from: `Quiz System <${fromEmail}>`,
      to,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: `marksheet_${quizCode}_${new Date().toISOString().split("T")[0]}.xlsx`,
          content: marksheetBuffer.toString("base64"),
        },
      ],
    });

    if (error) {
      if ((error as any).statusCode === 401 || String(error.message).toLowerCase().includes("api key")) {
        logger.error("Resend API key is missing or invalid. Check RESEND_API_KEY env var.");
      }
      logger.error(`Failed to send marksheet email to ${to} for quiz ${quizCode}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    logger.info(`Marksheet email sent to ${to} for quiz ${quizCode}: ${data?.id}`);
  } catch (error) {
    logger.error(`Failed to send marksheet email to ${to} for quiz ${quizCode}:`, error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
  }
}
