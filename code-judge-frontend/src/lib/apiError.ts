import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{
    message?: string;
    error?: string;
    code?: string;
    data?: { message?: string; code?: string };
  }>(error)) {
    const payload = error.response?.data;
    const message = payload?.message || payload?.data?.message || payload?.error;
    if (message) return message;

    const code = payload?.code || payload?.data?.code;
    if (code === "ACCOUNT_NOT_FOUND" || error.response?.status === 404) {
      return "You aren't registered yet. Please create an account first.";
    }
    if (code === "INVALID_PASSWORD" || error.response?.status === 401) {
      return "Incorrect password. Please try again.";
    }
    if (error.response?.status === 429) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (!error.response) {
      return "Unable to reach the server. Please check your connection and try again.";
    }
    return fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
