import {
  getCurrentISTTime,
  getTimeDifferenceInMinutes,
  getTimeDifferenceInHours,
} from "../utils/timeUtils.ts";
import generateOtp from "./otpGenerator.ts";
import {
  OTP_EXPIRY_MINUTES,
  OTP_REQUEST_THRESHOLD_MINUTES,
  OTP_FREEZE_DURATION_HOURS,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_ATTEMPTS_ADMIN,
  OTP_EMAIL_SUBJECT,
  OTP_EMAIL_SENDER_NAME,
  OTP_LENGTH,
  OTP_NUMERIC_ONLY,
  OTP_INCLUDE_SYMBOLS,
  OTP_MAX_VERIFY_ATTEMPTS
} from "../constants/otpConstants.ts";
import sendEmail from "./email.ts";
export interface OTPResult {
  success: boolean;
  message: string;
  shouldSendOTP?: boolean;
  attemptCount?: number;
}
import {userRepository} from "../repositories/user.repository.ts";
/**
 * OTP Service Implementation
 * Handles OTP generation and sending for both Users and Admins
 * User OTP: Has restrictions based on attempt count and timing
 * Admin OTP: No restrictions, simpler logic for admin authentication
 */
export class OTPService {
  // ===== USER OTP METHODS (With Restrictions) =====

  /**
   * Handle User OTP request with restrictions (renamed from handleOTPRequest)
   * @param rollNumber - User's roll number
   * @param email - User's email
   * @param userName - User's name for email
   * @returns OTPResult indicating success/failure and next steps
   */
  static async handleUserOTPRequest(
    userName: string
  ): Promise<OTPResult> {
    try {
      // Find existing OTP record
      const existingOTP = await userRepository.findLatestOTP(
        userName
      );
      const currentTime = getCurrentISTTime();

      // Case 1: No existing OTP (first time trying to verify)
      if (!existingOTP || !existingOTP.createdat) {
        return await this.sendUpdatedOTP(
  
          userName,
          3,
          currentTime
        );
      }

      const otpCreatedAt = new Date(existingOTP.createdat);
      const timeDifferenceMinutes = getTimeDifferenceInMinutes(
        otpCreatedAt,
        currentTime
      );
      const timeDifferenceHours = getTimeDifferenceInHours(
        otpCreatedAt,
        currentTime
      );
      const currentAttempt = existingOTP.attempt || 0;

      // Case 2: attempt == 0 (frozen state)
      if (currentAttempt === 0) {
        // Check if 1 hour has passed since freeze
        if (timeDifferenceHours >= OTP_FREEZE_DURATION_HOURS) {
          // Reset attempts and send OTP
          return await this.sendUpdatedOTP(
            userName,
            3,
            currentTime
          );
        } else {
          // Still frozen
          return {
            success: false,
            message: "Too many attempts. Please try after some time.",
          };
        }
      }

      // Case 3: Less than 5 minutes since last OTP
      if (timeDifferenceMinutes < OTP_REQUEST_THRESHOLD_MINUTES) {
        // Decrease attempt count and send new OTP
        return await this.sendUpdatedOTP(
          userName,
          currentAttempt,
          currentTime
        );
      }

      // Case 4: 5 minutes or more have passed
      if (timeDifferenceMinutes >= OTP_REQUEST_THRESHOLD_MINUTES) {
        // Reset attempts to 3 and send new OTP
        return await this.sendUpdatedOTP(
          userName,
          3,
          currentTime
        );
      }

      // Fallback case
      return {
        success: false,
        message: "Unable to process OTP request. Please try again.",
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
   * Send a new OTP (create new record or update existing)
   */
  private static async sendUpdatedOTP(
    userName: string,
    attemptCount: number,
    currentTime: Date
  ): Promise<OTPResult> {
  try {
      const otp = parseInt(generateOtp(6, true, false));

      const email = await userRepository.getEmailByUsername(userName);

      if(email == null) {
        return {
          success: false,
          message: "Email not found for the given username.",
        };
      }

      // Create or update OTP record (preserves time records)
      await userRepository.createOrUpdateOTP(
        userName,
        otp.toString(),
        attemptCount - 1,
        currentTime,
        OTP_MAX_VERIFY_ATTEMPTS
      ); 
      
      
      // Send email
      await sendEmail(
        email,
        OTP_EMAIL_SUBJECT,
        `Hello ${userName},\n\nYour OTP for email verification is: ${otp}\n\nThis OTP will expire in ${OTP_EXPIRY_MINUTES} minutes.\nRemaining attempts: ${
          attemptCount - 1
        }\n\nIf you did not request this, please ignore this email.\n\nThanks,\n${OTP_EMAIL_SENDER_NAME}`
      );

      return {
        success: true,
        message: `OTP sent to your registered email address. Remaining attempts: ${
          attemptCount - 1
        }`,
        shouldSendOTP: true,
      };
    } catch (error) {
      console.error("Error sending new OTP:", error);
      throw error;
    }
  }
}
