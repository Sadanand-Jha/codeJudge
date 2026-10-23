"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/helpers";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { isValidRoomCodeInput, normalizeRoomCodeInput } from "@/utils/roomShare";

const HUB_STATS = [
  { label: "Practice tests", value: 24, sun: true },
  { label: "Exams", value: 6, sun: false },
  { label: "Rooms joined", value: 1, sun: false },
] as const;

const ASSURANCES = ["Free to start", "Instant results", "Works on any phone"] as const;

type JoinTab = "quiz" | "room";

const labelCls = "mb-1.5 block text-sm font-bold text-[var(--qs-ink)]";
const inputCls =
  "w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-[13px] font-mono text-base font-bold uppercase tracking-[0.1em] text-[var(--qs-ink)] outline-none transition-colors placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";
const passwordCls =
  "w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-[13px] text-base font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

export default function QuizHubHero() {
  const router = useRouter();
  const [tab, setTab] = useState<JoinTab>("quiz");
  const [letters, setLetters] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");

  const quizCode = normalizeQuizCode(letters);
  const quizValid = isValidQuizCode(quizCode);
  const roomValid = isValidRoomCodeInput(roomCode) && password.length > 0;
  const valid = tab === "quiz" ? quizValid : roomValid;

  const helper = valid
    ? ""
    : tab === "quiz"
      ? "Enter the full 16-character quiz code to continue."
      : "Enter the room code and password your teacher shared.";

  const handleQuizCode = (value: string) => {
    setLetters(normalizeQuizCode(value.replace(/[^a-zA-Z]/g, "")).slice(0, 16));
  };

  const handleRoomCode = (value: string) => {
    setRoomCode(normalizeRoomCodeInput(value));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (tab === "quiz") {
      if (!quizValid) return;
      router.push(`/quiz/join?code=${quizCode}`);
      return;
    }
    if (!roomValid) return;
    router.push(`/rooms?code=${roomCode}#p=${encodeURIComponent(password)}`);
  };

  return (
    <header className="grid items-center gap-10 pt-4 lg:grid-cols-[1.1fr_.9fr] lg:gap-10">
      <div>
        <span className="inline-flex items-center rounded-full border-2 border-[#1a1240] bg-[var(--qs-sun)] px-2.5 py-[3px] text-[12px] font-extrabold uppercase tracking-[0.05em] text-[#1a1240]">
          For teachers and students
        </span>

        <h1 className="mt-4 max-w-[13em] text-[clamp(42px,6vw,76px)] font-extrabold leading-[1.06] tracking-[-0.025em]">
          Make a quiz in minutes.{" "}
          <span className="text-[var(--qs-brand)]">Share it with a code.</span>
        </h1>

        <p className="mb-[22px] mt-4 max-w-[520px] text-[17px] leading-[1.5] text-[var(--qs-ink)] opacity-80">
          Join a live quiz, step into your teacher’s room for notes and messages, or practice
          for JEE, NEET, GATE, SSC, UPSC and Banking.
        </p>

        <div className="flex flex-wrap gap-2">
          {ASSURANCES.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3.5 py-[7px] text-[13px] font-bold text-[var(--qs-ink)]"
            >
              <Check className="h-[18px] w-[18px] shrink-0 text-[var(--qs-ok)]" strokeWidth={2.5} />
              {item}
            </span>
          ))}
        </div>

        <div className="mt-[26px] grid max-w-[520px] grid-cols-3 gap-3">
          {HUB_STATS.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-[18px] border-2 px-4 py-3",
                stat.sun
                  ? "border-[#1a1240] bg-[var(--qs-sun)] text-[#1a1240]"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]"
              )}
            >
              <span
                className={cn(
                  "block text-[12px] font-extrabold uppercase tracking-[0.08em]",
                  stat.sun ? "text-[#1a1240]" : "text-[var(--qs-muted)]"
                )}
              >
                {stat.label}
              </span>
              <b className="qs-display mt-1.5 block text-[32px] leading-[1.1]">{stat.value}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mr-4 mb-4">
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-4 translate-y-4 rounded-[30px] bg-[var(--qs-sun)]"
        />
        <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
          <div className="flex items-center gap-3.5 border-b-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-[22px] py-[18px] text-[var(--qs-on-brand)]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2 border-[#1a1240] bg-[var(--qs-sun)] text-[#1a1240]">
              <Zap className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <p className="qs-display text-[24px] leading-none">Join in seconds</p>
              <p className="mt-1 text-[13px] leading-none opacity-90">Quiz code or room password</p>
            </div>
            <span className="ml-auto inline-flex shrink-0 items-center rounded-full border-2 border-current px-2.5 py-[3px] text-[12px] font-extrabold uppercase tracking-[0.05em]">
              Live
            </span>
          </div>

          <div className="p-[22px]">
            <div role="tablist" aria-label="Join type" className="mb-4 flex gap-1.5">
              {(["quiz", "room"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  onClick={() => setTab(item)}
                  className={cn(
                    "flex-1 rounded-full border-2 px-3 py-[9px] text-sm font-bold transition-colors",
                    tab === item
                      ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                  )}
                >
                  {item === "quiz" ? "Quiz code" : "Room"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate autoComplete="off">
              {tab === "quiz" ? (
                <div className="mb-3">
                  <label htmlFor="hub-quiz-code" className={labelCls}>
                    Quiz code
                  </label>
                  <input
                    id="hub-quiz-code"
                    type="text"
                    value={formatQuizCode(letters)}
                    onChange={(event) => handleQuizCode(event.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    maxLength={19}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className={inputCls}
                  />
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label htmlFor="hub-room-code" className={labelCls}>
                      Room code
                    </label>
                    <input
                      id="hub-room-code"
                      type="text"
                      value={roomCode.replace(/(.{4})(?=.)/, "$1-")}
                      onChange={(event) => handleRoomCode(event.target.value)}
                      placeholder="AB23-CD"
                      maxLength={7}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      className={inputCls}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="hub-room-password" className={labelCls}>
                      Password
                    </label>
                    <input
                      id="hub-room-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      autoComplete="off"
                      className={passwordCls}
                    />
                  </div>
                </>
              )}

              <p
                role="status"
                className="mb-3 mt-0.5 min-h-5 text-[13px] leading-5 text-[var(--qs-muted)]"
              >
                {helper}
              </p>

              <button type="submit" disabled={!valid} className="qs-btn w-full rounded-[14px]">
                {tab === "quiz" ? "Join quiz" : "Join room"}
              </button>

              <p className="mt-3.5 rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-2.5 py-2.5 text-center text-[13px] leading-5 text-[var(--qs-muted)]">
                {tab === "quiz" ? (
                  <>
                    Your teacher shares a 16-character code like{" "}
                    <b className="font-extrabold text-[var(--qs-ink)]">ABCD-1234-EFGH-5678</b>
                  </>
                ) : (
                  <>Ask your teacher for the room code and password.</>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
