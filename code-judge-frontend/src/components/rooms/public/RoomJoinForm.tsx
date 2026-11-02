"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  joinRoom,
  previewRoomJoin,
  type JoinedRoom,
  type RoomJoinPreview,
} from "@/services/rooms";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/helpers";
import { SecureLogo } from "@/components/common/SecureLogo";
import type { RoomRegistrationForm } from "@/types/room";
import {
  isValidRoomCodeInput,
  normalizeRoomCodeInput,
  parseRoomInvitePassword,
} from "@/utils/roomShare";
import {
  fieldInputType,
  validateRegistrationValues,
} from "@/utils/roomRegistration";
import { formatPasswordExpiry } from "@/utils/passwordExpiry";
import { Stagger, usePrefersReducedMotion, type CurtainPhase, Curtain } from "./roomMotion";
import TeacherPublicCard from "./TeacherPublicCard";
import styles from "./roomsCinematic.module.css";

const DRAFT_KEY = "quizsupport_room_join_draft";

interface RoomJoinDraft {
  code: string;
  password: string;
}

interface RoomJoinFormProps {
  initialCode?: string;
  animate?: boolean;
  compact?: boolean;
}

interface JoinErrorPayload {
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string>;
  registration_form?: RoomRegistrationForm;
}

function readDraft(): RoomJoinDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RoomJoinDraft>;
    if (typeof parsed.code !== "string" || typeof parsed.password !== "string") return null;
    return { code: normalizeRoomCodeInput(parsed.code), password: parsed.password };
  } catch {
    return null;
  }
}

function joinErrorPayload(error: unknown): JoinErrorPayload | null {
  const response = (error as { response?: { data?: JoinErrorPayload } })?.response;
  return response?.data ?? null;
}

const detailsInputCls =
  "mt-1.5 w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-3 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] aria-[invalid=true]:border-[var(--qs-bad)]";

