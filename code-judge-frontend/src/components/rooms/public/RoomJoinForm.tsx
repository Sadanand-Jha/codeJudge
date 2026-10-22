"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { joinRoom, type JoinedRoom } from "@/services/rooms";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/helpers";
import { isValidRoomCodeInput, normalizeRoomCodeInput } from "@/utils/roomShare";
import { Curtain, usePrefersReducedMotion, type CurtainPhase } from "./roomMotion";
import styles from "./roomsCinematic.module.css";

const DRAFT_KEY = "quizsupport_room_join_draft";

interface RoomJoinDraft {
  code: string;
  password: string;
}

interface RoomJoinFormProps {
  initialCode?: string;
  animate?: boolean;
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

export default function RoomJoinForm({ initialCode = "", animate = false }: RoomJoinFormProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const reduced = usePrefersReducedMotion();

  const [code, setCode] = useState(() => normalizeRoomCodeInput(initialCode));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [joined, setJoined] = useState<JoinedRoom | null>(null);
  const [formFading, setFormFading] = useState(false);
  const [curtain, setCurtain] = useState<CurtainPhase>("idle");
  const [joinedRevealed, setJoinedRevealed] = useState(false);

  const didRestore = useRef(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const joinedRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

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

  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;

    queueMicrotask(() => {
      const draft = readDraft();
      if (!draft) return;
      sessionStorage.removeItem(DRAFT_KEY);
      if (draft.code) setCode(draft.code);
      if (draft.password) setPassword(draft.password);
    });
  }, []);

  useEffect(() => {
    if (!animate || joined) return;

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
  }, [animate, joined]);

  const codeComplete = code.length === 6;
  const valid = isValidRoomCodeInput(code) && password.length > 0;

  const inlineError =
    error ||
    (touched && !codeComplete
      ? "Enter the full 6-character room code."
      : touched && codeComplete && password.length === 0
        ? "Enter the password from your teacher's message."
        : null);

  function triggerShake() {
    if (reduced) return;
    setShaking(true);
    schedule(() => setShaking(false), 360);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (!valid || joined) return;

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
      const result = await joinRoom({ room_code: code, password });

      if (reduced) {
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Wrong room code or password"));
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  }

  function handleJoinAnother() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setJoined(null);
    setFormFading(false);
    setJoinedRevealed(false);
    setCurtain("idle");
    setShaking(false);
    setError(null);
    setTouched(false);
    setPassword("");
    setShowPassword(false);
    setCode("");
    queueMicrotask(() => codeInputRef.current?.focus());
  }

  return (
    <div className={styles.joinStage}>
      <span className={styles.offsetBlock} aria-hidden="true">
        <span className={cn(styles.offsetBlockClapper, animate && styles.offsetBlockAnimated)}>
          <span className={cn(styles.offsetBlockFill, styles.ambient)} />
        </span>
      </span>

      <div
        className={cn(
          "qs-card",
          styles.joinCard,
          animate && styles.cardAnimated,
          shaking && styles.shake
        )}
      >
        <div className={styles.joinStack}>
          <div
            className={cn(styles.formLayer, formFading && styles.formLayerHidden)}
            aria-hidden={joined ? true : undefined}
          >
            <form onSubmit={handleSubmit} noValidate autoComplete="off" inert={joined ? true : undefined}>
              <h2 className="qs-display text-2xl text-[var(--qs-ink)]">Enter room details</h2>
              <p className="mt-1 text-sm text-[var(--qs-muted)]">
                Nothing to install. Works on phone and laptop.
              </p>

              <label
                htmlFor="room-code"
                className="mt-5 block text-sm font-bold text-[var(--qs-ink)]"
              >
                Room code
              </label>
              <div
                className={cn(
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
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
                <span>{submitting ? "Joining…" : "Join room"}</span>
              </button>
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
                <svg className={styles.checkSvg} viewBox="0 0 32 32" aria-hidden="true">
                  <path
                    d="M8 16.5 13.5 22 24 10.5"
                    pathLength={1}
                    className={cn(styles.checkPath, joinedRevealed && styles.checkPathDrawn)}
                  />
                </svg>
              </div>
              <span className="mt-4 inline-block rounded-full border-2 border-[var(--qs-ok)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
                Joined
              </span>
              <h2 className={cn("qs-display mt-3 text-3xl text-[var(--qs-ink)]", styles.joinedName)}>
                {joined.room.name}
              </h2>
              <p className="mt-2 text-sm text-[var(--qs-muted)]">
                You&apos;re in. Your teacher can see you in the room.
              </p>

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
