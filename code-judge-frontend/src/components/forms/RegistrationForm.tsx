"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { sendOtp, verifyOtp, register } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateOtp,
} from "@/lib/validators";

// ─── Password visibility toggle icon ────────────────────────────────────
function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.18 18.18 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.88 9.88 0 0 1 12 4c7 0 10 8 10 8a18.18 18.18 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.2-4.2" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────
type Step = "email" | "verify" | "register";

interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
}

interface FormState {
  email: FieldState;
  otp: FieldState;
  password: FieldState;
  confirmPassword: FieldState;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function initField(value = ""): FieldState {
  return { value, error: null, touched: false };
}

function getBorderClass(
  field: FieldState,
  validator: (v: string) => string | null
): string {
  if (!field.touched || field.value === "") return "border-[#E6E7EB]";
  const err = validator(field.value);
  if (err) return "border-red-500";
  return "border-green-500";
}

function getErrorClass(field: FieldState): string | undefined {
  if (!field.touched) return undefined;
  return field.error ?? undefined;
}

// ─── Component ───────────────────────────────────────────────────────────
export default function RegistrationForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  // ── Form state ────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    email: initField(),
    otp: initField(),
    password: initField(),
    confirmPassword: initField(),
  });

  const [registrationToken, setRegistrationToken] = useState<string>("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Flow state ────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("email");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Countdown timer ───────────────────────────────────────────────────
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(60);
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Field updater ─────────────────────────────────────────────────────
  const updateField = useCallback(
    (name: keyof FormState, value: string) => {
      setForm((prev) => ({
        ...prev,
        [name]: { ...prev[name], value, error: null, touched: true },
      }));
    },
    []
  );

  // ── Validation helpers ────────────────────────────────────────────────
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

  // ── Action 1: Send OTP ───────────────────────────────────────────────
  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate email
      const emailErr = validateEmailField(form.email.value);
      if (emailErr) return;

      setSendingOtp(true);
      try {
        const res = await sendOtp({ email: form.email.value });
        if (res.success) {
          toast.success(`✅ OTP sent successfully to ${form.email.value}`);
          setStep("verify");
          startCountdown();
        } else {
          toast.error(res.message || "Failed to send OTP");
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || err?.message || "Something went wrong";
        toast.error(msg);
      } finally {
        setSendingOtp(false);
      }
    },
    [form.email.value, validateEmailField, startCountdown]
  );

  // ── Resend OTP ────────────────────────────────────────────────────────
  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;

    setSendingOtp(true);
    try {
      const res = await sendOtp({ email: form.email.value });
      if (res.success) {
        toast.success(`🔄 OTP resent successfully to ${form.email.value}`);
        setStep("verify");
        startCountdown();
      } else {
        toast.error(res.message || "Failed to resend OTP");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  }, [countdown, form.email.value, startCountdown]);

  // ── Action 2: Verify OTP ─────────────────────────────────────────────
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
          toast.success(res.message || "OTP verified successfully!");
          setStep("register");
        } else {
          toast.error(res.message || "Failed to verify OTP");
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || err?.message || "Something went wrong";
        toast.error(msg);
      } finally {
        setVerifyingOtp(false);
      }
    },
    [form.email.value, form.otp.value, validateOtpField]
  );

  // ── Action 3: Register ───────────────────────────────────────────────
  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const passErr = validatePasswordField(form.password.value);
      const confirmErr = validateConfirmPasswordField(form.confirmPassword.value);

      if (passErr || confirmErr) return;

      setSubmitting(true);
      try {
        const res = await register({
          email: form.email.value,
          password: form.password.value,
          registration_token: registrationToken,
        });
        if (res.success) {
          toast.success(res.message || "Account created successfully!");
          // Persist auth state if backend returned user/token
          const token = res.data?.token as string | undefined;
          const user = res.data?.user as { id: string; email: string; username?: string } | undefined;
          if (token && user) {
            setAuth(token, user);
          }
          // Reset form
          setForm({
            email: initField(),
            otp: initField(),
            password: initField(),
            confirmPassword: initField(),
          });
          setRegistrationToken("");
          setStep("email");
          setCountdown(0);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Redirect to login page
          router.push("/login");
        } else {
          toast.error(res.message || "Registration failed");
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || err?.message || "Something went wrong";
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      form.email.value,
      form.password.value,
      form.confirmPassword.value,
      registrationToken,
      validatePasswordField,
      validateConfirmPasswordField,
    ]
  );

  // ── Determine if Register button should be enabled ───────────────────
  const isRegisterEnabled =
    form.password.value.length >= 8 &&
    form.confirmPassword.value.length >= 1 &&
    form.password.value === form.confirmPassword.value &&
    !submitting;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-lg border border-[#E6E7EB] bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-[#E6E7EB] px-6 py-4">
          <h1 className="text-base font-semibold text-[#111827]">
            Create Account
          </h1>
          <p className="mt-0.5 text-[11px] text-[#6B7280]">
            Secure registration with email verification
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* ── Step indicator ──────────────────────────────────────── */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {([
              { key: "email", label: "Email" },
              { key: "verify", label: "Verify" },
              { key: "register", label: "Password" },
            ] as const).map((s, i) => {
              const stepOrder = ["email", "verify", "register"] as const;
              const currentIndex = stepOrder.indexOf(step);
              const isActive = step === s.key;
              const isComplete = currentIndex > i;

              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                      isActive
                        ? "bg-[#2563EB] text-white"
                        : isComplete
                        ? "bg-green-500 text-white"
                        : "bg-[#E6E7EB] text-[#6B7280]"
                    }`}
                  >
                    {isComplete ? "✓" : i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className={`h-px w-8 ${
                        currentIndex > i ? "bg-green-500" : "bg-[#E6E7EB]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Email + Send OTP ────────────────────────────── */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-[11px] font-medium text-[#6B7280] mb-1"
                >
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={form.email.value}
                  onChange={(e) => updateField("email", e.target.value)}
                  onBlur={() => validateEmailField(form.email.value)}
                  className={`w-full rounded border bg-white px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 ${getBorderClass(
                    form.email,
                    validateEmail
                  )}`}
                  placeholder="your@email.com"
                />
                {form.email.touched && form.email.error && (
                  <p className="mt-1 text-[11px] text-red-500">
                    {form.email.error}
                  </p>
                )}
                {form.email.touched &&
                  !form.email.error &&
                  form.email.value !== "" && (
                    <p className="mt-1 text-[11px] text-green-600">
                      Email looks good
                    </p>
                  )}
              </div>

              <button
                type="submit"
                disabled={sendingOtp}
                className="flex w-full items-center justify-center gap-2 rounded border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingOtp ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {/* ── Step 2: Verify OTP ─────────────────────────────────── */}
          {step === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* OTP */}
              <div>
                <label
                  htmlFor="reg-otp"
                  className="block text-[11px] font-medium text-[#6B7280] mb-1"
                >
                  One-Time Password
                </label>
                <p className="mb-2 text-[11px] text-[#6B7280]">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-medium text-[#111827]">
                    {form.email.value}
                  </span>
                </p>
                <input
                  id="reg-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={form.otp.value}
                  onChange={(e) =>
                    updateField("otp", e.target.value.replace(/\D/g, ""))
                  }
                  onBlur={() => validateOtpField(form.otp.value)}
                  className={`w-full rounded border bg-white px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 text-center tracking-[0.5em] ${getBorderClass(
                    form.otp,
                    validateOtp
                  )}`}
                  placeholder="000000"
                />
                {form.otp.touched && form.otp.error && (
                  <p className="mt-1 text-[11px] text-red-500">
                    {form.otp.error}
                  </p>
                )}
                
              </div>

              {/* Resend OTP */}
              <div className="text-center">
                <button
                  type="button"
                  disabled={countdown > 0 || sendingOtp}
                  onClick={handleResendOtp}
                  className="text-[11px] text-[#2563EB] transition-colors hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
                >
                  {sendingOtp
                    ? "Resending..."
                    : countdown > 0
                    ? `Resend OTP in ${countdown}s`
                    : "Resend OTP"}
                </button>
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={verifyingOtp || form.otp.value.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifyingOtp ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Verifying OTP...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </button>
            </form>
          )}

          {/* ── Step 3: Password + Register ─────────────────────────── */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-[11px] font-medium text-[#6B7280] mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password.value}
                    onChange={(e) => updateField("password", e.target.value)}
                    onBlur={() => validatePasswordField(form.password.value)}
                    className={`w-full rounded border bg-white px-3 py-2 pr-10 text-[13px] text-[#111827] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 ${getBorderClass(
                      form.password,
                      validatePassword
                    )}`}
                    placeholder="8+ chars, uppercase, lowercase, number & special char"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6B7280] hover:text-[#111827]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {form.password.touched && form.password.error && (
                  <p className="mt-1 text-[11px] text-red-500">
                    {form.password.error}
                  </p>
                )}
                <ul className="mt-2 space-y-1 text-[11px] text-[#6B7280]">
                  <li className={`flex items-center gap-1.5 ${form.password.value.length >= 8 ? "text-green-600" : ""}`}>
                    <span className={`h-1 w-1 rounded-full ${form.password.value.length >= 8 ? "bg-green-500" : "bg-[#D1D5DB]"}`}></span>
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(form.password.value) ? "text-green-600" : ""}`}>
                    <span className={`h-1 w-1 rounded-full ${/[A-Z]/.test(form.password.value) ? "bg-green-500" : "bg-[#D1D5DB]"}`}></span>
                    One uppercase letter
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[a-z]/.test(form.password.value) ? "text-green-600" : ""}`}>
                    <span className={`h-1 w-1 rounded-full ${/[a-z]/.test(form.password.value) ? "bg-green-500" : "bg-[#D1D5DB]"}`}></span>
                    One lowercase letter
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[0-9]/.test(form.password.value) ? "text-green-600" : ""}`}>
                    <span className={`h-1 w-1 rounded-full ${/[0-9]/.test(form.password.value) ? "bg-green-500" : "bg-[#D1D5DB]"}`}></span>
                    One number
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password.value) ? "text-green-600" : ""}`}>
                    <span className={`h-1 w-1 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password.value) ? "bg-green-500" : "bg-[#D1D5DB]"}`}></span>
                    One special character
                  </li>
                </ul>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-[11px] font-medium text-[#6B7280] mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.confirmPassword.value}
                    onChange={(e) =>
                      updateField("confirmPassword", e.target.value)
                    }
                    onBlur={() =>
                      validateConfirmPasswordField(form.confirmPassword.value)
                    }
                    className={`w-full rounded border bg-white px-3 py-2 pr-10 text-[13px] text-[#111827] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 ${getBorderClass(
                      form.confirmPassword,
                      (v) => validateConfirmPassword(form.password.value, v)
                    )}`}
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6B7280] hover:text-[#111827]"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {form.confirmPassword.touched &&
                  form.confirmPassword.error && (
                    <p className="mt-1 text-[11px] text-red-500">
                      {form.confirmPassword.error}
                    </p>
                  )}
                {form.confirmPassword.touched &&
                  !form.confirmPassword.error &&
                  form.confirmPassword.value !== "" && (
                    <p className="mt-1 text-[11px] text-green-600">
                      Passwords match
                    </p>
                  )}
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={!isRegisterEnabled}
                className="flex w-full items-center justify-center gap-2 rounded border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  "Register"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E6E7EB] px-6 py-3 text-center">
          <p className="text-[11px] text-[#6B7280]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}