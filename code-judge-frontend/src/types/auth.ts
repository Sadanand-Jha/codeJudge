export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SendOtpPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface SetUsernamePayload {
  email: string;
  username: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

export interface CheckUsernameResponse {
  success: boolean;
  available: boolean;
  message: string;
}