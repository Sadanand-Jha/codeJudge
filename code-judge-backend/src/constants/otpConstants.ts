/**
 * OTP-related constants for the application
 * Centralized configuration for OTP timing and behavior
 */

// Time durations in minutes
export const OTP_EXPIRY_MINUTES = 3;
export const OTP_EXPIRY_MINUTES_ON_SET_PASSWORD = 6;
export const OTP_REQUEST_THRESHOLD_MINUTES = 5;
export const OTP_FREEZE_DURATION_HOURS = 1;

// Attempt limits
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_MAX_VERIFY_ATTEMPTS = 3;
export const OTP_MAX_ATTEMPTS_ADMIN = 5;
export const OTP_FROZEN_ATTEMPTS = 0;

// Email template constants
export const OTP_EMAIL_SUBJECT = "Email Verification - DSEU Portal";
export const OTP_EMAIL_SENDER_NAME = "DSEU Team";

// OTP generation settings
export const OTP_LENGTH = 6;
export const OTP_NUMERIC_ONLY = true;
export const OTP_INCLUDE_SYMBOLS = false;
