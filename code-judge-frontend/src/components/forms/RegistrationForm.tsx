"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "@/lib/toast";
import { sendOtp, verifyOtp, register, checkUsername } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateOtp,
  validateUsername,
} from "@/lib/validators";
import AuthBackground from "@/components/auth/AuthBackground";

type Step = "email" | "verify" | "register";

interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
}

interface FormState {
  email: FieldState;
  otp: FieldState;
  username: FieldState;
  password: FieldState;
  confirmPassword: FieldState;
}

function initField(value = ""): FieldState {
  return { value, error: null, touched: false };
}

export default function RegistrationForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState<FormState>({
    email: initField(),
    otp: initField(),
    username: initField(),
    password: initField(),
    confirmPassword: initField(),
  });

  const [registrationToken, setRegistrationToken] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: "" });

  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Must stay in sync with backend OTP_RESEND_COOLDOWN_SECONDS (60s) in code-judge-backend/src/services/auth.ts
  const RESEND_COOLDOWN_SECONDS = 60;

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    };
  }, []);

  const updateField = useCallback(
    (name: keyof FormState, value: string) => {
      setForm((prev) => ({
        ...prev,
        [name]: { ...prev[name], value, error: null, touched: true },
      }));
    },
    []
  );

  const validateEmailField = useCallback(
    (email: string): string | null => {
      const err = validateEmail(email);
      setForm((prev) => ({
        ...prev,
        email: { ...prev.email, error: err },
      }));
      return err;
    },
    []
  );

  const validateOtpField = useCallback(
    (otp: string): string | null => {
      const err = validateOtp(otp);
      setForm((prev) => ({
        ...prev,
        otp: { ...prev.otp, error: err },
      }));
      return err;
    },
    []
  );

  const validateUsernameField = useCallback(
    (username: string): string | null => {
      const err = validateUsername(username);
      setForm((prev) => ({
        ...prev,
        username: { ...prev.username, error: err },
      }));
      return err;
    },
    []
  );

  const validatePasswordField = useCallback(
    (password: string): string | null => {
      const err = validatePassword(password);
      setForm((prev) => ({
        ...prev,
        password: { ...prev.password, error: err },
      }));
      return err;
    },
    []
  );

  const validateConfirmPasswordField = useCallback(
    (confirmPassword: string): string | null => {
      const err = validateConfirmPassword(form.password.value, confirmPassword);
      setForm((prev) => ({
        ...prev,
        confirmPassword: { ...prev.confirmPassword, error: err },
      }));
      return err;
    },
    [form.password.value]
  );

  const handleUsernameChange = useCallback(
    (value: string) => {
      updateField("username", value);

      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
      }

      const validationErr = validateUsername(value);
      if (validationErr) {
        setUsernameStatus({ checking: false, available: null, message: "" });
        return;
      }

      setUsernameStatus({ checking: true, available: null, message: "" });

      usernameDebounceRef.current = setTimeout(async () => {
        try {
          const res = await checkUsername(value);
          setUsernameStatus({
            checking: false,
            available: res.available,
            message: res.message,
          });
        } catch {
          setUsernameStatus({
            checking: false,
            available: null,
            message: "",
          });
        }
      }, 500);
    },
    [updateField]
  );

  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const emailErr = validateEmailField(form.email.value);
      if (emailErr) return;

      setSendingOtp(true);
      try {
        const res = await sendOtp({ email: form.email.value });
        if (res.success) {
          toast.success(`OTP sent to ${form.email.value}`);
          setStep("verify");
          startCountdown();
        } else {
          toast.error(res.message || "Failed to send OTP");
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Something went wrong");
      } finally {
        setSendingOtp(false);
      }
    },
    [form.email.value, validateEmailField, startCountdown]
  );

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;
    setSendingOtp(true);
    try {
      const res = await sendOtp({ email: form.email.value });
      if (res.success) {
        toast.success(`OTP resent to ${form.email.value}`);
        startCountdown();
      } else {
        toast.error(res.message || "Failed to resend OTP");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    } finally {
      setSendingOtp(false);
    }
  }, [countdown, form.email.value, startCountdown]);

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const otpErr = validateOtpField(form.otp.value);
      if (otpErr) return;

      setVerifyingOtp(true);
      try {
        const res = await verifyOtp({
          email: form.email.value,
          otp: form.otp.value,
        });
        if (res.success && res.data?.registration_token) {
          setRegistrationToken(res.data.registration_token);
          toast.success("OTP verified");
          setStep("register");
        } else {
          toast.error(res.message || "Failed to verify OTP");
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Something went wrong");
      } finally {
        setVerifyingOtp(false);
      }
    },
    [form.email.value, form.otp.value, validateOtpField]
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const usernameErr = validateUsernameField(form.username.value);
      const passErr = validatePasswordField(form.password.value);
      const confirmErr = validateConfirmPasswordField(form.confirmPassword.value);
      if (usernameErr || passErr || confirmErr) return;

      if (usernameStatus.available === false) {
        toast.error("Username is already taken");
        return;
      }

      setSubmitting(true);
      try {
        const res = await register({
          username: form.username.value,
          email: form.email.value,
          password: form.password.value,
          registration_token: registrationToken,
        });
        if (res.success) {
          toast.success("Account created successfully!");
          const token = res.data?.token as string | undefined;
          const user = res.data?.user as { id: string; email: string; username?: string } | undefined;
          if (token && user) setAuth(token, user);
          setForm({ email: initField(), otp: initField(), username: initField(), password: initField(), confirmPassword: initField() });
          setRegistrationToken("");
          setStep("email");
          setCountdown(0);
          setUsernameStatus({ checking: false, available: null, message: "" });
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          router.push("/login");
        } else {
          toast.error(res.message || "Registration failed");
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Something went wrong");
      } finally {
        setSubmitting(false);
      }
    },
    [form.username.value, form.email.value, form.password.value, form.confirmPassword.value, registrationToken, usernameStatus.available, validateUsernameField, validatePasswordField, validateConfirmPasswordField]
  );

  const isRegisterEnabled =
    form.username.value.length >= 3 &&
    form.password.value.length >= 8 &&
    form.confirmPassword.value.length >= 1 &&
    form.password.value === form.confirmPassword.value &&
    usernameStatus.available === true &&
    !submitting;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <AuthBackground />
      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-base font-semibold text-text-primary tracking-tight">ByteClash</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary">
            {step === "email" && "Create your account"}
            {step === "verify" && "Check your email"}
            {step === "register" && "Set your details"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {step === "email" && "Enter your email to get started"}
            {step === "verify" && `We sent a code to ${form.email.value}`}
            {step === "register" && "Almost done, secure your account"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6">
          {/* Step 1: Email */}
          {step === "email" && (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <input
                  type="email"
                  value={form.email.value}
                  onChange={(e) => updateField("email", e.target.value)}
                  onBlur={() => validateEmailField(form.email.value)}
                  className={`w-full rounded-xl bg-input-bg border px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                    form.email.touched && form.email.error
                      ? "border-red-500"
                      : form.email.touched && !form.email.error
                      ? "border-green-500"
                      : "border-input-border"
                  }`}
                  placeholder="you@example.com"
                />
                {form.email.touched && form.email.error && (
                  <p className="mt-2 text-xs text-red-400">{form.email.error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={sendingOtp}
                className="w-full py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-accent to-accent-secondary hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingOtp && <Loader2 className="w-4 h-4 animate-spin" />}
                {sendingOtp ? "Sending..." : "Continue"}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === "verify" && (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.otp.value}
                  onChange={(e) => updateField("otp", e.target.value.replace(/\D/g, ""))}
                  onBlur={() => validateOtpField(form.otp.value)}
                  className={`w-full rounded-xl bg-input-border/50 border px-4 py-3.5 text-lg text-text-primary text-center tracking-[0.4em] placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                    form.otp.touched && form.otp.error
                      ? "border-red-500"
                      : "border-input-border"
                  }`}
                  placeholder="------"
                />
                {form.otp.touched && form.otp.error && (
                  <p className="mt-2 text-xs text-red-400">{form.otp.error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={verifyingOtp || form.otp.value.length !== 6}
                className="w-full py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-accent to-accent-secondary hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifyingOtp && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyingOtp ? "Verifying..." : "Verify"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  disabled={countdown > 0 || sendingOtp}
                  onClick={handleResendOtp}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors disabled:text-text-muted/50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Username + Password */}
          {step === "register" && (
            <form className="space-y-4" onSubmit={handleRegister}>
              {/* Username */}
              <div>
                <input
                  type="text"
                  value={form.username.value}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  onBlur={() => {
                    const err = validateUsernameField(form.username.value);
                    if (!err && form.username.value) {
                      setUsernameStatus((prev) => ({ ...prev, checking: true }));
                      checkUsername(form.username.value).then((res) => {
                        setUsernameStatus({
                          checking: false,
                          available: res.available,
                          message: res.message,
                        });
                      });
                    }
                  }}
                  className={`w-full rounded-xl bg-input-bg border px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                    form.username.touched && form.username.error
                      ? "border-red-500"
                      : form.username.touched && !form.username.error && usernameStatus.available === false
                      ? "border-red-500"
                      : form.username.touched && !form.username.error && usernameStatus.available === true
                      ? "border-green-500"
                      : "border-input-border"
                  }`}
                  placeholder="Choose a username"
                />
                {form.username.touched && form.username.error && (
                  <p className="mt-2 text-xs text-red-400">{form.username.error}</p>
                )}
                {!form.username.error && usernameStatus.checking && (
                  <p className="mt-2 text-xs text-text-muted flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                  </p>
                )}
                {!form.username.error && !usernameStatus.checking && usernameStatus.available === false && (
                  <p className="mt-2 text-xs text-red-400">{usernameStatus.message}</p>
                )}
                {!form.username.error && !usernameStatus.checking && usernameStatus.available === true && (
                  <p className="mt-2 text-xs text-green-400">{usernameStatus.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password.value}
                    onChange={(e) => updateField("password", e.target.value)}
                    onBlur={() => validatePasswordField(form.password.value)}
                    className={`w-full rounded-xl bg-input-bg border px-4 py-3 pr-11 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                      form.password.touched && form.password.error
                        ? "border-red-500"
                        : "border-input-border"
                    }`}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-text-muted hover:bg-black/5 hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.password.touched && form.password.error && (
                  <p className="mt-2 text-xs text-red-400">{form.password.error}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword.value}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    onBlur={() => validateConfirmPasswordField(form.confirmPassword.value)}
                    className={`w-full rounded-xl bg-input-bg border px-4 py-3 pr-11 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                      form.confirmPassword.touched && form.confirmPassword.error
                        ? "border-red-500"
                        : form.confirmPassword.touched && !form.confirmPassword.error && form.confirmPassword.value
                        ? "border-green-500"
                        : "border-input-border"
                    }`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-text-muted hover:bg-black/5 hover:text-text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.confirmPassword.touched && form.confirmPassword.error && (
                  <p className="mt-2 text-xs text-red-400">{form.confirmPassword.error}</p>
                )}
                {form.confirmPassword.touched && !form.confirmPassword.error && form.confirmPassword.value && (
                  <p className="mt-2 text-xs text-green-400">Passwords match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isRegisterEnabled}
                className="w-full py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-accent to-accent-secondary hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Creating..." : "Create account"}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
