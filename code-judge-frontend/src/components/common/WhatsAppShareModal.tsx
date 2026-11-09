"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { WhatsAppText } from "@/components/common/WhatsAppText";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";

const LABEL =
  "block text-[11px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-muted)]";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] text-[14.5px] font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--qs-brand)]/40";

const BTN_PLAIN = cn(
  BTN_BASE,
  "min-h-[52px] bg-[var(--qs-surface)] px-5 text-[var(--qs-ink)] hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-px active:shadow-none"
);

const BTN_CTA = cn(
  BTN_BASE,
  "min-h-[52px] bg-[var(--qs-sun)] px-5 text-[var(--qs-ink)] shadow-[0_4px_0_var(--qs-ink)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--qs-ink)] active:translate-y-px active:shadow-none"
);

export interface WhatsAppShareModalProps {
  /** Dialog heading, e.g. "Share quiz on WhatsApp". */
  title: string;
  subtitle?: string;
  /** Full message, including the join link. Users can edit it before sending. */
  initialMessage: string;
  /** Optional one-line highlight shown under the header. */
  highlight?: string;
  onClose: () => void;
}

/**
 * Reusable WhatsApp composer used by quizzes and rooms. Mirrors the referral
 * card: editable message, optional +91 number, live chat preview and a direct
 * wa.me handoff. Render it conditionally so each open starts from a fresh
 * message.
 */
export function WhatsAppShareModal({
  title,
  subtitle,
  initialMessage,
  highlight,
  onClose,
}: WhatsAppShareModalProps) {
  const [message, setMessage] = useState(initialMessage);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const sentAt = useMemo(
    () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    []
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const send = () => {
    const text = message.trim();
    if (!text) {
      toast.error("Write a message before sending.");
      return;
    }

    let digits = phone.replace(/\D/g, "");
    if (digits && digits.length < 10) {
      setPhoneError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (digits.length === 10) digits = `91${digits}`;

    setPhoneError(null);
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    toast.success("Opening WhatsApp…");
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto bg-[rgba(29,24,64,0.6)] p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-share-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.2, 0.9, 0.3, 1.15] }}
        onClick={(event) => event.stopPropagation()}
        className="my-auto w-full max-w-[470px] rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3.5 shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[24px] sm:border-2 sm:p-[22px] sm:shadow-[8px_8px_0_var(--qs-sun)]"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[#1fa971] text-white shadow-[1px_2px_0_var(--qs-ink)] sm:h-[46px] sm:w-[46px] sm:rounded-[14px] sm:border-2 sm:shadow-[2px_2px_0_var(--qs-ink)]">
            <WhatsAppIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3
              id="whatsapp-share-title"
              className="text-[15px] font-bold tracking-normal text-[var(--qs-ink)] sm:text-[20px] sm:font-extrabold sm:tracking-[-0.02em]"
            >
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-[10.5px] font-medium text-[var(--qs-muted)] sm:text-[12.5px]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] border border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-ink)] hover:bg-[var(--qs-bg)] sm:h-[38px] sm:w-[38px] sm:rounded-[12px] sm:border-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {highlight ? (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-[10px] bg-[var(--qs-ink)] px-2.5 py-2 text-[11px] font-medium leading-[1.3] text-white shadow-[2px_2px_0_var(--qs-sun)] sm:mt-4 sm:gap-2 sm:rounded-[14px] sm:px-3.5 sm:py-2.5 sm:text-[13px] sm:font-semibold sm:leading-[1.35] sm:shadow-[3px_3px_0_var(--qs-sun)]">
            <Sparkles className="h-4 w-4 shrink-0 fill-[var(--qs-sun)] text-[var(--qs-sun)]" />
            <span className="min-w-0">{highlight}</span>
          </div>
        ) : null}

        <label htmlFor="whatsapp-share-text" className={cn(LABEL, "mt-4 mb-1.5")}>
          Your message
        </label>
        <textarea
          id="whatsapp-share-text"
          autoFocus
          maxLength={1000}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setPhoneError(null);
          }}
          className="min-h-[90px] w-full resize-y rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-2.5 text-[11.5px] font-medium leading-[1.4] text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)] sm:min-h-[120px] sm:rounded-[14px] sm:border-2 sm:p-3 sm:text-[13px] sm:leading-[1.45]"
        />
        <p className="mt-0.5 text-right text-[9.5px] font-medium text-[var(--qs-muted)] sm:mt-1 sm:text-[11.5px] sm:font-semibold">
          {message.length}/1000
        </p>

        <label htmlFor="whatsapp-share-phone" className={cn(LABEL, "mt-3 mb-1.5")}>
          Send to a number (optional)
        </label>
        <div className="flex overflow-hidden rounded-[10px] border border-[var(--qs-line)] focus-within:border-[var(--qs-brand)] sm:rounded-[14px] sm:border-2">
          <span className="grid place-items-center bg-[var(--qs-brand)]/10 px-2.5 text-[12px] font-bold text-[var(--qs-brand)] sm:px-3.5 sm:text-[14px] sm:font-extrabold">
            +91
          </span>
          <input
            id="whatsapp-share-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            placeholder="98765 43210"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setPhoneError(null);
            }}
            className="min-w-0 flex-1 border-0 bg-transparent px-2.5 py-2 text-[11.5px] font-semibold text-[var(--qs-ink)] outline-none sm:px-3.5 sm:py-3 sm:text-[14.5px] sm:font-bold"
          />
        </div>
        <p
          className={cn(
            "mt-1.5 text-[12px] font-medium",
            phoneError ? "font-bold text-[#c0392b]" : "text-[var(--qs-muted)]"
          )}
        >
          {phoneError ?? "Leave empty to pick a contact inside WhatsApp."}
        </p>

        <div className="mt-2.5 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-brand)]/5 p-2.5 sm:mt-4 sm:rounded-[16px] sm:border-2 sm:p-3.5">
          <p className="mb-1.5 text-[10px] font-bold text-[var(--qs-brand)] sm:mb-2 sm:text-[11.5px] sm:font-extrabold">
            Preview
          </p>
          <div className="max-h-[220px] overflow-y-auto">
            <div className="ml-auto max-w-[92%] rounded-[10px_10px_3px_10px] border-[1.5px] border-[var(--qs-ink)] bg-[#dcf5ea] px-2.5 pt-2 pb-1 text-[11px] leading-[1.4] text-[var(--qs-ink)] shadow-[2px_2px_0_var(--qs-ink)] sm:rounded-[14px_14px_4px_14px] sm:border-2 sm:px-3 sm:pt-2.5 sm:pb-1.5 sm:text-[13px] sm:leading-[1.45] sm:shadow-[3px_3px_0_var(--qs-ink)]">
              <div className="break-words">
                {message.trim() ? (
                  <WhatsAppText text={message} />
                ) : (
                  "Your message preview appears here."
                )}
              </div>
              <time className="mt-1 block text-right text-[10.5px] font-semibold text-[var(--qs-muted)]">
                {sentAt} ✓✓
              </time>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2.5">
          <button type="button" onClick={onClose} className={cn(BTN_PLAIN, "flex-1")}>
            Cancel
          </button>
          <button type="button" onClick={send} className={cn(BTN_CTA, "flex-1")}>
            <WhatsAppIcon className="h-[17px] w-[17px] text-[#1fa971]" />
            Send on WhatsApp
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}
