"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  CircleAlert,
  GraduationCap,
  Presentation,
  Sparkles,
} from "lucide-react";
import { useAuthStore, type UserProfile } from "@/store/authStore";
import { checkUsername, completeOAuthProfile } from "@/services/auth";
import { validateUsername } from "@/lib/validators";
import { getApiErrorMessage } from "@/lib/apiError";
import { safeNextPath } from "@/lib/safeNext";
import { toast } from "@/lib/toast";
import { PREDEFINED_AVATARS } from "@/config/dicebear";
import { needsOAuthProfileSetup } from "@/utils/profileCompletion";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthLoader } from "@/components/auth/AuthThemeChrome";

const INPUT_CLASS =
  "h-[3.125rem] w-full rounded-[0.875rem] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] pl-11 pr-4 text-[0.9375rem] font-medium text-[var(--qs-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[#8b86a8] focus:border-[var(--qs-brand)] focus:ring-4 focus:ring-[var(--qs-brand)]/15";

const LABEL_CLASS =
  "mb-2 block text-[0.71875rem] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]";

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams]
  );
  const hydrate = useAuthStore((state) => state.hydrate);
  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<"student" | "teacher" | null>(
    null
  );
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: "" });
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(
    PREDEFINED_AVATARS[0].url
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void hydrate().finally(() => {
      if (!cancelled) setAuthChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated || !authChecked) return;

    if (!isAuthenticated) {
      const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
      router.replace(`/login${query}`);
      return;
    }

    if (!needsOAuthProfileSetup(currentUser)) {
      router.replace(
        nextPath ||
          (currentUser?.role?.toLowerCase() === "teacher" ? "/creator" : "/quiz")
      );
    }
  }, [authChecked, currentUser, hasHydrated, isAuthenticated, nextPath, router]);

  const handleUsernameChange = useCallback((raw: string) => {
    const value = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    setUsername(value);
    setUsernameError(null);
    setSubmitError(null);

    const checkId = ++checkIdRef.current;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const formatError = validateUsername(value);
    if (formatError) {
      setUsernameError(value ? formatError : null);
      setUsernameStatus({ checking: false, available: null, message: "" });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: "" });
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsername(value);
        if (checkId !== checkIdRef.current) return;
        setUsernameStatus({
          checking: false,
          available: result.available,
          message: result.message,
        });
      } catch {
        if (checkId !== checkIdRef.current) return;
        setUsernameStatus({ checking: false, available: null, message: "" });
      }
    }, 500);
  }, []);

  const canContinue =
    accountType !== null &&
    username.length >= 3 &&
    !usernameError &&
    usernameStatus.available === true &&
    !usernameStatus.checking;

  const isReady = canContinue && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReady || !accountType) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await completeOAuthProfile({
        username,
        avatar_url: selectedAvatarUrl,
        account_type: accountType,
      });

      if (!result.success) {
        const message = result.message || "Could not save your profile.";
        setSubmitError(message);
        toast.error(message);
        return;
      }

      const updated = result.data?.user as UserProfile | undefined;
      if (updated) {
        setUser(updated);
      } else {
        await useAuthStore.getState().fetchMe();
      }

      toast.success("Your profile is ready!");
      router.replace(nextPath || (accountType === "teacher" ? "/creator" : "/quiz"));
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Could not save your profile. Please try again."
      );
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasHydrated || !authChecked) {
    return (
      <div className="qs-ui flex min-h-dvh items-center justify-center">
        <AuthLoader />
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow={`STEP ${step} OF 2`}
      title={
        step === 1 ? (
          <>
            Make it
            <br />
            yours.
          </>
        ) : (
          <>
            Pick your
            <br />
            look.
          </>
        )
      }
      description={
        step === 1
          ? "Tell us how you'll use QuizSupport."
          : "Choose an avatar. You can change it later in settings."
      }
    >
      <div className="mb-5 flex items-start gap-3 rounded-[0.875rem] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[0.6875rem] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-[var(--qs-ink)]">
            Welcome, {currentUser?.firstName || "there"}!
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--qs-muted)]">
            {currentUser?.email}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        onKeyDown={(event) => {
          if (
            step === 1 &&
            event.key === "Enter" &&
            event.target instanceof HTMLInputElement
          ) {
            event.preventDefault();
            if (canContinue) setStep(2);
          }
        }}
      >
        {step === 1 && (
          <>
            <span className={LABEL_CLASS}>I&rsquo;m joining as</span>
        <div className="mb-5 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Choose account type">
          {([
            {
              id: "student" as const,
              icon: GraduationCap,
              title: "Student",
              description: "Join quizzes and track results.",
            },
            {
              id: "teacher" as const,
              icon: Presentation,
              title: "Teacher",
              description: "Create quizzes and manage learners.",
            },
          ]).map(({ id, icon: Icon, title, description }) => {
            const selected = accountType === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setAccountType(id);
                  setSubmitError(null);
                }}
                className={`relative rounded-[1rem] border-2 p-3 text-left transition-all duration-200 focus-visible:outline-none ${
                  selected
                    ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/[0.08]"
                    : "border-[var(--qs-line)] bg-[var(--qs-bg)] hover:border-[var(--qs-brand)]/50"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-[0.6875rem] ${
                    selected
                      ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                      : "bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="mt-2 block text-sm font-extrabold text-[var(--qs-ink)]">
                  {title}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] leading-[1rem] text-[var(--qs-muted)]">
                  {description}
                </span>
                {selected && (
                  <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label htmlFor="complete-profile-username" className={LABEL_CLASS}>
          Username
        </label>
        <div className="relative mb-2">
          <AtSign className="pointer-events-none absolute left-[0.9375rem] top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--qs-muted)]" />
          <input
            id="complete-profile-username"
            type="text"
            value={username}
            onChange={(event) => handleUsernameChange(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            autoFocus
            name="complete-profile-username"
            data-lpignore="true"
            data-1p-ignore="true"
            className={INPUT_CLASS}
            placeholder="Choose a username"
          />
        </div>
        <div className="mb-4 min-h-5" aria-live="polite">
          {usernameError ? (
            <p className="text-xs text-[var(--qs-bad)]">{usernameError}</p>
          ) : usernameStatus.checking ? (
            <p className="flex items-center gap-1.5 text-xs text-[var(--qs-muted)]">
              <AuthLoader className="h-3 w-3" /> Checking availability…
            </p>
          ) : usernameStatus.available === false ? (
            <p className="text-xs text-[var(--qs-bad)]">{usernameStatus.message}</p>
          ) : usernameStatus.available === true ? (
            <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--qs-ok)]">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Username available
            </p>
          ) : (
            <p className="text-xs text-[var(--qs-muted)]">
              Only lowercase letters and numbers, 3–20 characters.
            </p>
          )}
        </div>

          </>
        )}

        {step === 2 && (
          <>
            <span className={LABEL_CLASS}>Avatar</span>
            <div className="mb-4 flex justify-center">
              <span className="block h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--qs-brand)] ring-2 ring-[var(--qs-brand)]/20">
                <Image
                  src={selectedAvatarUrl}
                  alt="Selected avatar"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  priority
                />
              </span>
            </div>
            <div
              className="mx-auto mb-5 grid max-w-[16.875rem] grid-cols-3 gap-2.5"
              role="radiogroup"
              aria-label="Choose your avatar"
            >
              {PREDEFINED_AVATARS.map((avatar) => {
                const selected = selectedAvatarUrl === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={avatar.label}
                    onClick={() => setSelectedAvatarUrl(avatar.url)}
                    className={`relative mx-auto h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border-2 p-1 transition-all duration-200 active:scale-95 focus-visible:outline-none ${
                      selected
                        ? "border-[var(--qs-brand)] ring-2 ring-[var(--qs-brand)]/20"
                        : "border-[var(--qs-line)] hover:border-[var(--qs-brand)]/60"
                    }`}
                  >
                    <Image
                      src={avatar.url}
                      alt=""
                      width={96}
                      height={96}
                      className="h-full w-full rounded-full object-cover"
                    />
                    {selected && (
                      <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-[var(--qs-surface)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 1 ? (
          <button
            type="button"
            onClick={() => {
              setSubmitError(null);
              setStep(2);
            }}
            disabled={!canContinue}
            className="b b-pri b-lg b-full group disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span>Continue</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : (
          <>
            {submitError && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-4 flex items-start gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3.5 py-3 text-xs font-semibold leading-relaxed text-[var(--qs-bad)]"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setStep(1);
                }}
                disabled={submitting}
                className="b b-lg b-ghost gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={!isReady}
                className="b b-pri b-lg b-full group flex-1 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting && <AuthLoader className="h-4 w-4 text-current" />}
                <span>{submitting ? "Saving…" : "Start exploring"}</span>
                {!submitting && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </AuthShell>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="qs-ui flex min-h-dvh items-center justify-center">
          <AuthLoader />
        </div>
      }
    >
      <CompleteProfileContent />
    </Suspense>
  );
}
