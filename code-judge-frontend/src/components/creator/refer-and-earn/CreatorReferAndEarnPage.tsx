"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  Gift,
  Info,
  Mail,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  getReferralDashboard,
  type ReferralDashboard,
  type ReferralEntry,
} from "@/services/referrals";
import { toast } from "@/lib/toast";

const DEFAULT_WA_MESSAGE =
  "Join me on QuizSupport. Use my referral code when you buy a monthly plan and we both get 50 AI credits.";

const SHARE_TEXT =
  "Join me on QuizSupport. Use my referral code at monthly plan checkout and we both get 50 AI credits: ";

const CARD =
  "rounded-[20px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 shadow-[0_3px_0_#f6e3a1] md:rounded-[22px] md:border-2 md:p-5 md:shadow-none lg:p-[22px]";

const STEPS = [
  {
    title: "Share your code",
    body: "Send your referral code on WhatsApp, Telegram or email.",
  },
  {
    title: "Friend buys a plan",
    body: (
      <>
        They enter your code at{" "}
        <strong className="font-extrabold text-[var(--qs-brand)]">monthly plan checkout</strong>.
        Credit packs and trials do not qualify.
      </>
    ),
  },
  {
    title: "You both earn",
    body: (
      <>
        You and your friend each get{" "}
        <strong className="font-extrabold text-[var(--qs-brand)]">50 AI credits</strong> after
        payment, valid for 6 months.
      </>
    ),
  },
];

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] text-[14.5px] font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--qs-brand)]/40 motion-reduce:transition-none";

const BTN_PLAIN = cn(
  BTN_BASE,
  "min-h-[52px] bg-[var(--qs-surface)] px-5 text-[var(--qs-ink)] hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-px active:shadow-none"
);

const BTN_CTA = cn(
  BTN_BASE,
  "min-h-[52px] bg-[var(--qs-sun)] px-5 text-[var(--qs-ink)] shadow-[0_4px_0_var(--qs-ink)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--qs-ink)] active:translate-y-px active:shadow-none"
);

const BTN_CTA_DONE = cn(
  BTN_BASE,
  "min-h-[52px] bg-[var(--qs-ink)] px-5 text-[var(--qs-sun)] shadow-[0_4px_0_var(--qs-sun)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--qs-sun)] active:translate-y-px active:shadow-none"
);

const SHARE_BTN = cn(
  BTN_BASE,
  "min-h-[44px] bg-[var(--qs-surface)] px-4 text-[13.5px] text-[var(--qs-ink)] hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-px active:shadow-none max-md:min-h-[58px] max-md:flex-col max-md:gap-1 max-md:rounded-[14px] max-md:border max-md:border-[var(--qs-line)] max-md:px-1 max-md:py-2.5 max-md:text-[12px] max-md:font-medium max-md:shadow-none max-md:hover:translate-y-0 max-md:hover:shadow-none max-md:active:translate-y-0"
);

const LABEL =
  "block text-[13px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-muted)]";

const subscribeNoop = () => () => {};
const getNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";
const getServerNativeShare = () => false;

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.3 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z" />
    </svg>
  );
}

function Coin({ inverted = false }: { inverted?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)]",
        inverted ? "bg-white" : "bg-[var(--qs-sun)]"
      )}
    >
      <Star className="h-6 w-6 fill-[var(--qs-ink)] text-[var(--qs-ink)]" />
    </span>
  );
}

function StatRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[62px] flex-col justify-between gap-1 rounded-[14px] px-2.5 py-2.5 tabular-nums md:min-h-0 md:flex-row md:items-center md:border-2 md:px-4 md:py-3.5",
        highlight
          ? "bg-[var(--qs-brand)] text-white md:border-[var(--qs-ink)] md:bg-[var(--qs-ink)] md:shadow-[4px_4px_0_var(--qs-sun)]"
          : "bg-[var(--qs-bg)] md:border-[var(--qs-line)]"
      )}
    >
      <span
        className={cn(
          "text-[11px] font-medium leading-3 md:text-[13.5px] md:font-bold",
          highlight ? "text-white/80" : "text-[var(--qs-muted)]"
        )}
      >
        {label}
      </span>
      <b
        className={cn(
          "text-[20px] font-bold leading-6 tracking-[-0.02em] md:text-2xl md:font-extrabold",
          highlight ? "text-white md:text-[var(--qs-sun)]" : "text-[var(--qs-ink)]"
        )}
      >
        {value}
      </b>
    </div>
  );
}

function formatReferralDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function referralSubtitle(entry: ReferralEntry): string {
  const date = formatReferralDate(entry.qualifiedAt ?? entry.signedUpAt);
  if (entry.status === "qualified") {
    return `${entry.planName ? `Bought ${entry.planName}` : "Qualified"}${date ? ` · ${date}` : ""}`;
  }
  if (entry.status === "rejected") {
    return "Not eligible for a reward";
  }
  return `Signed up${date ? ` ${date}` : ""}`;
}

export function CreatorReferAndEarnPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<number | undefined>(undefined);

  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waMessage, setWaMessage] = useState(DEFAULT_WA_MESSAGE);
  const [waPhone, setWaPhone] = useState("");
  const [waError, setWaError] = useState<string | null>(null);

  const loadReferrals = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setDashboard(await getReferralDashboard());
    } catch {
      setLoadError("Couldn't load your referral details.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getReferralDashboard();
        if (cancelled) return;
        setDashboard(data);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Couldn't load your referral details.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const referralCode = dashboard?.code ?? "";
  const canNativeShare = useSyncExternalStore(
    subscribeNoop,
    getNativeShare,
    getServerNativeShare
  );
  const shareDisabled = !dashboard;

  useEffect(() => {
    return () => window.clearTimeout(copiedTimer.current);
  }, []);

  useEffect(() => {
    if (!waOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWaOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [waOpen]);

  const copyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch {
      inputRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    toast.success("Referral code copied!");
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const openWhatsApp = () => {
    if (!dashboard) return;
    setWaMessage(DEFAULT_WA_MESSAGE);
    setWaPhone("");
    setWaError(null);
    setWaOpen(true);
  };

  const sendWhatsApp = () => {
    if (!referralCode) return;
    let digits = waPhone.replace(/\D/g, "");
    if (digits && digits.length < 10) {
      setWaError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (digits.length === 10) digits = `91${digits}`;
    const text = `${waMessage.trim()}\nReferral code: ${referralCode}`;
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setWaOpen(false);
    toast.success("Opening WhatsApp…");
  };

  const shareNative = () => {
    if (!referralCode) return;
    void navigator
      .share({
        title: "Get 50 AI credits on a monthly plan",
        text: `${SHARE_TEXT}${referralCode}`,
      })
      .catch(() => {});
  };

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3 pb-4 md:gap-[22px] md:pb-6">
      <header className="min-w-0">
        <h1 className="qs-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[var(--qs-ink)] md:text-[34px] md:leading-[1.05] md:tracking-[-0.03em] lg:text-[40px]">
          <span className="md:hidden">Referrals</span>
          <span className="hidden md:inline">Refer &amp; Earn</span>
        </h1>
        <p className="mt-1 text-[13px] leading-5 text-[var(--qs-muted)] md:mt-1.5 md:text-[15.5px] md:font-medium">
          Invite fellow educators and earn AI credits together.
        </p>
        {loadError && (
          <div
            role="alert"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border-2 border-[#e3b7b1] bg-[#fdf1ef] px-4 py-2.5 text-[13px] font-semibold text-[#8c2f24]"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void loadReferrals()}
              className="font-extrabold underline decoration-2 underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}
      </header>

      {/* Mobile hero */}
      <section className="rounded-[22px] bg-[var(--qs-brand)] p-5 pb-[18px] text-[var(--qs-on-brand)] shadow-[0_5px_0_var(--qs-sun)] md:hidden">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-ink)] px-3 py-1.5 text-[12px] font-semibold text-[var(--qs-sun)]">
          <Gift className="h-3.5 w-3.5" />
          Give 50, get 50
        </span>
        <h2 className="mt-3.5 text-[26px] font-bold leading-[1.2] tracking-[-0.02em]">
          Share the love,
          <br />
          <span className="text-[var(--qs-sun)]">earn 50 credits</span>
        </h2>
        <p className="mt-2 text-[13px] leading-[1.45] text-[#ddd7ff]">
          When a friend buys a monthly plan with your code, you both get 50 AI credits each —
          valid for 6 months.
        </p>
        <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-sun)] px-3 py-[7px] text-[12px] font-semibold text-[#3b2a00]">
          <UserPlus className="h-3.5 w-3.5" />
          Monthly plans only · refer unlimited friends
        </span>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 text-[var(--qs-ink)]">
            <span className="flex items-center gap-2 text-[12px] font-medium">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-white">
                <Star className="h-3.5 w-3.5 fill-current" />
              </span>
              You get
            </span>
            <b className="text-[24px] font-bold leading-none">
              50{" "}
              <em className="text-[12px] font-semibold not-italic">AI credits</em>
            </b>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-[var(--qs-sun)] p-3 text-[#3b2a00]">
            <span className="flex items-center gap-2 text-[12px] font-medium">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-white">
                <Users className="h-3.5 w-3.5" />
              </span>
              Friend gets
            </span>
            <b className="text-[24px] font-bold leading-none">
              50{" "}
              <em className="text-[12px] font-semibold not-italic">AI credits</em>
            </b>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative hidden gap-7 overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] p-6 text-[var(--qs-on-brand)] shadow-[8px_8px_0_var(--qs-sun)] md:grid sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:items-center"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[60px] -top-[80px] h-[260px] w-[260px] rounded-full bg-white/[0.08]"
        />

        <div className="relative min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-ink)] px-3 py-1.5 text-[13px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-sun)]">
            <Sparkles className="h-3 w-3 fill-current" />
            Give 50, get 50
          </span>
          <h2 className="mt-4 mb-3 text-[38px] font-extrabold leading-none tracking-[-0.035em] sm:text-[46px]">
            Share the love,
            <br />
            <em className="not-italic text-[var(--qs-sun)]">earn 50 credits</em>
          </h2>
          <p className="max-w-[440px] text-[15.5px] font-medium leading-relaxed text-white/[0.88]">
            When a friend buys a monthly plan with your code, you both get 50 AI credits each —
            valid for 6 months.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3.5 py-1.5 text-[13px] font-extrabold text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-ink)]">
            <Users className="h-3.5 w-3.5" />
            Monthly plans only · refer unlimited friends
          </span>
        </div>

        <div className="relative grid gap-3.5">
          <div className="flex items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)]">
            <Coin />
            <div className="min-w-0">
              <small className="block text-[12px] font-bold text-[var(--qs-muted)]">
                You get on their monthly plan
              </small>
              <b className="block text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em]">
                50 <span className="text-[14px] font-bold tracking-normal">AI credits</span>
              </b>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] p-4 text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)] sm:ml-[22px]">
            <Coin inverted />
            <div className="min-w-0">
              <small className="block text-[12px] font-bold text-[#5b4a10]">
                Your invitee gets on their monthly plan
              </small>
              <b className="block text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em]">
                50 <span className="text-[14px] font-bold tracking-normal">AI credits</span>
              </b>
            </div>
          </div>
        </div>
      </motion.section>

      <section className={CARD}>
        <h3 className="text-[16px] font-semibold leading-5 text-[var(--qs-ink)] md:text-[19px] md:font-extrabold md:tracking-[-0.015em]">
          Your referral code
        </h3>
        <p className="mt-0.5 text-[12px] leading-3.5 font-medium text-[var(--qs-muted)] md:text-[13.5px]">
          Share this code. Your friend enters it at monthly plan checkout.
        </p>

        <div className="mt-3 flex items-stretch gap-2 md:mt-4 md:flex-wrap md:gap-2.5">
          <label className="flex h-[46px] min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-dashed border-[#b7acff] bg-[var(--qs-poly-1)] px-3 md:h-auto md:min-h-[52px] md:min-w-[220px] md:gap-2.5 md:rounded-[14px] md:border-2 md:px-4">
            <Gift className="h-4 w-4 shrink-0 text-[var(--qs-brand)] md:h-[18px] md:w-[18px]" />
            <input
              ref={inputRef}
              type="text"
              readOnly
              value={
                dashboard
                  ? referralCode
                  : isLoading
                    ? "Loading your referral code…"
                    : "Referral code unavailable"
              }
              aria-label="Referral code"
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-[var(--qs-ink)] outline-none md:py-3 md:text-[14.5px] md:font-bold"
            />
          </label>
          <button
            type="button"
            onClick={copyCode}
            disabled={shareDisabled}
            className={cn(
              copied ? BTN_CTA_DONE : BTN_CTA,
              "max-md:min-h-[46px] max-md:rounded-[14px] max-md:border-[1.5px] max-md:px-3.5 max-md:text-[13px] max-md:font-semibold max-md:shadow-none",
              shareDisabled && "cursor-not-allowed opacity-50"
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy code"}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 md:mt-3.5 md:flex md:flex-wrap md:gap-2.5">
          <button
            type="button"
            onClick={openWhatsApp}
            className={cn(SHARE_BTN, shareDisabled && "cursor-not-allowed opacity-50")}
            aria-haspopup="dialog"
            disabled={shareDisabled}
          >
            <WhatsAppGlyph className="h-[17px] w-[17px] text-[#1fa971]" />
            WhatsApp
          </button>
          <a
            href={
              dashboard
                ? `https://t.me/share/url?text=${encodeURIComponent(`${SHARE_TEXT}${referralCode}`)}`
                : undefined
            }
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={shareDisabled}
            className={cn(
              SHARE_BTN,
              shareDisabled && "pointer-events-none cursor-not-allowed opacity-50"
            )}
          >
            <Send className="h-4 w-4 -rotate-12 max-md:h-5 max-md:w-5" />
            Telegram
          </a>
          <a
            href={
              dashboard
                ? `mailto:?subject=${encodeURIComponent("50 AI credits on a monthly plan")}&body=${encodeURIComponent(`${SHARE_TEXT}${referralCode}`)}`
                : undefined
            }
            aria-disabled={shareDisabled}
            className={cn(
              SHARE_BTN,
              shareDisabled && "pointer-events-none cursor-not-allowed opacity-50"
            )}
          >
            <Mail className="h-4 w-4 max-md:h-5 max-md:w-5" />
            Email
          </a>
          {canNativeShare && (
            <button
              type="button"
              onClick={shareNative}
              className={cn(SHARE_BTN, "max-md:hidden", shareDisabled && "cursor-not-allowed opacity-50")}
              disabled={shareDisabled}
            >
              <Share2 className="h-4 w-4" />
              More
            </button>
          )}
        </div>

        <div className="mt-4.5 hidden gap-3.5 md:grid sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-[18px]"
            >
              <div className="grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[15px] font-extrabold text-[var(--qs-ink)]">
                {index + 1}
              </div>
              <b className="mt-3 block text-[15.5px] font-extrabold text-[var(--qs-ink)]">
                {step.title}
              </b>
              <p className="mt-1 text-[13.5px] font-medium leading-[1.45] text-[var(--qs-muted)]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile steps */}
      <section className={cn(CARD, "md:hidden")}>
        <h3 className="text-[16px] font-semibold leading-5 text-[var(--qs-ink)]">How it works</h3>
        <ol className="mt-3 list-none p-0">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[32px_1fr] gap-3 border-t border-[var(--qs-line)] py-3 first:border-t-0 first:pt-0 last:pb-0"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[13px] font-semibold text-[var(--qs-ink)]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <b className="block text-[14px] font-semibold text-[var(--qs-ink)]">
                  {step.title}
                </b>
                <p className="mt-px text-[13px] leading-[1.4] text-[var(--qs-muted)]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="hidden items-start gap-3 md:grid md:gap-[22px] lg:grid-cols-[1fr_1.25fr]">
        <div className={CARD}>
          <h3 className="text-[16px] font-extrabold leading-5 text-[var(--qs-ink)] md:text-[19px] md:font-extrabold md:tracking-[-0.015em]">
            Your rewards
          </h3>
          <p className="mt-0.5 text-[13px] leading-3.5 font-medium text-[var(--qs-muted)] md:text-[13.5px]">
            A quick look at how your referrals are doing.
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 md:mt-4 md:grid-cols-1 md:gap-3">
            <StatRow label="Friends referred" value={dashboard?.stats.friendsSignedUp ?? 0} />
            <StatRow label="Plans purchased" value={dashboard?.stats.firstPlansBought ?? 0} />
            <StatRow
              label="Credits earned"
              value={dashboard?.stats.creditsEarned ?? 0}
              highlight
            />
          </div>
        </div>

        <div className={CARD}>
          <h3 className="text-[16px] font-extrabold leading-5 text-[var(--qs-ink)] md:text-[19px] md:font-extrabold md:tracking-[-0.015em]">
            Recent referrals
          </h3>
          <p className="mt-0.5 text-[13px] leading-3.5 font-medium text-[var(--qs-muted)] md:text-[13.5px]">
            Credits show up once a friend buys a monthly plan with your code.
          </p>
          {isLoading ? (
            <div className="mt-3 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-9 text-center text-[13px] font-semibold text-[var(--qs-muted)]">
              Loading your referrals…
            </div>
          ) : dashboard && dashboard.recent.length > 0 ? (
            <div className="mt-3">
              {dashboard.recent.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-3 py-3",
                    index < dashboard.recent.length - 1 &&
                      "border-b-2 border-[var(--qs-line)]"
                  )}
                >
                  <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[15px] font-extrabold text-[var(--qs-ink)]">
                    {entry.displayName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <b className="block truncate text-[14.5px] font-extrabold text-[var(--qs-ink)]">
                      {entry.displayName}
                    </b>
                    <small className="block truncate text-[12px] font-medium text-[var(--qs-muted)]">
                      {referralSubtitle(entry)}
                    </small>
                  </div>
                  <span
                    className={cn(
                      "ml-auto shrink-0 rounded-full px-2.5 py-1 text-[14px] font-extrabold",
                      entry.status === "qualified" &&
                        "bg-[#dcf5ea] text-[#187a52]",
                      entry.status === "pending" &&
                        "bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]",
                      entry.status === "rejected" &&
                        "bg-[var(--qs-line)]/40 text-[var(--qs-muted)]"
                    )}
                  >
                    {entry.status === "qualified"
                      ? `+${entry.credits} credits`
                      : entry.status === "pending"
                        ? "Awaiting payment"
                        : "Not eligible"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex min-h-[76px] flex-col items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 text-center md:mt-3 md:min-h-0 md:rounded-[16px] md:border-2 md:px-4 md:py-9">
              <Users className="h-5 w-5 text-[var(--qs-muted)] md:h-6 md:w-6" />
              <p className="mt-0.5 text-[14px] font-extrabold text-[var(--qs-ink)] md:mt-2 md:text-sm">
                {loadError ? "Couldn't load referrals" : "No referrals yet"}
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--qs-muted)] md:mt-1 md:text-[14px]">
                {loadError
                  ? "Use the retry button above to try again."
                  : "Share your code to start earning credits."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Mobile referrals */}
      <section className={cn(CARD, "md:hidden")} aria-label="Your referrals">
        <h3 className="text-[16px] font-semibold leading-5 text-[var(--qs-ink)]">
          Your referrals
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatRow label="Friends" value={dashboard?.stats.friendsSignedUp ?? 0} />
          <StatRow label="Plans" value={dashboard?.stats.firstPlansBought ?? 0} />
          <StatRow
            label="Credits earned"
            value={dashboard?.stats.creditsEarned ?? 0}
            highlight
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-[14px] border border-[var(--qs-line)]">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-[13px] font-medium text-[var(--qs-muted)]">
              Loading your referrals…
            </div>
          ) : dashboard && dashboard.recent.length > 0 ? (
            dashboard.recent.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  "flex items-center gap-3 p-3",
                  index > 0 && "border-t border-[var(--qs-line)]"
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--qs-poly-1)] text-[14px] font-semibold text-[var(--qs-brand)]">
                  {entry.displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <b className="block truncate text-[14px] font-semibold text-[var(--qs-ink)]">
                    {entry.displayName}
                  </b>
                  <small className="block truncate text-[12px] font-medium text-[var(--qs-muted)]">
                    {referralSubtitle(entry)}
                  </small>
                </div>
                <span
                  className={cn(
                    "ml-auto shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold",
                    entry.status === "qualified" && "bg-[#dcf5ea] text-[#187a52]",
                    entry.status === "pending" && "bg-[#fff1cc] text-[#8a5a00]",
                    entry.status === "rejected" &&
                      "bg-[var(--qs-line)]/40 text-[var(--qs-muted)]"
                  )}
                >
                  {entry.status === "qualified"
                    ? `+${entry.credits} credits`
                    : entry.status === "pending"
                      ? "Awaiting payment"
                      : "Not eligible"}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-7 text-center">
              <Users className="h-5 w-5 text-[var(--qs-muted)]" />
              <p className="mt-1 text-[14px] font-semibold text-[var(--qs-ink)]">
                {loadError ? "Couldn't load referrals" : "No referrals yet"}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--qs-muted)]">
                {loadError
                  ? "Use the retry button above to try again."
                  : "Share your code to start earning credits."}
              </p>
            </div>
          )}
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-[1.4] text-[var(--qs-muted)]">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            Credits are added within a few minutes of your friend&apos;s monthly plan payment
            and stay valid for 6 months.
          </span>
        </p>
      </section>

      <p className="hidden items-start justify-start gap-1.5 text-left text-[12px] font-medium leading-3.5 text-[var(--qs-muted)] md:flex md:justify-center md:gap-2 md:text-center md:text-[12px] md:leading-[1.4]">
        <ShieldCheck className="mt-px h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
        <span>
          Valid for monthly plans only. Each friend can use a referral code once, but your
          code can be used by as many friends as you like. They can apply it at monthly plan
          checkout even if they already have an account. Not valid on credit packs, trials
          or renewals. Credits are added to both accounts only after backend payment
          verification and stay valid for 6 months.
        </span>
      </p>

      <AnimatePresence>
        {waOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[rgba(29,24,64,0.6)] p-5 backdrop-blur-sm"
            onClick={() => setWaOpen(false)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="referral-wa-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.2, 0.9, 0.3, 1.15] }}
              onClick={(event) => event.stopPropagation()}
              className="my-auto w-full max-w-[470px] rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-[22px] shadow-[8px_8px_0_var(--qs-sun)]"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[#1fa971] text-white shadow-[2px_2px_0_var(--qs-ink)]">
                  <WhatsAppGlyph className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="referral-wa-title"
                    className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--qs-ink)]"
                  >
                    Share on WhatsApp
                  </h3>
                  <p className="mt-0.5 text-[14px] font-medium text-[var(--qs-muted)]">
                    Preview and edit your message before sending.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWaOpen(false)}
                  aria-label="Close"
                  className="ml-auto grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-ink)] hover:bg-[var(--qs-bg)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-[var(--qs-ink)] px-3.5 py-2.5 text-[13px] font-semibold leading-[1.35] text-white shadow-[3px_3px_0_var(--qs-sun)]">
                <Sparkles className="h-4 w-4 shrink-0 fill-[var(--qs-sun)] text-[var(--qs-sun)]" />
                <span>
                  You both get{" "}
                  <b className="font-extrabold text-[var(--qs-sun)]">50 AI credits</b> when they
                  buy a monthly plan with your code.
                </span>
              </div>

              <label htmlFor="referral-wa-text" className={cn(LABEL, "mt-4 mb-1.5")}>
                Your message
              </label>
              <textarea
                id="referral-wa-text"
                autoFocus
                maxLength={240}
                value={waMessage}
                onChange={(event) => setWaMessage(event.target.value)}
                className="min-h-[92px] w-full resize-y rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 text-sm font-medium leading-[1.45] text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
              />
              <p className="mt-1 text-right text-[14px] font-semibold text-[var(--qs-muted)]">
                {waMessage.length}/240
              </p>

              <label htmlFor="referral-wa-phone" className={cn(LABEL, "mt-4 mb-1.5")}>
                Send to a number (optional)
              </label>
              <div className="flex overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)] focus-within:border-[var(--qs-brand)]">
                <span className="grid place-items-center bg-[var(--qs-brand)]/10 px-3.5 text-[14px] font-extrabold text-[var(--qs-brand)]">
                  +91
                </span>
                <input
                  id="referral-wa-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="98765 43210"
                  value={waPhone}
                  onChange={(event) => {
                    setWaPhone(event.target.value);
                    setWaError(null);
                  }}
                  className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-3 text-[14.5px] font-bold text-[var(--qs-ink)] outline-none"
                />
              </div>
              <p
                className={cn(
                  "mt-1.5 text-[12px] font-medium",
                  waError ? "font-bold text-[#c0392b]" : "text-[var(--qs-muted)]"
                )}
              >
                {waError ?? "Leave empty to pick a contact inside WhatsApp."}
              </p>

              <div className="mt-4 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-brand)]/5 p-3.5">
                <p className="mb-2 text-[14px] font-extrabold text-[var(--qs-brand)]">
                  Preview
                </p>
                <div className="ml-auto max-w-[92%] rounded-[14px_14px_4px_14px] border-2 border-[var(--qs-ink)] bg-[#dcf5ea] px-3 pt-2.5 pb-1.5 text-[13.5px] leading-[1.45] text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-ink)]">
                  <span className="whitespace-pre-wrap break-words">
                    {waMessage.trim()}
                  </span>
                  <span className="mt-1.5 block break-all rounded-[8px] bg-white/70 px-2 py-1 font-mono font-bold uppercase tracking-[0.06em] text-[var(--qs-brand)]">
                    {referralCode}
                  </span>
                  <time className="mt-0.5 block text-right text-[13px] font-semibold text-[var(--qs-muted)]">
                    now ✓✓
                  </time>
                </div>
              </div>

              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setWaOpen(false)}
                  className={cn(BTN_PLAIN, "flex-1")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendWhatsApp}
                  className={cn(BTN_CTA, "flex-1")}
                >
            <WhatsAppGlyph className="h-[17px] w-[17px] text-[#1fa971] max-md:h-5 max-md:w-5" />
                  Send on WhatsApp
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
