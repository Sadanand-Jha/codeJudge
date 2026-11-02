"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, UserRound, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  needsProfileCompletion,
  PROFILE_EDIT_PATH,
} from "@/utils/profileCompletion";

const subscribe = () => () => {};

export default function CompleteProfileModal() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const [dismissed, setDismissed] = useState(false);

  const shouldShow =
    mounted &&
    hasHydrated &&
    isAuthenticated &&
    !dismissed &&
    needsProfileCompletion(user);

  useEffect(() => {
    if (!shouldShow) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  const goToProfile = () => {
    setDismissed(true);
    router.push(PROFILE_EDIT_PATH);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0d0921]/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setDismissed(true);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-profile-title"
        aria-describedby="complete-profile-description"
        className="w-full max-w-md overflow-hidden rounded-t-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[0_24px_80px_rgba(13,9,33,0.35)] sm:rounded-[20px]"
      >
        <div className="relative p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--qs-sun)]/30 blur-2xl"
          />
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Close complete profile prompt"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-[9px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex items-start gap-3">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]">
              <UserRound className="h-6 w-6" strokeWidth={2.4} />
              <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-[var(--qs-sun)]" />
            </span>
            <div className="min-w-0 pr-6">
              <h2
                id="complete-profile-title"
                className="text-base font-extrabold tracking-tight text-[var(--qs-ink)]"
              >
                Complete your profile
              </h2>
              <p
                id="complete-profile-description"
                className="mt-1 text-[13px] leading-[1.55] text-[var(--qs-muted)]"
              >
                Your teacher and classmates currently see{" "}
                <span className="font-bold text-[var(--qs-ink)]">
                  @{user?.username ?? "your username"}
                </span>
                . Add your full name so they can recognize you in rooms.
              </p>
            </div>
          </div>

          <div className="relative mt-4 rounded-[12px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
              Missing from your profile
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-[var(--qs-ink)]">
              <span className="grid h-4 w-4 place-items-center rounded-full border-2 border-[var(--qs-warn)] text-[9px] text-[var(--qs-warn)]">
                !
              </span>
              Full name
            </p>
          </div>

          <div className="relative mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex h-10 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={goToProfile}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              Complete profile
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
