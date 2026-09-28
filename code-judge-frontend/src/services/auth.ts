import apiClient from "@/lib/axios";
import type {
  SendOtpPayload,
  VerifyOtpPayload,
  SetUsernamePayload,
  AuthResponse,
  CheckUsernameResponse,
} from "@/types/auth";

export interface VerifyOtpResponse extends AuthResponse {
  data?: {
    registration_token: string;
    email: string;
  };
}

export async function sendOtp(payload: SendOtpPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/send-otp", payload);
  // The axios interceptor unwraps { success, data } → data,
  // so response.data may be just { email } on success.
  // Reconstruct AuthResponse for consistent handling.
  if (response.data && typeof response.data === "object" && "email" in response.data && !("success" in response.data)) {
    return { success: true, message: "OTP sent successfully", data: response.data };
  }
  return response.data;
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  const response = await apiClient.post<VerifyOtpResponse>("/auth/verify-otp", payload);
  if (response.data && typeof response.data === "object" && "registration_token" in response.data && !("success" in response.data)) {
    return { success: true, message: "OTP verified successfully", data: response.data };
  }
  return response.data;
}

export async function checkUsername(username: string): Promise<CheckUsernameResponse> {
  const response = await apiClient.get<CheckUsernameResponse>("/auth/check-username", {
    params: { username },
  });
  return response.data;
}

export async function setUsername(payload: SetUsernamePayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/set-username", payload);
  return response.data;
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login", payload);
  if (response.data && typeof response.data === "object" && "user" in response.data && !("success" in response.data)) {
    return { success: true, message: "Login successful", data: response.data };
  }
  return response.data;
}

export async function me(): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/me");
  if (response.data && typeof response.data === "object" && "user" in response.data && !("success" in response.data)) {
    return { success: true, message: "Authenticated", data: response.data };
  }
  return response.data;
}

export async function updatePreferences(payload: { theme?: "dark" | "light" }): Promise<AuthResponse> {
  const response = await apiClient.put<AuthResponse>("/user/preferences", payload);
  if (response.data && typeof response.data === "object" && "success" in response.data) {
    return response.data as AuthResponse;
  }
  return response.data;
}

export async function register(payload: {
  username?: string;
  email: string;
  password: string;
  registration_token?: string;
}): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/register", payload);
  if (response.data && typeof response.data === "object" && "user" in response.data && !("success" in response.data)) {
    return { success: true, message: "Registration successful", data: response.data };
  }
  return response.data;
}

export interface VerifyResetOtpResponse extends AuthResponse {
  data?: {
    reset_token: string;
    email: string;
  };
}

export async function requestPasswordReset(payload: { email: string }): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/forgot-password", payload);
  if (response.data && typeof response.data === "object" && "email" in response.data && !("success" in response.data)) {
    return { success: true, message: "OTP sent successfully", data: response.data };
  }
  return response.data;
}

export async function verifyResetOtp(payload: VerifyOtpPayload): Promise<VerifyResetOtpResponse> {
  const response = await apiClient.post<VerifyResetOtpResponse>("/auth/verify-reset-otp", payload);
  if (response.data && typeof response.data === "object" && "reset_token" in response.data && !("success" in response.data)) {
    return { success: true, message: "OTP verified successfully", data: response.data };
  }
  return response.data;
}

export async function resetPassword(payload: {
  email: string;
  password: string;
  reset_token: string;
}): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/reset-password", payload);
  // The axios interceptor unwraps { success, data } → data on success,
  // so response.data may be just { email }. Reconstruct AuthResponse for
  // consistent handling (same as requestPasswordReset above) — otherwise
  // `res.success` is undefined and the UI reports failure even when the
  // backend succeeded (and a retry then 401s on the consumed single-use token).
  if (response.data && typeof response.data === "object" && "email" in response.data && !("success" in response.data)) {
    return { success: true, message: "Password reset successfully", data: response.data };
  }
  return response.data;
}

export async function logout(): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/logout");
  if (response.data && typeof response.data === "object" && "success" in response.data) {
    return response.data as AuthResponse;
  }
  return response.data;
}

// ── Owner OTP login (private /platform control center only) ──
// Only role_id = 2 accounts receive/verify codes. Password login is never
// accepted on /platform — the gate below is the single entry point.

export async function ownerSendOtp(payload: { email: string }): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/owner/send-otp", payload);
  if (response.data && typeof response.data === "object" && "email" in response.data && !("success" in response.data)) {
    return { success: true, message: "OTP sent successfully", data: response.data };
  }
  return response.data;
}

export async function ownerVerifyOtp(payload: { email: string; otp: string }): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/owner/verify-otp", payload);
  if (response.data && typeof response.data === "object" && "user" in response.data && !("success" in response.data)) {
    return { success: true, message: "Owner login successful", data: response.data };
  }
  return response.data;
}

export async function ownerLogout(): Promise<void> {
  // Revokes the cookie-only platform session server-side.
  try {
    await apiClient.post("/auth/owner/logout", {});
  } catch {
    // Revocation is best-effort; local platform credentials are cleared anyway.
  }
}
