// OTP service. Generates OTPs, stores them in Redis with a 5-minute TTL, and
// triggers email delivery via the email service.
import generateOtp from "./otpGenerator.js";
import { sendEmail } from "./email.js";
import redisClient from "../config/redis.js";
import { userRepository } from "../repositories/user.repository.js";

const userRepo = new userRepository();

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_EMAIL_SUBJECT = "Email Verification - byteclash";
const OTP_EMAIL_SENDER_NAME = "byteclash Team";

export interface OTPResult {
  success: boolean;
  message: string;
}

export class OTPService {
  /**
   * Generate an OTP, store it in Redis with key "otp:<email>" and TTL 5 minutes,
   * then send it via email.
   */
  static async handleUserOTPRequest(userName: string): Promise<OTPResult> {
    try {
      const email = await userRepo.getEmailByUsername(userName);

      if (!email) {
        return {
          success: false,
          message: "Email not found for the given username.",
        };
      }

      const otp = generateOtp(6, true, false);

      // Store OTP in Redis with 5-minute TTL
      await redisClient.setEx(`otp:${email}`, OTP_TTL_SECONDS, otp);

      // Send email
      await sendEmail({
        to: email,
        subject: OTP_EMAIL_SUBJECT,
        text: `Hello ${userName},\n\nYour OTP for email verification is: ${otp}\n\nThis OTP will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nThanks,\n${OTP_EMAIL_SENDER_NAME}`,
      });

      return {
        success: true,
        message: "OTP sent to your registered email address.",
      };
    } catch (error) {
      console.error("Error in OTP handling:", error);
      return {
        success: false,
        message: "Internal server error while processing OTP request",
      };
    }
  }

  /**
   * Verify an OTP for a given email.
   * Returns true if the OTP matches, false otherwise.
   */
  static async verifyOTP(email: string, otp: string): Promise<boolean> {
    const storedOtp = await redisClient.get(`otp:${email}`);
    if (!storedOtp) {
      return false; // OTP expired or never requested
    }
    return storedOtp === otp;
  }

  /**
   * Delete an OTP from Redis (e.g., after successful verification).
   */
  static async deleteOTP(email: string): Promise<void> {
    await redisClient.del(`otp:${email}`);
  }
}