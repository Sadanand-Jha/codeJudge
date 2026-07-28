import nodemailer from "nodemailer";

/**
 * Sends an email using Gmail SMTP with App Password authentication
 * Minimal implementation for OTP sending only
 * 
 * @param email - Recipient email address
 * @param subject - Email subject line
 * @param message - Email message content (plain text)
 * @returns Promise with email send information from Nodemailer
 */
const sendEmail = async (
  email: string,
  subject: string,
  message: string,
) => {
  const EMAIL = process.env.EMAIL;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  const GMAIL_APP_NAME = process.env.GMAIL_APP_NAME;

  if (!EMAIL || !GMAIL_APP_PASSWORD) {
    throw new Error(
      "Email configuration is incomplete. Required: EMAIL, GMAIL_APP_PASSWORD"
    );
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: EMAIL,
      pass: GMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const info = await transporter.sendMail({
    from: `"${GMAIL_APP_NAME || "CodeJudge"}" <${EMAIL}>`,
    to: email,
    subject: subject,
    text: message,
  });

  return info;
};

export { sendEmail };
export default sendEmail;