export default function RoomJoinForm({
  initialCode = "",
  animate = false,
  compact = false,
}: RoomJoinFormProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const reduced = usePrefersReducedMotion();

  const [code, setCode] = useState(() => normalizeRoomCodeInput(initialCode));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"credentials" | "details">("credentials");
  const [preview, setPreview] = useState<RoomJoinPreview | null>(null);
  const [registrationValues, setRegistrationValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [inviteReady, setInviteReady] = useState(false);
  const [autoJoinReady, setAutoJoinReady] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [joined, setJoined] = useState<JoinedRoom | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [formFading, setFormFading] = useState(false);
  const [curtain, setCurtain] = useState<CurtainPhase>("idle");
  const [joinedRevealed, setJoinedRevealed] = useState(false);

  const didRestore = useRef(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const joinedRef = useRef<HTMLDivElement>(null);
  const autoSubmitRef = useRef(false);
  const timers = useRef<number[]>([]);

  const registrationForm = preview?.registration_form ?? null;

  function schedule(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
    return timer;
  }

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    queueMicrotask(() => setCode(normalizeRoomCodeInput(initialCode)));
  }, [initialCode]);

  // Prefer the invite-link password (#p=...), then a draft from the login
  // round-trip. The fragment is removed so it does not linger in the address bar.
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;

    queueMicrotask(() => {
      const invitePassword = parseRoomInvitePassword(window.location.hash);
      if (invitePassword) {
        sessionStorage.removeItem(DRAFT_KEY);
        setPassword(invitePassword);
        setInviteReady(true);
        setAutoJoinReady(true);
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`
        );
        return;
      }

      const draft = readDraft();
      if (!draft) return;
      sessionStorage.removeItem(DRAFT_KEY);
      if (draft.code) setCode(draft.code);
      if (draft.password) setPassword(draft.password);
      setAutoJoinReady(Boolean(draft.code && draft.password));
    });
  }, []);

  useEffect(() => {
    if (!animate || joined || step !== "credentials") return;

    const focusTimer = window.setTimeout(() => {
      codeInputRef.current?.focus({ preventScroll: true });
      setPulse(true);
      const pulseTimer = window.setTimeout(() => setPulse(false), 500);
      timers.current.push(pulseTimer);
    }, 2400);

    timers.current.push(focusTimer);

    return () => {
      window.clearTimeout(focusTimer);
      setPulse(false);
    };
  }, [animate, joined, step]);

  const codeComplete = code.length === 6;
  const valid = isValidRoomCodeInput(code) && password.length > 0;

  const inlineError =
    error ||
    (touched && !codeComplete
      ? "Enter the full 6-character room code."
      : touched && codeComplete && password.length === 0
        ? "Enter the password from your teacher's message."
        : null);

  useEffect(() => {
    if (!autoJoinReady || autoSubmitRef.current || animate) return;
    if (!hasHydrated || joined || submitting || step !== "credentials" || !valid) return;

    autoSubmitRef.current = true;
    formRef.current?.requestSubmit();
  }, [animate, autoJoinReady, hasHydrated, joined, submitting, step, valid]);

  function triggerShake() {
    if (reduced) return;
    setShaking(true);
    schedule(() => setShaking(false), 360);
  }

  function showJoinSuccess(result: JoinedRoom) {
    if (reduced || compact) {
      setFormFading(true);
      setJoined(result);
      setJoinedRevealed(true);
      schedule(() => joinedRef.current?.focus({ preventScroll: true }), 180);
      return;
    }

    setFormFading(true);
    schedule(() => setCurtain("closing"), 160);
    schedule(() => {
      setJoined(result);
      setCurtain("opening");
    }, 560);
    schedule(() => {
      setCurtain("idle");
      setJoinedRevealed(true);
      joinedRef.current?.focus({ preventScroll: true });
    }, 960);
  }

  async function completeJoin(answers: Record<string, string>) {
    try {
      const result = await joinRoom({
        room_code: code,
        password,
        registration_data: Object.keys(answers).length > 0 ? answers : undefined,
      });
      showJoinSuccess(result);
    } catch (err: unknown) {
      const payload = joinErrorPayload(err);

      if (payload?.code === "REGISTRATION_INVALID" && payload.registration_form) {
        setPreview((current) => ({
          room: current?.room ?? { id: "", name: "Registration" },
          ownerId: current?.ownerId ?? "",
          teacher: current?.teacher ?? null,
          password_expires_at: current?.password_expires_at ?? null,
          registration_form: payload.registration_form as RoomRegistrationForm,
          already_member: current?.already_member ?? false,
        }));
        setFieldErrors(payload.fieldErrors ?? {});
        setError(payload.message ?? "Please complete the registration form.");
        setStep("details");
        triggerShake();
        return;
      }

      if ((err as { response?: { status?: number } })?.response?.status === 401) {
        setStep("credentials");
      }
      setError(getApiErrorMessage(err, "Could not join the room. Please try again."));
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCredentialsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setError(null);
    setFieldErrors({});

    if (!valid || joined || submitting) return;

    if (!isAuthenticated) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ code, password }));
      } catch {
        // Private mode/quota — the code still travels in the URL.
      }
      router.push(`/login?next=${encodeURIComponent(`/rooms?code=${code}`)}`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await previewRoomJoin({ room_code: code, password });

      if (result.already_member) {
        setPreview(result);
        setRegistrationValues({});
        setAlreadyJoined(true);
        setSubmitting(false);
        showJoinSuccess({ room: result.room, teacher: result.teacher });
        return;
      }

      if (result.registration_form.fields.length === 0) {
        setPreview(result);
        setRegistrationValues({});
        await completeJoin({});
        return;
      }

      const nextValues: Record<string, string> = {};
      for (const field of result.registration_form.fields) {
        nextValues[field.label] = registrationValues[field.label] ?? "";
      }
      setPreview(result);
      setRegistrationValues(nextValues);
      setStep("details");
      setSubmitting(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Wrong room code or password"));
      triggerShake();
      setSubmitting(false);
    }
  }

  async function handleDetailsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!registrationForm || joined || submitting) return;

    const errors = validateRegistrationValues(registrationForm, registrationValues);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      triggerShake();
      return;
    }

    const answers: Record<string, string> = {};
    for (const field of registrationForm.fields) {
      const value = (registrationValues[field.label] ?? "").trim();
      if (value) answers[field.label] = value;
    }

    setSubmitting(true);
    await completeJoin(answers);
  }

  function handleJoinAnother() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setJoined(null);
    setAlreadyJoined(false);
    setFormFading(false);
    setJoinedRevealed(false);
    setCurtain("idle");
    setShaking(false);
    setError(null);
    setTouched(false);
    setPassword("");
    setShowPassword(false);
    setCode("");
    setStep("credentials");
    setPreview(null);
    setRegistrationValues({});
    setFieldErrors({});
    setInviteReady(false);
    setAutoJoinReady(false);
    autoSubmitRef.current = false;
    queueMicrotask(() => codeInputRef.current?.focus());
  }

  const detailsFilled = registrationForm
    ? registrationForm.fields.every((field) => {
        const value = (registrationValues[field.label] ?? "").trim();
        return !field.required || value.length > 0;
      })
    : false;

  return (
    <div className={cn(styles.joinStage, shaking && styles.shake)}>
      <span className={styles.offsetBlock} aria-hidden="true">
        <span className={cn(styles.offsetBlockClapper, animate && styles.offsetBlockAnimated)}>
          <span className={cn(styles.offsetBlockFill, styles.ambient)} />
        </span>
      </span>

      <div
        className={cn(
          "qs-card",
          styles.joinCard,
          animate && styles.cardAnimated
        )}
      >
        <div className={styles.joinStack}>
          <div
            className={cn(styles.formLayer, formFading && styles.formLayerHidden)}
            aria-hidden={joined ? true : undefined}
          >
            <form
              ref={formRef}
              onSubmit={step === "details" ? handleDetailsSubmit : handleCredentialsSubmit}
              noValidate
              autoComplete="off"
              inert={joined ? true : undefined}
            >
              <div
                key={step}
                className={cn(
                  !reduced && styles.viewEnter,
                  step === "details" && "pb-1"
                )}
              >
                {step === "credentials" ? (
                  <>
                    <h2 className="qs-display text-2xl text-[var(--qs-ink)]">
                      Enter room details
                    </h2>
                    <p className="mt-1 text-sm text-[var(--qs-muted)]">
                      Nothing to install. Works on phone and laptop.
                    </p>

                    {inviteReady ? (
                      <div className={styles.inviteChip}>
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        Invite link detected — code and password are filled in.
                      </div>
                    ) : null}

                    {preview?.teacher ? (
                      <TeacherPublicCard teacher={preview.teacher} className="mt-4" />
                    ) : null}

                    <label
                      htmlFor="room-code"
                      className="mt-5 block text-sm font-bold text-[var(--qs-ink)]"
                    >
                      Room code
                    </label>
                    <div
                      className={cn(
                        "mt-2",
                        styles.codeField,
                        inlineError && styles.codeFieldInvalid,
                        pulse && styles.codeFieldPulse
                      )}
                    >
                      <input
                        ref={codeInputRef}
                        id="room-code"
                        value={code}
                        onChange={(event) => {
                          setCode(normalizeRoomCodeInput(event.target.value));
                          setError(null);
                        }}
                        onBlur={() => setTouched(true)}
                        inputMode="text"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={6}
                        placeholder="AB23CD"
                        aria-invalid={Boolean(inlineError)}
                        aria-describedby="room-join-help"
                        className={styles.codeInput}
                      />
                      <div className={styles.codeDisplay} aria-hidden="true">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <Fragment key={index}>
                            <span className={styles.codeSlot}>
                              {code[index] ? (
                                <span
                                  key={`${index}-${code[index]}`}
                                  className={cn(styles.codeChar, styles.codeCharPop)}
                                >
                                  {code[index]}
                                </span>
                              ) : (
                                <span className={styles.codeGhost}>{"AB23CD"[index]}</span>
                              )}
                            </span>
                            {index === 1 || index === 3 ? (
                              <span
                                className={cn(
                                  styles.codeDash,
                                  code.length > index && styles.codeDashVisible
                                )}
                              >
                                -
                              </span>
                            ) : null}
                          </Fragment>
                        ))}
                      </div>
                    </div>

                    <label
                      htmlFor="room-password"
                      className="mt-5 block text-sm font-bold text-[var(--qs-ink)]"
                    >
                      Password
                    </label>
                    <div className="relative mt-2">
                      <input
                        id="room-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError(null);
                        }}
                        onBlur={() => setTouched(true)}
                        autoComplete="off"
                        maxLength={128}
                        placeholder="Enter password"
                        aria-invalid={Boolean(inlineError)}
                        aria-describedby="room-join-help"
                        className="w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] py-3 pl-3.5 pr-20 text-base text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] aria-[invalid=true]:border-[var(--qs-bad)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        className="absolute right-1.5 top-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-lg px-3 text-xs font-bold text-[var(--qs-brand)] transition-colors hover:bg-[var(--qs-brand)]/10"
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    <div
                      id="room-join-help"
                      role="status"
                      aria-live="polite"
                      className={cn(
                        "mt-3 min-h-5 text-[13px] font-semibold",
                        inlineError
                          ? "flex items-start gap-1.5 text-[var(--qs-bad)]"
                          : "text-[var(--qs-muted)]",
                        inlineError && styles.helperError
                      )}
                    >
                      {inlineError ? (
                        <>
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{inlineError}</span>
                        </>
                      ) : !isAuthenticated && hasHydrated ? (
                        <span className="inline-flex items-center gap-1.5">
                          <LogIn className="h-3.5 w-3.5" />
                          You&apos;ll sign in first; your code and password stay filled in.
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      disabled={!valid || submitting || !hasHydrated}
                      className="qs-btn mt-2 min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      <span>{submitting ? "Checking…" : "Continue"}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-poly-1)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
                          <ClipboardList className="h-3 w-3" />
                          Step 2 of 2
                        </span>
                        <h2 className="qs-display mt-2.5 text-2xl text-[var(--qs-ink)]">
                          {registrationForm?.title || "Student registration"}
                        </h2>
                        <p className="mt-1 text-sm text-[var(--qs-muted)]">
                          {registrationForm?.description ||
                            `A few details before you join ${preview?.room.name ?? "the room"}.`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep("credentials");
                          setError(null);
                          setFieldErrors({});
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--qs-brand)] transition-colors hover:bg-[var(--qs-brand)]/10"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                      </button>
                    </div>

                    {preview ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-[var(--qs-line)] px-3 py-2 text-xs font-semibold text-[var(--qs-muted)]">
                        <span className="font-extrabold text-[var(--qs-ink)]">{preview.room.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono uppercase tracking-[0.08em]">{code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {preview.password_expires_at
                            ? `Password valid till ${formatPasswordExpiry(preview.password_expires_at)}`
                            : "Password does not expire"}
                        </span>
                      </div>
                    ) : null}

                    {preview?.teacher ? (
                      <TeacherPublicCard teacher={preview.teacher} className="mt-4" />
                    ) : null}

                    {registrationForm ? (
                      <Stagger
                        animate={!reduced}
                        baseDelay={0}
                        step={70}
                        className="mt-5 grid gap-4"
                      >
                        {registrationForm.fields.map((field) => {
                          const fieldError = fieldErrors[field.label];
                          return (
                            <div key={field.id}>
                              <label
                                htmlFor={`room-reg-${field.id}`}
                                className="block text-sm font-bold text-[var(--qs-ink)]"
                              >
                                {field.label}
                                {field.required ? (
                                  <span className="ml-1 text-[var(--qs-bad)]" aria-hidden="true">
                                    *
                                  </span>
                                ) : (
                                  <span className="ml-1.5 text-[11px] font-semibold text-[var(--qs-muted)]">
                                    Optional
                                  </span>
                                )}
                              </label>
                              {field.type === "select" ? (
                                <select
                                  id={`room-reg-${field.id}`}
                                  value={registrationValues[field.label] ?? ""}
                                  onChange={(event) => {
                                    setRegistrationValues((current) => ({
                                      ...current,
                                      [field.label]: event.target.value,
                                    }));
                                    setFieldErrors((current) => {
                                      const next = { ...current };
                                      delete next[field.label];
                                      return next;
                                    });
                                  }}
                                  aria-invalid={Boolean(fieldError)}
                                  className={detailsInputCls}
                                >
                                  <option value="">Select an option…</option>
                                  {field.options.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  id={`room-reg-${field.id}`}
                                  type={fieldInputType(field)}
                                  value={registrationValues[field.label] ?? ""}
                                  onChange={(event) => {
                                    setRegistrationValues((current) => ({
                                      ...current,
                                      [field.label]: event.target.value,
                                    }));
                                    setFieldErrors((current) => {
                                      const next = { ...current };
                                      delete next[field.label];
                                      return next;
                                    });
                                  }}
                                  maxLength={500}
                                  placeholder={
                                    field.type === "email"
                                      ? "you@example.com"
                                      : field.type === "phone"
                                        ? "+91 98765 43210"
                                        : `Enter ${field.label.toLowerCase()}`
                                  }
                                  aria-invalid={Boolean(fieldError)}
                                  className={detailsInputCls}
                                />
                              )}
                              {fieldError ? (
                                <p
                                  role="alert"
                                  className="mt-1.5 flex items-start gap-1.5 text-xs font-bold text-[var(--qs-bad)]"
                                >
                                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  {fieldError}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </Stagger>
                    ) : null}

                    <div
                      role="status"
                      aria-live="polite"
                      className={cn(
                        "mt-4 min-h-5 text-[13px] font-semibold",
                        error
                          ? "flex items-start gap-1.5 text-[var(--qs-bad)]"
                          : "text-[var(--qs-muted)]"
                      )}
                    >
                      {error ? (
                        <>
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{error}</span>
                        </>
                      ) : (
                        <span>Your teacher will see these answers with your membership.</span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !detailsFilled || !hasHydrated}
                      className="qs-btn mt-2 min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      <span>{submitting ? "Joining…" : "Join room"}</span>
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>

          {joined ? (
            <div
              ref={joinedRef}
              tabIndex={-1}
              role="status"
              aria-live="polite"
              className={cn(
                styles.joinedLayer,
                joinedRevealed && styles.joinedRevealed,
                reduced && styles.joinedLayerReduced
              )}
            >
              <div className={styles.joinedCircle}>
                <SecureLogo variant="mark" size={44} />
              </div>
              <span className="mt-4 inline-block rounded-full border-2 border-[var(--qs-ok)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
                {alreadyJoined ? "Already joined" : "Joined"}
              </span>
              <h2
                className={cn(
                  "qs-display mt-3 max-w-full break-words text-3xl text-[var(--qs-ink)]",
                  styles.joinedName
                )}
              >
                {joined.room.name}
              </h2>
              <p className="mt-2 text-sm text-[var(--qs-muted)]">
                {alreadyJoined
                  ? "You're already a member of this room. Your teacher can see you here."
                  : "You're in. Your teacher can see you in the room."}
              </p>

              <TeacherPublicCard teacher={joined.teacher} className="mt-5 w-full" />

              <div className="mt-6 grid w-full gap-2.5">
                <Link
                  href={`/rooms/${joined.room.id}`}
                  className="qs-btn min-h-12 w-full text-base"
                >
                  Open room
                </Link>
                <button
                  type="button"
                  onClick={handleJoinAnother}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                >
                  Join another room
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <Curtain phase={curtain} />
      </div>
    </div>
  );
}
