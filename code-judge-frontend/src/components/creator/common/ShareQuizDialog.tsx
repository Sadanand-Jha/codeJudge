"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { copyQuizCode } from "@/services/quiz";
import { toast } from "@/lib/toast";

export type ShareQuizStatus = "live" | "draft" | "scheduled" | "completed";

export interface ShareQuizInfo {
  id: string;
  title: string;
  code: string;
  questions: number;
  status: ShareQuizStatus;
}

export type ShareStyleId = "clean" | "ticket" | "desi" | "hype";

interface ShareStyle {
  id: ShareStyleId;
  name: string;
  description: string;
}

const SHARE_STYLES: ShareStyle[] = [
  {
    id: "clean",
    name: "Clean",
    description: "Short and direct. Best for class groups.",
  },
  {
    id: "ticket",
    name: "Ticket",
    description: "Monospace code box, just like your yellow dashed code box.",
  },
  {
    id: "desi",
    name: "Desi",
    description: "Hinglish and friendly. Works for school and college alike.",
  },
  {
    id: "hype",
    name: "Hype",
    description: "Bold Hinglish announcement with code and tap-to-join link.",
  },
];

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

export function buildShareMessage(quiz: ShareQuizInfo, style: ShareStyleId): string {
  const link = joinLink(quiz.code);
  const show = formatJoinCode(quiz.code);
  const questions = `${quiz.questions} ${quiz.questions === 1 ? "question" : "questions"}`;

  if (style === "ticket") {
    return `🎟️🔥 *QUIZ PASS* 🔥🎟️
╔════════════════════╗
   🎯 *${quiz.title}*
╚════════════════════╝

📚 ${questions}  •  ${statusLine(quiz.status)}

🎫 *YOUR ENTRY CODE*
\`\`\`${show}\`\`\`

👇 *One-tap entry*
${link}

🍀 _Best of luck!_ 🚀`;
  }

  if (style === "hype") {
    return buildQuizLiveText({
      title: quiz.title,
      count: quiz.questions,
      code: quiz.code,
      url: link,
    });
  }

  if (style === "desi") {
    const intro = quiz.status === "live" ? "shuru ho gaya hai! 🚀" : "join ke liye ready hai! 🚀";
    return `🚀✨ *QUIZ TIME!* ✨🚀
┏━━━━━━━━━━━━━━━━━━┓
   🎯 *${quiz.title}*
┗━━━━━━━━━━━━━━━━━━┛

${intro}

👇 *Seedha join karo*
${link}

🔑 Link na khule to code daalo: *${show}*

🏆 _All the best!_ 💪`;
  }

  return `🎉✨ *QUIZ ALERT* ✨🎉
┏━━━━━━━━━━━━━━━━━━┓
   🎯 *${quiz.title}*
┗━━━━━━━━━━━━━━━━━━┛

📚 ${questions}  •  ${statusLine(quiz.status)}

🔑 *Join code:* \`\`\`${show}\`\`\`

👇 *Tap to join instantly*
${link}

🏆 _Good luck — you've got this!_ ✨`;
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

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const INLINE_PATTERN = /(```[^`]+```|\*[^*\n]+\*|_[^_\n]+_|https?:\/\/[^\s]+)/g;

function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_PATTERN.lastIndex = 0;

  while ((match = INLINE_PATTERN.exec(line))) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;

    if (token.startsWith("```")) {
      parts.push(
        <code key={key} className="rounded bg-black/10 px-1 py-px font-mono text-[12.5px] dark:bg-white/15">
          {token.slice(3, -3)}
        </code>
      );
    } else if (token.startsWith("*")) {
      parts.push(<strong key={key}>{token.slice(1, -1)}</strong>);
    } else if (token.startsWith("_")) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      parts.push(
        <span key={key} className="break-words text-[#027eb5] underline decoration-1 underline-offset-2 dark:text-[#53bdeb]">
          {token}
        </span>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}

