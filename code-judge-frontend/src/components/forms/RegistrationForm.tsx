"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Eye, EyeOff, LogIn, Mail, RefreshCw } from "lucide-react";
import { QuizLoader } from "@/components/quiz/live/StudentQuizShell";
import { useQuizSounds } from "@/hooks/useQuizSounds";
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
import { AuthBrandMark, AuthThemeControls } from "@/components/auth/AuthThemeChrome";
import { getApiErrorMessage } from "@/lib/apiError";
import { PREDEFINED_AVATARS } from "@/config/dicebear";

const AUTH_PRIMARY_BUTTON = "group flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-4 text-sm font-bold text-white shadow-[0_16px_32px_-18px_rgba(236,72,153,.9),inset_0_1px_0_rgba(255,255,255,.28)] transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 dark:from-violet-600 dark:via-indigo-500 dark:to-blue-600 dark:shadow-[0_16px_34px_-18px_rgba(124,92,255,.95),inset_0_1px_0_rgba(255,255,255,.2)]";

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
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(PREDEFINED_AVATARS[0].url);
  // Progressive profile onboarding inside the "register" step:
  // 1 = username, 2 = avatar, 3 = password.
  const [profileStep, setProfileStep] = useState<1 | 2 | 3>(1);
  const [detailDir, setDetailDir] = useState<1 | -1>(1);
  const { playQuizSound } = useQuizSounds();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameCheckIdRef = useRef(0);

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
      // Invalid characters never enter the field; the backend repeats this
      // validation because browser-side checks are never a security boundary.
      const lower = value.toLowerCase().replace(/[^a-z0-9]/g, "");
      updateField("username", lower);
      const checkId = ++usernameCheckIdRef.current;

      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
      }

      const validationErr = validateUsername(lower);
      if (validationErr) {
        setUsernameStatus({ checking: false, available: null, message: "" });
        return;
      }

      setUsernameStatus({ checking: true, available: null, message: "" });

      usernameDebounceRef.current = setTimeout(async () => {
        try {
          const res = await checkUsername(lower);
          if (checkId !== usernameCheckIdRef.current) return;
          setUsernameStatus({
            checking: false,
            available: res.available,
            message: res.message,
          });
        } catch {
          if (checkId !== usernameCheckIdRef.current) return;
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
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, "Something went wrong"));
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Something went wrong"));
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
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, "Something went wrong"));
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

      playQuizSound("submit");
      setSubmitting(true);
      try {
        const res = await register({
          username: form.username.value,
          email: form.email.value,
          password: form.password.value,
          registration_token: registrationToken,
          avatar_url: selectedAvatarUrl,
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
          setSelectedAvatarUrl(PREDEFINED_AVATARS[0].url);
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          router.push("/login");
        } else {
          toast.error(res.message || "Registration failed");
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, "Something went wrong"));
      } finally {
        setSubmitting(false);
      }
    },
    [form.username.value, form.email.value, form.password.value, form.confirmPassword.value, registrationToken, selectedAvatarUrl, usernameStatus.available, validateUsernameField, validatePasswordField, validateConfirmPasswordField, router, setAuth]
  );

  const isUsernameReady =
    form.username.value.length >= 3 &&
    !form.username.error &&
    usernameStatus.available === true &&
    !usernameStatus.checking;

  const passwordsMatch =
    validatePassword(form.password.value) === null &&
    form.confirmPassword.value.length >= 8 &&
    form.password.value === form.confirmPassword.value;

  const isPasswordReady = passwordsMatch && !submitting;

  const goProfileStep = (next: 1 | 2 | 3) => {
    setDetailDir(next >= profileStep ? 1 : -1);
    setProfileStep(next);
    playQuizSound("navigate");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FFF9F1] px-6 py-20 dark:bg-[#050510]">
      <AuthBackground />
      <AuthThemeControls />
      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <AuthBrandMark className="mb-4" />
          {/* The profile sub-flow (register step) renders its own per-screen titles. */}
          {step !== "register" && (
            <>
              <div className="mx-auto mb-4 flex w-36 items-center gap-2" aria-label={`Registration step ${step === "email" ? 1 : 2} of 3`}>
                {[1, 2, 3].map((item) => (
                  <span key={item} className={`h-1 flex-1 rounded-full transition-colors ${item <= (step === "email" ? 1 : 2) ? "bg-accent" : "bg-input-border"}`} />
                ))}
              </div>
              <h1 className="text-xl font-bold text-text-primary">
                {step === "email" && "Create your account"}
                {step === "verify" && "Check your email"}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {step === "email" && "Enter your email to get started"}
                {step === "verify" && `We sent a code to ${form.email.value}`}
              </p>
            </>
          )}
        </div>

        {/* Card for email + OTP. The profile sub-flow renders open (no card). */}
        {step !== "register" && (
        <div className="rounded-[28px] border border-pink-200/80 bg-white/82 p-6 shadow-[0_30px_80px_-42px_rgba(244,114,182,.75)] backdrop-blur-2xl dark:border-violet-300/15 dark:bg-[#0E1323]/88 dark:shadow-[0_30px_90px_-40px_rgba(91,69,196,.8)]">
          {/* Step 1: Email */}
          {step === "email" && (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="registration-email" className="mb-2 block text-[11px] font-semibold text-text-secondary">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  id="registration-email"
                  type="email"
                  value={form.email.value}
                  onChange={(e) => updateField("email", e.target.value)}
                  onBlur={() => validateEmailField(form.email.value)}
                  className={`w-full rounded-xl bg-input-bg border py-3 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                    form.email.touched && form.email.error
                      ? "border-red-500"
                      : form.email.touched && !form.email.error
                      ? "border-green-500"
                      : "border-input-border"
                  }`}
                  placeholder="you@example.com"
                />
                </div>
                {form.email.touched && form.email.error && (
                  <p className="mt-2 text-xs text-red-400">{form.email.error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={sendingOtp}
                className={AUTH_PRIMARY_BUTTON}
              >
                {sendingOtp && <QuizLoader className="h-4 w-4 text-white" />}
                {sendingOtp ? "Sending..." : "Continue"}
                {!sendingOtp && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
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
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-input-border bg-transparent px-4 text-sm font-semibold text-text-secondary transition-all hover:border-accent hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingOtp
                    ? <QuizLoader className="h-4 w-4" />
                    : <RefreshCw className="h-4 w-4" />}
                  {sendingOtp
                    ? "Resending..."
                    : countdown > 0
                      ? `Resend code in ${countdown}s`
                      : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
          )}

          {/* Step 3: Profile onboarding — one task per screen, open layout (no card). */}
          {step === "register" && (
            <div className="mx-auto w-full max-w-[340px]">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {profileStep} of 3
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-violet-500"
                  animate={{ width: `${(profileStep / 3) * 100}%` }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={profileStep}
                  initial={{ opacity: 0, x: 32 * detailDir }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 * detailDir }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {profileStep === 1 && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (isUsernameReady) goProfileStep(2);
                      }}
                    >
                      <h1 className="mt-6 text-center text-[26px] font-bold tracking-tight text-text-primary">
                        Choose your username
                      </h1>
                      <p className="mt-2 text-center text-sm text-text-secondary">
                        This is how other students will see you.
                      </p>
                      <div className="mt-6">
                <div className="relative">
                  <input
                    type="text"
                    value={form.username.value}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onBlur={() => {
                      const err = validateUsernameField(form.username.value);
                      if (!err && form.username.value) {
                        const checkId = ++usernameCheckIdRef.current;
                        setUsernameStatus((prev) => ({ ...prev, checking: true }));
                        checkUsername(form.username.value).then((res) => {
                          if (checkId !== usernameCheckIdRef.current) return;
                          setUsernameStatus({
                            checking: false,
                            available: res.available,
                            message: res.message,
                          });
                        }).catch(() => {
                          if (checkId !== usernameCheckIdRef.current) return;
                          setUsernameStatus({ checking: false, available: null, message: "" });
                        });
                      }
                    }}
                    aria-describedby="username-availability"
                    className={`w-full rounded-2xl bg-input-bg border px-5 py-4 pr-28 text-lg text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
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
                  {usernameStatus.checking && (
                    <span className="pointer-events-none absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent">
                      <QuizLoader className="h-3 w-3" /> Checking
                    </span>
                  )}
                </div>
                <div id="username-availability" className="mt-2 min-h-5" aria-live="polite">
                  {form.username.touched && form.username.error ? (
                    <p className="text-xs text-red-400">{form.username.error}</p>
                  ) : !form.username.error && usernameStatus.checking ? (
                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                      <QuizLoader className="h-3 w-3" /> Checking username availability…
                    </p>
                  ) : !form.username.error && !usernameStatus.checking && usernameStatus.available === false ? (
                    <p className="text-xs text-red-400">{usernameStatus.message}</p>
                  ) : !form.username.error && !usernameStatus.checking && usernameStatus.available === true ? (
                    <p className="text-xs font-medium text-green-500 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Username available
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted">Only lowercase letters and numbers</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!isUsernameReady}
                  className={`${AUTH_PRIMARY_BUTTON} mt-6 min-h-13`}
                >
                  Continue
                </button>
                      </div>
                    </form>
                  )}

                  {profileStep === 2 && (
                    <div>
                      <h1 className="mt-6 text-center text-[26px] font-bold tracking-tight text-text-primary">
                        Pick your avatar
                      </h1>
                      <p className="mt-2 text-center text-sm text-text-secondary">
                        Choose how you&rsquo;ll appear in quizzes and waiting rooms.
                      </p>
                      <div className="mt-6 flex justify-center">
                        <span className="block h-28 w-28 overflow-hidden rounded-full border-2 border-violet-500 ring-2 ring-violet-500/20">
                          <Image
                            src={selectedAvatarUrl}
                            alt={PREDEFINED_AVATARS.find((a) => a.url === selectedAvatarUrl)?.label ?? "Selected avatar"}
                            width={112}
                            height={112}
                            className="h-full w-full object-cover"
                            priority
                          />
                        </span>
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Choose your avatar">
                        {PREDEFINED_AVATARS.map((avatar) => {
                          const selected = selectedAvatarUrl === avatar.url;
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              aria-label={avatar.label}
                              onClick={() => { playQuizSound("select"); setSelectedAvatarUrl(avatar.url); }}
                              className={`relative aspect-square overflow-hidden rounded-full border-2 p-1 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                                selected
                                  ? "border-violet-500 ring-2 ring-violet-500/20 shadow-[0_0_18px_-6px_rgba(124,92,255,.55)]"
                                  : "border-input-border hover:border-violet-400/60"
                              }`}
                            >
                              <Image src={avatar.url} alt="" width={96} height={96} className="h-full w-full rounded-full object-cover" />
                              {selected && (
                                <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-violet-600 text-white dark:border-[#111526]">
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-6 flex gap-3">
                        <button
                          type="button"
                          onClick={() => goProfileStep(1)}
                          className="min-h-13 flex-1 rounded-xl border border-input-border text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => goProfileStep(3)}
                          className={`${AUTH_PRIMARY_BUTTON} min-h-13 flex-[2]`}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {profileStep === 3 && (
                    <form onSubmit={handleRegister}>
                      <h1 className="mt-6 text-center text-[26px] font-bold tracking-tight text-text-primary">
                        Create your password
                      </h1>
                      <p className="mt-2 text-center text-sm text-text-secondary">
                        Keep your account secure.
                      </p>
                      <div className="mt-6 space-y-3">
                        <div>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={form.password.value}
                              onChange={(e) => updateField("password", e.target.value)}
                              onBlur={() => validatePasswordField(form.password.value)}
                              className={`w-full rounded-2xl bg-input-bg border px-5 py-4 pr-12 text-base text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-text-muted hover:bg-black/5 hover:text-text-primary transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {form.password.touched && form.password.error ? (
                            <p className="mt-2 text-xs text-red-400">{form.password.error}</p>
                          ) : (
                            <p className="mt-2 text-xs text-text-muted">At least 8 characters</p>
                          )}
                        </div>

                        <div>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={form.confirmPassword.value}
                              onChange={(e) => updateField("confirmPassword", e.target.value)}
                              onBlur={() => validateConfirmPasswordField(form.confirmPassword.value)}
                              className={`w-full rounded-2xl bg-input-bg border px-5 py-4 pr-12 text-base text-text-primary placeholder-text-muted outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent ${
                                form.confirmPassword.touched && form.confirmPassword.error
                                  ? "border-red-500"
                                  : form.confirmPassword.touched && passwordsMatch
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-text-muted hover:bg-black/5 hover:text-text-primary transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {form.confirmPassword.touched && form.confirmPassword.error ? (
                            <p className="mt-2 text-xs text-red-400">{form.confirmPassword.error}</p>
                          ) : form.confirmPassword.touched && passwordsMatch ? (
                            <p className="mt-2 text-xs font-medium text-green-500 flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Passwords match
                            </p>
                          ) : null}
                        </div>

                      </div>
                      <div className="mt-6 flex gap-3">
                        <button
                          type="button"
                          onClick={() => goProfileStep(2)}
                          className="min-h-13 flex-1 rounded-xl border border-input-border text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={!isPasswordReady}
                          className={`${AUTH_PRIMARY_BUTTON} min-h-13 flex-[2]`}
                        >
                          {submitting && <QuizLoader className="h-4 w-4 text-white" />}
                          {submitting ? "Creating..." : "Create account"}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-accent transition-colors hover:text-accent/80">
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
