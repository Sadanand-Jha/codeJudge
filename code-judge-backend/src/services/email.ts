import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(options: EmailOptions): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${options.to}: ${info.messageId}`);
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}:`, error);
    throw error;
  }
}

/**
 * Sends OTP email asynchronously
 * This is meant to be fired-and-forgotten so the HTTP request doesn't block
 */
export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const subject = 'Your OTP for CodeJudge Registration';
  const text = `Your OTP for registration is: ${otp}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #333;">CodeJudge Registration</h2>
      <p style="font-size: 16px; color: #555;">Your One-Time Password (OTP) for registration is:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; margin: 20px 0;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #888;">This OTP is valid for 5 minutes. Do not share this code with anyone.</p>
      <p style="font-size: 14px; color: #888;">If you did not request this OTP, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #aaa;">CodeJudge Team</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}