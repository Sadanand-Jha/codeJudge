/**
 * Utility functions for handling time operations in IST (Indian Standard Time)
 */

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
