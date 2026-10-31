"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Plus, ShieldCheck, Zap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { isValidRoomCodeInput, normalizeRoomCodeInput } from "@/utils/roomShare";
import styles from "./StudentDashboard.module.css";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function StudentDashboardHero() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const codeRef = useRef<HTMLInputElement>(null);
  const [letters, setLetters] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomPassword, setRoomPassword] = useState("");

  const firstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    "there";
  const greeting = greetingForHour(new Date().getHours());

  const quizCode = normalizeQuizCode(letters);
  const quizValid = isValidQuizCode(quizCode);
  const roomValid = isValidRoomCodeInput(roomCode) && roomPassword.length > 0;

  const focusCode = () => {
    const input = codeRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => input.focus({ preventScroll: true }), 350);
  };

  const handleQuizCode = (value: string) => {
    setLetters(normalizeQuizCode(value.replace(/[^a-zA-Z]/g, "")).slice(0, 16));
  };

  const handleRoomCode = (value: string) => {
    setRoomCode(normalizeRoomCodeInput(value));
  };

  const joinQuiz = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quizValid) return;
    router.push(`/quiz/join?code=${quizCode}`);
  };

  const joinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomValid) return;
    router.push(`/rooms?code=${roomCode}#p=${encodeURIComponent(roomPassword)}`);
  };

  return (
    <div className={styles.root}>
      <section className={styles.hero} aria-labelledby="student-dashboard-title">
        <i className={styles.heroA} aria-hidden="true" />
        <i className={styles.heroB} aria-hidden="true" />
        <i className={styles.heroC} aria-hidden="true" />
        <i className={styles.heroD} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.top}>
            <div>
              <span className={styles.pill}>STUDENT DASHBOARD</span>
              <h1 id="student-dashboard-title" className={styles.greeting}>
                {greeting}, {firstName}
              </h1>
              <p className={styles.subtitle}>Here’s what’s happening with your quizzes.</p>
            </div>

            <div className={styles.actions}>
              <span className={styles.keyPill}>
                <ShieldCheck className="h-4 w-4" />
                Private by default · answers stay secure
              </span>
              <button type="button" onClick={focusCode} className={styles.cta}>
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.6} />
                Join quiz
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.tiles} aria-label="Join options">
        <article className={styles.tile}>
          <div className={styles.tileIcon}>
            <Zap className="h-[26px] w-[26px]" fill="currentColor" />
          </div>
          <h2 className={styles.tileTitle}>Join with code</h2>
          <p className={styles.tileText}>
            Got a quiz code? Enter the 16-character code your teacher shared and start right away.
          </p>
          <form onSubmit={joinQuiz} className={styles.tileForm} noValidate>
            <input
              ref={codeRef}
              id="student-quiz-code"
              value={formatQuizCode(letters)}
              onChange={(event) => handleQuizCode(event.target.value)}
              placeholder="ABCD-EFGH-IJKL-MNOP"
              maxLength={19}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-label="Quiz code"
              className={styles.input}
            />
            <button type="submit" disabled={!quizValid} className={styles.joinBtn}>
              Join quiz
            </button>
          </form>
        </article>

        <article className={`${styles.tile} ${styles.tileDark}`}>
          <span className={styles.live}>LIVE</span>
          <div className={styles.tileIcon}>
            <MessageCircle className="h-[26px] w-[26px]" strokeWidth={2.2} />
          </div>
          <h2 className={styles.tileTitle}>Join teacher’s room</h2>
          <p className={styles.tileText}>
            Step into your class room for notes and messages. Enter the room code and password your
            teacher gave you.
          </p>
          <form onSubmit={joinRoom} className={styles.roomForm} noValidate>
            <input
              value={roomCode.replace(/(.{4})(?=.)/, "$1-")}
              onChange={(event) => handleRoomCode(event.target.value)}
              placeholder="AB23-CD"
              maxLength={7}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-label="Room code"
              className={styles.input}
            />
            <input
              type="password"
              value={roomPassword}
              onChange={(event) => setRoomPassword(event.target.value)}
              placeholder="Room password"
              autoComplete="off"
              aria-label="Room password"
              className={styles.input}
            />
            <button type="submit" disabled={!roomValid} className={styles.joinBtn}>
              Join room
            </button>
          </form>
        </article>
      </section>

      <p className={styles.note}>
        <ShieldCheck className="h-4 w-4" />
        Every quiz code is verified before a quiz begins.
      </p>
    </div>
  );
}
