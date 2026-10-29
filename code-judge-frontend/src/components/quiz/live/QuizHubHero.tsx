"use client";

import {
  Fragment,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/helpers";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { isValidRoomCodeInput, normalizeRoomCodeInput } from "@/utils/roomShare";

const ASSURANCES = [
  { label: "Free to start", icon: "check" },
  { label: "Instant results", icon: "check" },
  { label: "Works on any phone", icon: "check" },
  { label: "Encrypted quiz links", icon: "lock" },
] as const;

type JoinTab = "quiz" | "room";

const labelCls = "mb-1.5 block text-sm font-bold text-[var(--qs-ink)]";
const inputCls =
  "w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-[13px] font-mono text-base font-bold uppercase tracking-[0.1em] text-[var(--qs-ink)] outline-none transition-colors placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";
const passwordCls =
  "w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-[13px] text-base font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

function SegmentedQuizCode({
  value,
  onChange,
  firstInputId,
}: {
  value: string;
  onChange: (value: string) => void;
  firstInputId?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const segments = Array.from({ length: 4 }, (_, index) =>
    value.slice(index * 4, index * 4 + 4)
  );

  const commit = (index: number, raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
    const next = segments
      .map((segment, segmentIndex) => (segmentIndex === index ? cleaned : segment))
      .join("");
    onChange(next);
    if (cleaned.length === 4 && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    const current = segments[index] ?? "";
    if (event.key === "Backspace" && current.length === 0 && index > 0) {
      event.preventDefault();
      const previousValue = segments[index - 1] ?? "";
      refs.current[index - 1]?.focus();
      if (previousValue.length > 0) {
        const next = segments
          .map((segment, segmentIndex) =>
            segmentIndex === index - 1 ? previousValue.slice(0, -1) : segment
          )
          .join("");
        onChange(next);
      }
      return;
    }
    if (
      event.key === "ArrowLeft" &&
      index > 0 &&
      event.currentTarget.selectionStart === 0
    ) {
      refs.current[index - 1]?.focus();
    }
    if (
      event.key === "ArrowRight" &&
      index < 3 &&
      event.currentTarget.selectionStart === current.length
    ) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const cleaned = event.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 16);
    if (!cleaned) return;
    event.preventDefault();
    onChange(cleaned);
    refs.current[Math.min(Math.floor((cleaned.length - 1) / 4), 3)]?.focus();
  };

  return (
    <div className="flex items-center gap-1.5">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          <input
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={index === 0 ? firstInputId : undefined}
            type="text"
            inputMode="text"
            value={segment}
            onChange={(event) => commit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            placeholder="XXXX"
            maxLength={4}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-label={`Quiz code, characters ${index * 4 + 1} to ${(index + 1) * 4}`}
            className="h-14 min-w-0 flex-1 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-0 text-center font-mono text-base font-bold uppercase tracking-[0.14em] text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
          />
          {index < 3 && (
            <span aria-hidden="true" className="shrink-0 text-sm font-bold text-[var(--qs-muted)]">
              -
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function SecureLinkCheck() {
  return (
    <div className="mt-4 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
      <div className="flex items-center gap-2 text-[13px] font-extrabold text-[var(--qs-ok)]">
        <ShieldCheck className="h-4 w-4" /> Secure link check
      </div>
      <div className="mt-3 flex gap-2">
        <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--qs-ok)] text-[#ffffff]">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <span className="text-[11px] font-bold text-[var(--qs-ink)]">Code sealed</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
          <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--qs-brand)] bg-[var(--qs-surface)] text-[12px] font-extrabold text-[var(--qs-brand)]">
            2
          </span>
          <span className="text-[11px] font-bold text-[var(--qs-ink)]">Link verified</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
          <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[12px] font-extrabold text-[var(--qs-muted)]">
            3
          </span>
          <span className="text-[11px] font-bold text-[var(--qs-ink)]">Quiz opens</span>
        </div>
      </div>
      <p className="mt-3 border-t border-[var(--qs-line)] pt-3 text-center text-[11px] leading-5 text-[var(--qs-muted)]">
        Your teacher shares a 16-character code like{" "}
        <b className="whitespace-nowrap font-mono font-bold text-[var(--qs-ink)]">ABCD-1234-EFGH-5678</b>
      </p>
    </div>
  );
}

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
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-3 shadow-[0_6px_0_var(--qs-ink)] sm:px-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-ink)]">
          <Lock className="h-3.5 w-3.5" /> Encrypted links
        </span>
        <span className="min-w-0 flex-1 text-[18px] font-extrabold tracking-[-0.01em] text-[#1a1240] sm:text-[22px]">
          Every quiz link is sealed and verified.
        </span>
        <Link
          href="/quiz/join"
          className="inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-[#1a1240] bg-[#1a1240] px-5 text-sm font-bold text-[#ffffff] transition-transform hover:-translate-y-0.5"
        >
          How it works <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <header className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:pt-4">
        <div className="hidden lg:block">
          <span className="inline-flex items-center rounded-full border-2 border-[#1a1240] bg-[var(--qs-sun)] px-2.5 py-[3px] text-[12px] font-extrabold uppercase tracking-[0.05em] text-[#1a1240]">
            For teachers and students
          </span>

          <h1 className="mt-4 max-w-[15em] text-[clamp(38px,4.2vw,54px)] font-extrabold leading-[1.06] tracking-[-0.025em]">
            <span className="block">Join a quiz in seconds.</span>
            <span className="quiz-hero-accent block">Your class is one code away.</span>
          </h1>

          <p className="mb-[22px] mt-4 max-w-[520px] text-[17px] leading-[1.5] text-[var(--qs-ink)] opacity-80">
            Join a live quiz, step into your teacher’s room for notes and messages, or practice
            with ready-made question sets.
          </p>

          <div className="flex flex-wrap gap-2">
            {ASSURANCES.map((item) => (
              <span
                key={item.label}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border-2 border-[var(--qs-ink)] px-3.5 py-[7px] text-[13px] font-bold text-[var(--qs-ink)]",
                  item.icon === "lock" ? "bg-[var(--qs-sun)]" : "bg-[var(--qs-surface)]"
                )}
              >
                {item.icon === "lock" ? (
                  <Lock className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} />
                ) : (
                  <Check className="h-[18px] w-[18px] shrink-0 text-[var(--qs-ok)]" strokeWidth={2.5} />
                )}
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mr-1 mb-1 min-w-0 lg:mr-4 lg:mb-4">
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-1 translate-y-1 rounded-[18px] bg-[var(--qs-sun)] lg:translate-x-4 lg:translate-y-4 lg:rounded-[30px]"
          />
          <div className="relative overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] lg:rounded-[28px]">
            <div className="flex items-center gap-3 border-b-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-4 text-[var(--qs-on-brand)] sm:px-[22px] sm:py-[18px]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2 border-[#1a1240] bg-[var(--qs-sun)] text-[#1a1240]">
                <Zap className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <p className="qs-display text-[22px] leading-none tracking-tight sm:text-[24px]">Join securely</p>
                <p className="mt-1 text-[13px] leading-none opacity-90">Quiz code or room password</p>
              </div>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.06em] sm:text-[11px]">
                <Lock className="h-3 w-3" /> Encrypted
              </span>
            </div>

            <div className="p-4 lg:p-[22px]">
              <div role="tablist" aria-label="Join type" className="mb-4 flex gap-1.5">
                {(["quiz", "room"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={tab === item}
                    onClick={() => setTab(item)}
                    className={cn(
                      "flex-1 rounded-full border-2 px-3 py-[9px] text-[13px] font-bold transition-colors lg:text-sm",
                      tab === item
                        ? "border-[#1a1240] bg-[#1a1240] text-[#ffffff]"
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
                    <SegmentedQuizCode
                      value={letters}
                      onChange={handleQuizCode}
                      firstInputId="hub-quiz-code"
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

                <button
                  type="submit"
                  disabled={!valid}
                  className="qs-btn w-full gap-2 rounded-[14px]"
                >
                  <Lock className="h-4 w-4" />
                  {tab === "quiz" ? "Join quiz securely" : "Join room securely"}
                </button>

                {tab === "quiz" ? (
                  <SecureLinkCheck />
                ) : (
                  <p className="mt-3.5 rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-2.5 py-2.5 text-center text-[13px] leading-5 text-[var(--qs-muted)]">
                    Ask your teacher for the room code and password.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
