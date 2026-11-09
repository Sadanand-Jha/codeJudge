"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { formatDurationMinutes } from "@/lib/formatters";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { WhatsAppText } from "@/components/common/WhatsAppText";
import { copyQuizCode } from "@/services/quiz";
import { toast } from "@/lib/toast";

export { WhatsAppIcon };

export type ShareQuizStatus = "live" | "draft" | "scheduled" | "completed";

export interface ShareQuizInfo {
  id: string;
  title: string;
  code: string;
  questions: number;
  status: ShareQuizStatus;
  /** Time limit in minutes, when the quiz has one. */
  duration?: number | null;
}

export type ShareStyleId = "professional";

export function formatJoinCode(code: string): string {
  return code.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ").toUpperCase();
}

function joinLink(code: string): string {
  return `${SITE_URL}/quiz/join?code=${encodeURIComponent(code.replace(/\s+/g, ""))}`;
}

function statusLine(status: ShareQuizStatus): string {
  if (status === "live") return "Live now";
  if (status === "scheduled") return "Starts soon";
  return "Tap to join";
}

interface QuizMessageInput {
  title: string;
  count: number;
  code: string;
  url: string;
}

function buildQuizLiveText({ title, count, code, url }: QuizMessageInput): string {
  const E = {
    target: "\u{1F3AF}", memo: "\u{1F4DD}", q: "\u2753",
    timer: "\u23F1\uFE0F", key: "\u{1F511}", point: "\u{1F447}", rocket: "\u{1F680}",
  };
  const spaced = (code.replace(/\s+/g, "").match(/.{1,4}/g) ?? []).join(" ");

  return [
    `${E.target} *QUIZ LIVE HAI!*`,
    ``,
    `${E.memo} *${title}*`,
    `${E.q} ${count} questions`,
    ``,
    `${E.key} *Join code*`,
    "```" + spaced + "```",
    ``,
    `${E.point} *Seedha join karne ke liye tap karo*`,
    url,
    ``,
    `_All the best, tum kar loge! ${E.rocket}_`,
  ].join("\n");
}

export function buildQuizMessage(input: QuizMessageInput): string {
  return "https://wa.me/?text=" + encodeURIComponent(buildQuizLiveText(input));
}

export function buildShareMessage(quiz: ShareQuizInfo): string {
  const link = joinLink(quiz.code);
  const show = formatJoinCode(quiz.code);
  const questions = `${quiz.questions} ${quiz.questions === 1 ? "question" : "questions"}`;

  return `*${quiz.title}*

${questions} · ${statusLine(quiz.status)}

Join code: *${show}*

Join here: ${link}

${SITE_NAME}`;
}

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

interface ShareQuizDialogProps {
  quiz: ShareQuizInfo;
  onClose: () => void;
}

