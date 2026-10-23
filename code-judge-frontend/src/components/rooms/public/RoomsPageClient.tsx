"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { BookOpen, KeyRound, MessageSquareText } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/helpers";
import RoomJoinForm from "./RoomJoinForm";
import RoomSharePanel from "./RoomSharePanel";
import { Reveal, RevealWords, Stagger, usePrefersReducedMotion } from "./roomMotion";
import styles from "./roomsCinematic.module.css";
import { normalizeRoomCodeInput } from "@/utils/roomShare";

type RoleTab = "student" | "teacher";
type ViewTransition = "idle" | "leaving" | "entering";

const TABS: Array<{ id: RoleTab; label: string }> = [
  { id: "student", label: "I'm a student" },
  { id: "teacher", label: "I'm a teacher" },
];

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Open the link",
    body: "Tap the QuizSupport link in the WhatsApp message.",
  },
  {
    icon: KeyRound,
    title: "Enter the room code",
    body: "It's 6 characters, like AB23CD.",
  },
  {
    icon: BookOpen,
    title: "Add the password",
    body: "Copy it from the same message.",
  },
];

export default function RoomsPageClient() {
  const [tab, setTab] = useState<RoleTab>("student");
  const [view, setView] = useState<RoleTab>("student");
  const [transition, setTransition] = useState<ViewTransition>("idle");
  const [sequence, setSequence] = useState<"running" | "done">("running");
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [initialCode, setInitialCode] = useState("");
  const reduced = usePrefersReducedMotion();
  const animate = sequence === "running" && !reduced;
  const transitionTimers = useRef<number[]>([]);

  useEffect(() => {
    if (reduced) return;

    let finished = false;
    let timer = 0;

    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", skip, true);
      document.removeEventListener("keydown", skip, true);
    }

    function finish() {
      if (finished) return;
      finished = true;
      cleanup();
      setSequence("done");
    }

    function skip() {
      finish();
    }

    timer = window.setTimeout(finish, 2900);
    document.addEventListener("pointerdown", skip, true);
    document.addEventListener("keydown", skip, true);

    return () => {
      finished = true;
      cleanup();
    };
  }, [reduced]);

  useEffect(() => {
    const update = () => setAmbientPaused(document.visibilityState === "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) setInitialCode(normalizeRoomCodeInput(code));
      if (params.get("tab") === "teacher") {
        setTab("teacher");
        setView("teacher");
      }
    });
  }, []);

  useEffect(() => {
    const timers = transitionTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  function selectTab(next: RoleTab) {
    if (next === tab || transition !== "idle") return;

    setTab(next);

    const url = new URL(window.location.href);
    if (next === "teacher") url.searchParams.set("tab", "teacher");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.toString());

    setTransition("leaving");
    const leave = window.setTimeout(() => {
      setView(next);
      setTransition("entering");
      const enter = window.setTimeout(() => setTransition("idle"), reduced ? 150 : 300);
      transitionTimers.current.push(enter);
    }, reduced ? 150 : 200);
    transitionTimers.current.push(leave);
  }

  return (
    <div
      className={cn(
        styles.root,
        "min-h-dvh bg-[var(--qs-bg)] px-4 pb-12 pt-5 sm:px-6"
      )}
      data-ambient={ambientPaused ? "paused" : "running"}
    >
      <div className="mx-auto w-full max-w-[1100px]">
        <header className="mb-7 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="QuizSupport home"
          >
            <SecureLogo size={36} variant="mark" />
            <span className="qs-display text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)]">
              QuizSupport
            </span>
          </Link>
          <ThemeToggle
            variant="icon"
            className={cn(
              "h-10 w-10 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]",
              animate && styles.toggleFadeAnimated
            )}
          />
        </header>

        <div
          role="tablist"
          aria-label="Role"
          className={cn("mb-6 flex flex-wrap gap-2", animate && styles.tablistAnimated)}
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`rooms-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls="rooms-panel"
              onClick={() => selectTab(item.id)}
              className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${
                tab === item.id
                  ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          id="rooms-panel"
          role="tabpanel"
          aria-labelledby={`rooms-tab-${view}`}
          className={cn(
            transition === "leaving" && styles.viewLeave,
            transition === "entering" && styles.viewEnter
          )}
        >
          {view === "student" ? (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <section
                className={cn(
                  "rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 sm:p-7",
                  styles.heroCard,
                  animate && styles.heroCardAnimated
                )}
              >
                <span
                  className={cn(
                    "inline-block rounded-full bg-[var(--qs-sun)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-ink)]",
                    animate && styles.pillAnimated
                  )}
                >
                  Rooms
                </span>
                <RevealWords
                  as="h1"
                  text="Join your class room"
                  animate={animate}
                  className="qs-display mt-4 text-[clamp(30px,4vw,46px)] text-[var(--qs-ink)]"
                />
                <p
                  className={cn(
                    "mt-2 text-sm text-[var(--qs-muted)]",
                    animate && styles.fadeUpAnimated
                  )}
                  style={{ "--fade-delay": "1500ms" } as CSSProperties}
                >
                  Your teacher sent a room code and a password on WhatsApp. Enter both and
                  you&apos;re in.
                </p>

                <Stagger
                  as="ol"
                  className="mt-6 grid gap-4"
                  animate={animate}
                  step={120}
                  baseDelay={1800}
                >
                  {STEPS.map((step) => (
                    <li key={step.title} className="flex items-start gap-3.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-[var(--qs-bg)]">
                        <step.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="qs-display text-base text-[var(--qs-ink)]">{step.title}</p>
                        <p className="text-[13px] text-[var(--qs-muted)]">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </Stagger>

                <div
                  className={cn(
                    "mt-6 rounded-2xl border-2 border-dashed border-[var(--qs-line)] p-3.5 text-center text-[13px] text-[var(--qs-muted)]",
                    animate && styles.fadeUpAnimated
                  )}
                  style={{ "--fade-delay": "2160ms" } as CSSProperties}
                >
                  Room codes are not case-sensitive — we uppercase them for you.
                </div>
              </section>

              <RoomJoinForm initialCode={initialCode} animate={animate} />
            </div>
          ) : (
            <RoomSharePanel animate={animate} />
          )}
        </div>

        <Reveal as="p" className="mt-8 text-center text-xs text-[var(--qs-muted)]">
          Need help? Ask your teacher for the code and password again — passwords are never
          shown on this page.
        </Reveal>
      </div>
    </div>
  );
}
