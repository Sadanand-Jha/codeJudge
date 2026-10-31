"use client";

import { useEffect, useState } from "react";
import { BookOpen, KeyRound, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import RoomJoinForm from "./RoomJoinForm";
import { RevealWords, Stagger, usePrefersReducedMotion } from "./roomMotion";
import styles from "./RoomsJoin.module.css";
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
      className={cn(styles.root, "qs-onest")}
      data-ambient={ambientPaused ? "paused" : "running"}
    >
      <section className={styles.hero}>
        <i className={styles.heroA} aria-hidden="true" />
        <i className={styles.heroB} aria-hidden="true" />
        <i className={styles.heroC} aria-hidden="true" />
        <i className={styles.heroD} aria-hidden="true" />

        <div className={styles.heroInner}>
          <span className={styles.pill}>CLASS ROOMS</span>
          <RevealWords
            as="h1"
            text="Join your class room"
            animate={animate}
            className={styles.title}
          />
          <p className={styles.subtitle}>
            Your teacher sent a room code and a password on WhatsApp. Enter both and
            you&apos;re in.
          </p>

          <Stagger
            as="ol"
            className={styles.steps}
            animate={animate}
            step={120}
            baseDelay={1800}
          >
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepIcon} aria-hidden="true">
                  <step.icon className="h-4 w-4" />
                </span>
                <div>
                  <span className={styles.stepIndex}>0{index + 1}</span>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={styles.stepBody}>{step.body}</p>
                </div>
              </li>
            ))}
          </Stagger>
        </div>
      </section>

      <div className={styles.stage}>
        <RoomJoinForm initialCode={initialCode} animate={animate} compact={isCompact} />
      </div>

      <p className={styles.help}>
        Need help? Ask your teacher for the code and password again — passwords are never
        shown on this page.
      </p>
    </div>
  );
}
