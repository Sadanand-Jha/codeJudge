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

export async function forgotPassword(email: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/forgot-password", { email });
  if (response.data && typeof response.data === "object" && "success" in response.data) {
    return response.data as AuthResponse;
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