export function ShareQuizDialog({ quiz, onClose }: ShareQuizDialogProps) {
  const [code, setCode] = useState(quiz.code);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  const durationLabel = formatDurationMinutes(quiz.duration);
  const generatedMessage = buildShareMessage({ ...quiz, code });
  const message = customMessage ?? generatedMessage;
  const sentAt = useMemo(
    () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    []
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    if (code) return;
    let active = true;
    copyQuizCode(quiz.id)
      .then((next) => {
        if (active && next) setCode(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code, quiz.id]);

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    try {
      let targetCode = code;
      if (!targetCode) {
        targetCode = await copyQuizCode(quiz.id);
        setCode(targetCode);
      }
      await copyText(customMessage ?? buildShareMessage({ ...quiz, code: targetCode }));
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error({
        title: "Could not copy message",
        description: "Copy the message manually from the preview.",
      });
    } finally {
      setCopying(false);
    }
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    toast.success("Opening WhatsApp…");
  };

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center overflow-y-auto bg-[#1a1240]/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-quiz-title"
        onClick={(event) => event.stopPropagation()}
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[940px] overflow-y-auto rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[24px] sm:border-2 sm:shadow-[8px_8px_0_var(--qs-sun)]"
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5">
          <div>
            <h2 id="share-quiz-title" className="qs-display text-[15px] font-bold text-[var(--qs-ink)] sm:text-[20px] sm:font-extrabold">
              Share on WhatsApp
            </h2>
            <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--qs-muted)] sm:mt-1 sm:text-[13px] sm:leading-5">
              Review the message and share. Students get a tap-to-join link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-2.5 px-3.5 pb-3.5 pt-2.5 sm:gap-5 sm:px-5 sm:pb-5 sm:pt-3 md:grid-cols-2 md:gap-6 md:px-6 md:pb-6">
          <div className="hidden min-w-0 space-y-4 sm:block">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="share-quiz-message"
                  className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--qs-ink)] sm:text-[11px] sm:font-extrabold"
                >
                  Your message
                </label>
                {customMessage !== null && (
                  <button
                    type="button"
                    onClick={() => setCustomMessage(null)}
                    className="text-[11px] font-bold text-[var(--qs-brand)] underline underline-offset-2 hover:no-underline"
                  >
                    Reset to template
                  </button>
                )}
              </div>
              <textarea
                id="share-quiz-message"
                value={message}
                onChange={(event) => setCustomMessage(event.target.value)}
                rows={9}
                spellCheck={false}
                className="w-full resize-y rounded-[9px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1.5 text-[11px] leading-[1.4] text-[var(--qs-ink)] outline-none transition-colors focus:border-[var(--qs-brand)] sm:rounded-[12px] sm:border-2 sm:px-3 sm:py-2 sm:text-[12.5px] sm:leading-[1.5]"
              />
            </div>

            <p className="hidden text-[12px] leading-relaxed text-[var(--qs-muted)] sm:block">
              WhatsApp supports <b>*bold*</b>, <em>_italic_</em>, <code>```mono```</code> and{" "}
              <code>&gt; quote</code>. The card preview appears when the join link has Open Graph tags.
            </p>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Preview
              </span>
              <span className="text-[11px] text-[var(--qs-muted)]">Updates as you type</span>
            </div>

            <div className="rounded-[12px] border border-[var(--qs-line)] bg-[#efeae2] p-2.5 dark:bg-[#0b141a] sm:rounded-[18px] sm:border-2 sm:p-4">
              <div className="max-w-[95%] rounded-[10px] rounded-bl-[2px] bg-[#d9fdd3] p-1 text-[#111b21] shadow-[0_1px_1px_rgba(0,0,0,0.15)] dark:bg-[#005c4b] dark:text-[#e9edef]">
                <div
                  className="overflow-hidden rounded-[7px] bg-[#f7f8f8] dark:bg-[#025144]"
                  aria-label="Link preview"
                >
                  <div className="bg-[var(--qs-brand)] px-3 pb-3 pt-3.5 text-[var(--qs-on-brand)]">
                    <small className="block text-[11px] font-bold opacity-85">
                      {SITE_NAME} · {quiz.status === "live" ? "Live quiz" : "Quiz"}
                    </small>
                    <span className="mt-2 inline-block max-w-full truncate rounded-[10px] border-2 border-dashed border-[#1d1b3a] bg-[#ffc933] px-3 py-1 font-mono text-[18px] font-extrabold tracking-[0.12em] text-[#1d1b3a]">
                      {code ? formatJoinCode(code) : "•••• ••••"}
                    </span>
                  </div>
                  <div className="px-2.5 py-2 text-[#111b21] dark:text-[#e9edef]">
                    <b className="block text-[13px] font-bold leading-snug">{quiz.title}</b>
                    <span className="mt-0.5 block text-[12px] opacity-75">
                      {quiz.questions} {quiz.questions === 1 ? "question" : "questions"}
                      {durationLabel ? ` • ${durationLabel}` : ""}. Tap to join instantly.
                    </span>
                    <em className="mt-0.5 block text-[11px] not-italic opacity-60">
                      {SITE_URL.replace(/^https?:\/\//, "")}
                    </em>
                  </div>
                </div>

                <div className="whitespace-pre-wrap break-words px-1.5 pb-0.5 pt-1.5 text-[12.5px] leading-[1.45]">
                  <WhatsAppText text={message} />
                </div>
                <div className="px-1.5 pb-0.5 text-right text-[10px] opacity-60">{sentAt} ✓✓</div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                disabled={copying}
                aria-live="polite"
                className={cn(
                  "flex-1 rounded-[9px] px-2 py-2.5 text-[11.5px] font-semibold sm:rounded-[12px] sm:px-3 sm:py-3 sm:text-[13px] sm:font-bold shadow-[0_4px_0_rgba(0,0,0,0.22)] transition-all active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.22)] disabled:cursor-wait disabled:opacity-70",
                  copied
                    ? "bg-[var(--qs-ok)] text-[var(--qs-on-brand)]"
                    : "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                )}
              >
                {copying ? "Copying…" : copied ? "Copied ✓" : "Copy message"}
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-[#25d366] px-2 py-2.5 text-[11.5px] font-semibold sm:gap-2 sm:rounded-[12px] sm:px-3 sm:py-3 sm:text-[13px] sm:font-bold text-[#06301a] shadow-[0_4px_0_rgba(0,0,0,0.2)] transition-all hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
              >
                <WhatsAppIcon className="h-4 w-4 text-white" />
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
