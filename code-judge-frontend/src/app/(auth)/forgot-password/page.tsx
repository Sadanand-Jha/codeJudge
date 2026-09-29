"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { QuizLoader } from "@/components/quiz/live/StudentQuizShell";
import { toast } from "@/lib/toast";
import { requestPasswordReset, verifyResetOtp, resetPassword } from "@/services/auth";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateOtp,
} from "@/lib/validators";
import AuthBackground from "@/components/auth/AuthBackground";
import { AuthBrandMark, AuthThemeControls } from "@/components/auth/AuthThemeChrome";

const AUTH_PRIMARY_BUTTON = "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(244,114,182,.8)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 dark:from-violet-600 dark:via-indigo-500 dark:to-blue-600 dark:shadow-[0_12px_28px_-16px_rgba(124,92,255,.8)]";

type Step = "email" | "verify" | "reset";

interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
}

function initField(value = ""): FieldState {
  return { value, error: null, touched: false };
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (err as { response?: unknown }).response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = (response as { data?: unknown }).data;
      if (typeof data === "object" && data !== null && "message" in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === "string" && message) return message;
      }
    }
  }
  return fallback;
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState<FieldState>(initField());
  const [otp, setOtp] = useState<FieldState>(initField());
  const [password, setPassword] = useState<FieldState>(initField());
  const [confirmPassword, setConfirmPassword] = useState<FieldState>(initField());

  const [resetToken, setResetToken] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    };
  }, []);

  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const emailErr = validateEmail(email.value);
      setEmail((prev) => ({ ...prev, error: emailErr }));
      if (emailErr) return;

      setSendingOtp(true);
      try {
        const res = await requestPasswordReset({ email: email.value });
        if (res.success) {
          toast.success(`OTP sent to ${email.value}`);
          setStep("verify");
          startCountdown();
        } else {
          toast.error(res.message || "Failed to send OTP");
        }
      } catch (err: unknown) {
        toast.error(apiErrorMessage(err, "Something went wrong"));
      } finally {
        setSendingOtp(false);
      }
    },
    [email.value, startCountdown]
  );

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;
    setSendingOtp(true);
    try {
      const res = await requestPasswordReset({ email: email.value });
      if (res.success) {
        toast.success(`OTP resent to ${email.value}`);
        startCountdown();
      } else {
        toast.error(res.message || "Failed to resend OTP");
      }
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Something went wrong"));
    } finally {
      setSendingOtp(false);
    }
  }, [countdown, email.value, startCountdown]);

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const otpErr = validateOtp(otp.value);
      setOtp((prev) => ({ ...prev, error: otpErr }));
      if (otpErr) return;

      setVerifyingOtp(true);
      try {
        const res = await verifyResetOtp({
          email: email.value,
          otp: otp.value,
        });
        if (res.success && res.data?.reset_token) {
          setResetToken(res.data.reset_token);
          toast.success("OTP verified");
          setStep("reset");
        } else {
          toast.error(res.message || "Failed to verify OTP");
        }
      } catch (err: unknown) {
        toast.error(apiErrorMessage(err, "Something went wrong"));
      } finally {
        setVerifyingOtp(false);
      }
    },
    [email.value, otp.value]
  );

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const passErr = validatePassword(password.value);
      const confirmErr = validateConfirmPassword(password.value, confirmPassword.value);
      setPassword((prev) => ({ ...prev, error: passErr }));
      setConfirmPassword((prev) => ({ ...prev, error: confirmErr }));
      if (passErr || confirmErr) return;

      setSubmitting(true);
      try {
        const res = await resetPassword({
          email: email.value,
          password: password.value,
          reset_token: resetToken,
        });
        if (res.success) {
          toast.success("Password reset successfully! Please sign in.");
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          router.push("/login");
        } else {
          toast.error(res.message || "Password reset failed");
        }
      } catch (err: unknown) {
        toast.error(apiErrorMessage(err, "Something went wrong"));
      } finally {
        setSubmitting(false);
      }
    },
    [email.value, password.value, confirmPassword.value, resetToken, router]
  );

  const isResetEnabled =
    password.value.length >= 8 &&
    confirmPassword.value.length >= 1 &&
    password.value === confirmPassword.value &&
    !submitting;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FFF9F1] px-6 py-20 dark:bg-[#050510]">
      <AuthBackground />
      <AuthThemeControls />
      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <AuthBrandMark className="mb-4" />
          <h1 className="text-xl font-bold text-text-primary">
            {step === "email" && "Reset your password"}
            {step === "verify" && "Check your email"}
            {step === "reset" && "Set a new password"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {step === "email" && "Enter your account email to get started"}
            {step === "verify" && `We sent a code to ${email.value}`}
            {step === "reset" && "Choose a strong new password"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[28px] border border-pink-200/80 bg-white/82 p-6 shadow-[0_30px_80px_-42px_rgba(244,114,182,.75)] backdrop-blur-2xl dark:border-violet-300/15 dark:bg-[#0E1323]/88 dark:shadow-[0_30px_90px_-40px_rgba(91,69,196,.8)]">
          {/* Step 1: Email */}
          {step === "email" && (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <input
                  type="email"
                  value={email.value}
                  onChange={(e) =>
                    setEmail({ value: e.target.value, error: null, touched: true })
                  }
                  onBlur={() =>
                    setEmail((prev) => ({ ...prev, error: validateEmail(prev.value) }))
                  }
                  className={`w-full rounded-xl bg-input-bg border px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                    email.touched && email.error
                      ? "border-red-500"
                      : email.touched && !email.error
                      ? "border-green-500"
                      : "border-input-border"
                  }`}
                  placeholder="you@example.com"
                />
                {email.touched && email.error && (
                  <p className="mt-2 text-xs text-red-400">{email.error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={sendingOtp}
                className={AUTH_PRIMARY_BUTTON}
              >
                {sendingOtp && <QuizLoader className="h-4 w-4 text-white" />}
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
                  value={otp.value}
                  onChange={(e) =>
                    setOtp({ value: e.target.value.replace(/\D/g, ""), error: null, touched: true })
                  }
                  onBlur={() =>
                    setOtp((prev) => ({ ...prev, error: validateOtp(prev.value) }))
                  }
                  className={`w-full rounded-xl bg-input-border/50 border px-4 py-3.5 text-lg text-text-primary text-center tracking-[0.4em] placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                    otp.touched && otp.error ? "border-red-500" : "border-input-border"
                  }`}
                  placeholder="------"
                />
                {otp.touched && otp.error && (
                  <p className="mt-2 text-xs text-red-400">{otp.error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={verifyingOtp || otp.value.length !== 6}
                className={AUTH_PRIMARY_BUTTON}
              >
                {verifyingOtp && <QuizLoader className="h-4 w-4 text-white" />}
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

          {/* Step 3: New password */}
          {step === "reset" && (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              {/* Password */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password.value}
                    onChange={(e) =>
                      setPassword({ value: e.target.value, error: null, touched: true })
                    }
                    onBlur={() =>
                      setPassword((prev) => ({ ...prev, error: validatePassword(prev.value) }))
                    }
                    className={`w-full rounded-xl bg-input-bg border px-4 py-3 pr-11 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                      password.touched && password.error
                        ? "border-red-500"
                        : "border-input-border"
                    }`}
                    placeholder="New password"
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
                {password.touched && password.error && (
                  <p className="mt-2 text-xs text-red-400">{password.error}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword.value}
                    onChange={(e) =>
                      setConfirmPassword({ value: e.target.value, error: null, touched: true })
                    }
                    onBlur={() =>
                      setConfirmPassword((prev) => ({
                        ...prev,
                        error: validateConfirmPassword(password.value, prev.value),
                      }))
                    }
                    className={`w-full rounded-xl bg-input-bg border px-4 py-3 pr-11 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                      confirmPassword.touched && confirmPassword.error
                        ? "border-red-500"
                        : confirmPassword.touched &&
                          !confirmPassword.error &&
                          confirmPassword.value
                        ? "border-green-500"
                        : "border-input-border"
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-text-muted hover:bg-black/5 hover:text-text-primary transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPassword.touched && confirmPassword.error && (
                  <p className="mt-2 text-xs text-red-400">{confirmPassword.error}</p>
                )}
                {confirmPassword.touched &&
                  !confirmPassword.error &&
                  confirmPassword.value && (
                    <p className="mt-2 text-xs text-green-400">Passwords match</p>
                  )}
              </div>

              <button
                type="submit"
                disabled={!isResetEnabled}
                className={`${AUTH_PRIMARY_BUTTON} mt-1`}
              >
                {submitting && <QuizLoader className="h-4 w-4 text-white" />}
                {submitting ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Remember your password?{" "}
          <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
