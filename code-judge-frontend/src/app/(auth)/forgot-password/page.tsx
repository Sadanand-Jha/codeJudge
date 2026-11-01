"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Lock, LogIn, Mail, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/lib/toast";
import { requestPasswordReset, verifyResetOtp, resetPassword } from "@/services/auth";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateOtp,
} from "@/lib/validators";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthLoader, ResetSecurityShowcase } from "@/components/auth/AuthThemeChrome";
import { OtpInput } from "@/components/auth/OtpInput";

const AUTH_PRIMARY_BUTTON = "b b-pri b-lg b-full group min-h-12";

const INPUT_CLASS =
  "h-[50px] w-full rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] pl-11 pr-4 text-[15px] font-medium text-[var(--qs-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[#8b86a8] focus:border-[var(--qs-brand)] focus:ring-4 focus:ring-[var(--qs-brand)]/15";

const LABEL_CLASS =
  "mb-2 block text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]";

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

  const passwordsMatch =
    validatePassword(password.value) === null &&
    confirmPassword.value.length >= 8 &&
    password.value === confirmPassword.value;

  const isResetEnabled = passwordsMatch && !submitting;
  const stepNumber = step === "email" ? 1 : step === "verify" ? 2 : 3;
  const title =
    step === "email" ? (
      <>
        Reset your
        <br />
        password.
      </>
    ) : step === "verify" ? (
      <>
        Check your
        <br />
        email.
      </>
    ) : (
      <>
        Set a new
        <br />
        password.
      </>
    );
  const description =
    step === "email"
      ? "Enter your account email and we'll send a secure verification code."
      : step === "verify"
      ? `We sent a 6-digit code to ${email.value}.`
      : "Choose a strong password you haven't used before.";

  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title={title}
      description={description}
      showcase={<ResetSecurityShowcase />}
      align="center"
      stretchCard={false}
      fitViewport
      footer={
        <p className="text-xs text-[var(--qs-muted)]">
          Remember your password?{" "}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-bold text-[var(--qs-brand)] transition-colors hover:underline"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </Link>
        </p>
      }
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-muted)]">
          Step {stepNumber} of 3
        </span>
        <div
          className="flex w-28 items-center gap-1.5"
          aria-label={`Password reset step ${stepNumber} of 3`}
        >
          {[1, 2, 3].map((item) => (
            <span
              key={item}
              className={`h-1 flex-1 rounded-full transition-colors ${
                item <= stepNumber ? "bg-[var(--qs-brand)]" : "bg-[var(--qs-line)]"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {/* Step 1: Email */}
          {step === "email" && (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="reset-email" className={LABEL_CLASS}>
                  Account email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-[15px] top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--qs-muted)]" />
                  <input
                    id="reset-email"
                    type="email"
                    value={email.value}
                    onChange={(e) =>
                      setEmail({ value: e.target.value, error: null, touched: true })
                    }
                    onBlur={() =>
                      setEmail((prev) => ({ ...prev, error: validateEmail(prev.value) }))
                    }
                    className={`${INPUT_CLASS} ${
                      email.touched && email.error
                        ? "!border-[var(--qs-bad)]"
                        : email.touched && !email.error
                        ? "!border-[var(--qs-ok)]"
                        : ""
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {email.touched && email.error && (
                  <p className="mt-2 text-xs text-[var(--qs-bad)]">{email.error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={sendingOtp}
                className={AUTH_PRIMARY_BUTTON}
              >
                {sendingOtp && <AuthLoader className="h-4 w-4 text-white" />}
                {sendingOtp ? "Sending…" : "Continue"}
                {!sendingOtp && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === "verify" && (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div className="text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
                  <Mail className="h-6 w-6" />
                </div>
                <p className="text-sm leading-6 text-[var(--qs-muted)]">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-bold text-[var(--qs-ink)]">{email.value}</span>
                </p>
              </div>
              <div>
                <OtpInput
                  value={otp.value}
                  onChange={(next) =>
                    setOtp({ value: next.replace(/\D/g, "").slice(0, 6), error: null, touched: true })
                  }
                  error={!!(otp.touched && otp.error)}
                />
                {otp.touched && otp.error && (
                  <p className="mt-2 text-center text-xs text-[var(--qs-bad)]">{otp.error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={verifyingOtp || otp.value.length !== 6}
                className={AUTH_PRIMARY_BUTTON}
              >
                {verifyingOtp && <AuthLoader className="h-4 w-4 text-white" />}
                {verifyingOtp ? "Verifying…" : "Verify"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  disabled={countdown > 0 || sendingOtp}
                  onClick={handleResendOtp}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-transparent px-4 text-xs font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New password */}
          {step === "reset" && (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="reset-password" className={LABEL_CLASS}>
                  New password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-[15px] top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--qs-muted)]" />
                  <input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    value={password.value}
                    onChange={(e) =>
                      setPassword({ value: e.target.value, error: null, touched: true })
                    }
                    onBlur={() =>
                      setPassword((prev) => ({ ...prev, error: validatePassword(prev.value) }))
                    }
                    className={`${INPUT_CLASS} pr-12 ${
                      password.touched && password.error
                        ? "!border-[var(--qs-bad)]"
                        : ""
                    }`}
                    placeholder="Enter a new password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-brand)] focus-visible:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {password.touched && password.error && (
                  <p className="mt-2 text-xs text-[var(--qs-bad)]">{password.error}</p>
                )}
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className={LABEL_CLASS}>
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-[15px] top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--qs-muted)]" />
                  <input
                    id="reset-confirm-password"
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
                    className={`${INPUT_CLASS} pr-12 ${
                      confirmPassword.touched && confirmPassword.error
                        ? "!border-[var(--qs-bad)]"
                        : confirmPassword.touched && passwordsMatch
                        ? "!border-[var(--qs-ok)]"
                        : ""
                    }`}
                    placeholder="Re-enter the new password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-brand)] focus-visible:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {confirmPassword.touched && confirmPassword.error && (
                  <p className="mt-2 text-xs text-[var(--qs-bad)]">{confirmPassword.error}</p>
                )}
                {confirmPassword.touched &&
                  !confirmPassword.error &&
                  passwordsMatch && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[var(--qs-ok)]">
                      <Check className="h-3.5 w-3.5" /> Passwords match
                    </p>
                  )}
              </div>

              <button
                type="submit"
                disabled={!isResetEnabled}
                className={`${AUTH_PRIMARY_BUTTON} mt-1`}
              >
                {submitting && <AuthLoader className="h-4 w-4 text-white" />}
                {!submitting && <KeyRound className="h-4 w-4" />}
                {submitting ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
