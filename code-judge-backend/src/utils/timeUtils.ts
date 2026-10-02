/**
 * Utility functions for handling time operations in IST (Indian Standard Time)
 */

export const KOLKATA_TIMEZONE = "Asia/Kolkata";
export const KOLKATA_UTC_OFFSET = "+05:30";
const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Serialize an instant as an ISO-8601 Kolkata timestamp.
 *
 * `Date#toJSON()` always emits UTC (`Z`), even when Node and PostgreSQL are
 * configured for Asia/Kolkata. Shifting the display components and appending
 * the explicit +05:30 offset keeps the instant intact for API consumers while
 * making the intended timezone unambiguous.
 */
export const toKolkataISOString = (value: Date | string | number): string | null => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getTime() + KOLKATA_OFFSET_MS)
    .toISOString()
    .replace("Z", KOLKATA_UTC_OFFSET);
};

/**
 * Get current time in IST
 * @returns Date object in IST
 */
export const getCurrentISTTime = (): Date => {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + istOffset);
};

/**
 * Convert a date to IST
 * @param date - Date to convert
 * @returns Date object in IST
 */
export const toIST = (date: Date): Date => {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + istOffset);
};

/**
 * Get time difference in minutes between two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Difference in minutes
 */
export const getTimeDifferenceInMinutes = (date1: Date, date2: Date): number => {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60);
};

/**
 * Get time difference in hours between two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Difference in hours
 */
export const getTimeDifferenceInHours = (date1: Date, date2: Date): number => {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
};

/**
 * Check if a date is older than specified minutes
 * @param date - Date to check
 * @param minutes - Minutes to compare
 * @returns boolean
 */
export const isOlderThanMinutes = (date: Date, minutes: number): boolean => {
  const now = getCurrentISTTime();
  return getTimeDifferenceInMinutes(date, now) >= minutes;
};

/**
 * Check if a date is older than specified hours
 * @param date - Date to check
 * @param hours - Hours to compare
 * @returns boolean
 */
export const isOlderThanHours = (date: Date, hours: number): boolean => {
  const now = getCurrentISTTime();
  return getTimeDifferenceInHours(date, now) >= hours;
};