function WhatsAppText({ text }: { text: string }) {
  return (
    <span className="block">
      {text.split("\n").map((line, index) => {
        const quote = line.startsWith("> ");
        const content = quote ? line.slice(2) : line;
        return (
          <span
            key={index}
            className={cn("block", quote && "my-0.5 border-l-[3px] border-[#8696a0] pl-2")}
          >
            {content ? renderInline(content, String(index)) : "\u00A0"}
          </span>
        );
      })}
    </span>
  );
}

interface ShareQuizDialogProps {
  quiz: ShareQuizInfo;
  onClose: () => void;
}

export function ShareQuizDialog({ quiz, onClose }: ShareQuizDialogProps) {
  const [styleId, setStyleId] = useState<ShareStyleId>("clean");
  const [code, setCode] = useState(quiz.code);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  const activeStyle = SHARE_STYLES.find((style) => style.id === styleId) ?? SHARE_STYLES[0];
  const generatedMessage = buildShareMessage({ ...quiz, code }, styleId);
  const message = customMessage ?? generatedMessage;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
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
      await copyText(customMessage ?? buildShareMessage({ ...quiz, code: targetCode }, styleId));
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
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[460px] overflow-y-auto rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[8px_8px_0_var(--qs-sun)]"
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5">
          <div>
            <h2 id="share-quiz-title" className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">
              Share on WhatsApp
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-[var(--qs-muted)]">
              Pick a style, tweak the message, and share. Students get a tap-to-join link.
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

        <div className="px-5 pb-5 pt-3">
          <div className="flex gap-2" role="tablist" aria-label="Message style">
            {SHARE_STYLES.map((style) => {
              const selected = style.id === styleId;
              return (
                <button
                  key={style.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setStyleId(style.id);
                    setCustomMessage(null);
                    setCopied(false);
                  }}
                  className={cn(
                    "flex-1 rounded-[12px] border-2 px-2 py-2 text-[13px] font-bold transition-colors",
                    selected
                      ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                  )}
                >
                  {style.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 min-h-[2.6em] text-[12px] leading-[1.4] text-[var(--qs-muted)]">
            {activeStyle.description}
          </p>

          <div className="mt-1">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="share-quiz-message"
                className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ink)]"
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
              rows={5}
              spellCheck={false}
              className="w-full resize-y rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-[12.5px] leading-[1.5] text-[var(--qs-ink)] outline-none transition-colors focus:border-[var(--qs-brand)]"
            />
          </div>

          <div className="mb-1.5 mt-4 flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
              Preview
            </span>
            <span className="text-[11px] text-[var(--qs-muted)]">Updates as you type</span>
          </div>

          <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[#efeae2] p-4 dark:bg-[#0b141a]">
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
                    {quiz.questions} {quiz.questions === 1 ? "question" : "questions"}. Tap to join instantly.
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

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={copying}
              aria-live="polite"
              className={cn(
                "flex-1 rounded-[12px] px-3 py-3 text-[13px] font-bold shadow-[0_4px_0_rgba(0,0,0,0.22)] transition-all active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.22)] disabled:cursor-wait disabled:opacity-70",
                copied
                  ? "bg-[var(--qs-ok)] text-[var(--qs-on-brand)]"
                  : "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
              )}
            >
              {copying ? "Copying…" : copied ? "Copied ✓" : "Copy message"}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#25d366] px-3 py-3 text-[13px] font-bold text-[#06301a] shadow-[0_4px_0_rgba(0,0,0,0.2)] transition-all hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
            >
              <WhatsAppIcon className="h-4 w-4 text-white" />
              Open WhatsApp
            </a>
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-[var(--qs-muted)]">
            WhatsApp supports <b>*bold*</b>, <em>_italic_</em>, <code>```mono```</code> and{" "}
            <code>&gt; quote</code>. The card preview appears when the join link has Open Graph tags.
          </p>
        </div>
      </div>
    </div>
  );
}
