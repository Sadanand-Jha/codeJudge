import nodemailer from "nodemailer";
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

/**
 * Send marksheet email to quiz creator
 */
export async function sendMarksheetEmail(payload: MarksheetEmailPayload): Promise<void> {
  const { to, quizName, quizCode, endTime, marksheetBuffer, stats } = payload;

  // Validate environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.FROM_EMAIL || smtpUser;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error("Email configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.");
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

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

  // Email options
  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Quiz System" <${fromEmail}>`,
    to: to,
    subject: subject,
    html: htmlBody,
    attachments: [
      {
        filename: `marksheet_${quizCode}_${new Date().toISOString().split('T')[0]}.xlsx`,
        content: marksheetBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  };

  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Marksheet email sent to ${to} for quiz ${quizCode}: ${info.messageId}`);
  } catch (error) {
    logger.error(`Failed to send marksheet email to ${to} for quiz ${quizCode}:`, error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
  }
}