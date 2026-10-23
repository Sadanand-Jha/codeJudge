"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { BookOpen, KeyRound, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import RoomJoinForm from "./RoomJoinForm";
import { Reveal, RevealWords, Stagger, usePrefersReducedMotion } from "./roomMotion";
import styles from "./roomsCinematic.module.css";
import { normalizeRoomCodeInput } from "@/utils/roomShare";

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
  const [sequence, setSequence] = useState<"running" | "done">("running");
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [initialCode, setInitialCode] = useState("");
  const reduced = usePrefersReducedMotion();
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const animate = sequence === "running" && !reduced;

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

    timer = window.setTimeout(finish, isCompact ? 420 : 2900);
    document.addEventListener("pointerdown", skip, true);
    document.addEventListener("keydown", skip, true);

    return () => {
      finished = true;
      cleanup();
    };
  }, [isCompact, reduced]);

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
    });
  }, []);

  return (
    <div
      className={cn(
        styles.root,
        "isolate min-h-[calc(100dvh-3.5rem)] overflow-x-hidden bg-[var(--qs-bg)] px-4 pb-12 pt-5 sm:px-6"
      )}
      data-ambient={ambientPaused ? "paused" : "running"}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block"
      >
        <Image
          src="/images/room/jungle.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center saturate-[0.9]"
        />
        <div className="absolute inset-0 bg-[var(--qs-bg)]/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--qs-bg)]" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1100px]">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section
            className={cn(
              "hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 sm:p-7 lg:block",
              styles.heroCard,
              animate && styles.heroCardAnimated
            )}
          >
            <span
              className={cn(
                "inline-block rounded-full bg-[var(--qs-sun)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#1A1240]",
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
          </section>

          <RoomJoinForm initialCode={initialCode} animate={animate} compact={isCompact} />
        </div>

        <Reveal
          as="p"
          className="mx-auto mt-8 w-fit max-w-full rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-center text-xs font-semibold text-[var(--qs-ink)] shadow-[0_2px_0_var(--qs-line)]"
        >
          Need help? Ask your teacher for the code and password again — passwords are never
          shown on this page.
        </Reveal>
      </div>
    </div>
  );
}
