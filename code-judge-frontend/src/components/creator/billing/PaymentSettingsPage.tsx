"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Info,
  Landmark,
  Lock,
  MoreHorizontal,
  Plus,
  ShieldAlert,
  Smartphone,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { useBillingData } from "./hooks";
import {
  BillButton,
  IconButton,
  PageHeader,
  SegmentedControl,
  formatINR,
} from "./ui";
import { WithdrawDrawer } from "./withdraw";
import { WITHDRAWAL_MIN } from "@/config/payouts";
import type {
  BankAccount,
  PaymentNotificationSetting,
  PayoutSchedule,
} from "./types";

/* ============================================
   Data
   ============================================ */

interface PayoutAccount extends BankAccount {
  nickname?: string;
}

interface SchedState {
  mode: PayoutSchedule["mode"];
  weeklyDay: number; // 0 = Sun … 6 = Sat
  monthlyDay: string; // "1" | "5" | … | "last"
}

type AuditKind = "withdraw" | "account" | "security" | "settings";

interface AuditItem {
  id: string;
  label: string;
  detail: string;
  time: string;
  kind: AuditKind;
  failed?: boolean;
  device?: string;
}

const EMPTY_SUMMARY = {
  available: 0,
  pending: 0,
  lastActivity: "No activity yet",
};

const DAILY_LIMIT = 200000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const MONTHLY_DAYS = ["1", "5", "10", "15", "20", "25", "last"];

const NOTIF_GROUPS: Array<{ title: string; ids: PaymentNotificationSetting[] }> = [
  { title: "Earnings", ids: ["payment_received", "weekly_summary"] },
  { title: "Payouts", ids: ["payout_completed", "payout_failed"] },
  { title: "Refunds", ids: ["refund"] },
  { title: "Statements", ids: ["monthly_statement"] },
  { title: "Security", ids: ["security_alerts"] },
];

const NOTIF_META: Record<PaymentNotificationSetting, { label: string; description: string; critical?: boolean }> = {
  payment_received: { label: "Payment received", description: "When a student purchases your test" },
  weekly_summary: { label: "Weekly earnings summary", description: "Every Monday morning" },
  payout_completed: { label: "Payout completed", description: "When a withdrawal reaches your bank" },
  payout_failed: { label: "Payout failed", description: "When a withdrawal cannot be processed", critical: true },
  refund: { label: "Refund requested or completed", description: "When a refund moves on any order" },
  monthly_statement: { label: "Monthly financial statement", description: "First day of each month" },
  security_alerts: { label: "Security alerts", description: "New device logins and account changes", critical: true },
};

const AUDIT_FILTERS = [
  { id: "all", label: "All" },
  { id: "withdraw", label: "Withdrawals" },
  { id: "account", label: "Account changes" },
  { id: "security", label: "Security" },
  { id: "settings", label: "Settings" },
] as const;

type AuditFilter = (typeof AUDIT_FILTERS)[number]["id"];

function maskAcc(num: string): string {
  const digits = num.replace(/\D/g, "");
  return `•••• ${digits.slice(-4)}`;
}

function fmtPayout(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtPayoutShort(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function nextWeekly(dayIdx: number, now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((dayIdx - d.getDay() + 7) % 7));
  return d;
}

function nextMonthly(day: string, now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const lastThis = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const target = day === "last" ? lastThis : Math.min(Number(day), lastThis);
  if (d.getDate() <= target) {
    d.setDate(target);
    return d;
  }
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const lastNext = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  n.setDate(day === "last" ? lastNext : Math.min(Number(day), lastNext));
  return n;
}

function splitAmount(detail: string): { amount?: string; rest: string } {
  const m = detail.match(/^(₹[\d,]+)\s*(.*)$/);
  return m ? { amount: m[1], rest: m[2] } : { rest: detail };
}

/* ============================================
   Bits
   ============================================ */

const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg", FOCUS)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--qs-brand)] " : "bg-[var(--qs-line)] "
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-[var(--qs-surface)] shadow transition-all",
            checked ? "left-6" : "left-1"
          )}
        />
      </span>
    </button>
  );
}

function CardError({ onRetry, what }: { onRetry: () => void; what: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[22px] border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <div>
        <p className="text-sm font-bold text-[var(--qs-bad)] ">Could not load {what}</p>
        <p className="mt-0.5 text-xs text-[var(--qs-bad)]/80 ">Something went wrong on our side.</p>
      </div>
      <BillButton variant="ghost" onClick={onRetry} className="shrink-0 border-[var(--qs-bad)]/30 text-[var(--qs-bad)] ">
        Retry
      </BillButton>
    </div>
  );
}

function Field({ id, label, error, children }: {
  id: string; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[var(--qs-ink)] ">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-[var(--qs-bad)] ">{error}</p>}
    </div>
  );
}

const INPUT =
  "min-h-[46px] w-full rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-3 text-[15px] text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)]    ";

/* Focus-trapped modal shell — bottom sheet on mobile, centered on desktop */
function ModalShell({ onClose, label, children, wide }: {
  onClose: () => void; label: string; children: React.ReactNode; wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = panelRef.current;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && node) {
        const items = [...node.querySelectorAll<HTMLElement>("button, [href], input, select, [tabindex]:not([tabindex='-1'])")]
          .filter((el) => !el.hasAttribute("disabled"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[8px_8px_0_var(--qs-sun)] sm:rounded-[24px]",
          wide ? "sm:max-w-lg" : "sm:max-w-md"
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] px-5 py-4 ">
      <div className="min-w-0">
        <h3 className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-[var(--qs-muted)] ">{sub}</p>}
      </div>
      <IconButton label="Close dialog" onClick={onClose}>
        <X className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

function StepIndicator({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <ol className="flex items-center gap-1.5 px-5 pt-4" aria-label="Progress">
      {labels.map((l, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={l} className="flex flex-1 items-center gap-1.5 last:flex-none">
            <span
              aria-current={current ? "step" : undefined}
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold",
                done || current ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)] " : "bg-[var(--qs-line)] text-[var(--qs-muted)]  "
              )}
            >
              {done ? <Check className="h-3 w-3" aria-hidden="true" /> : n}
            </span>
            <span className={cn("hidden text-[11px] font-bold sm:block", current ? "text-[var(--qs-ink)] " : "text-[var(--qs-muted)]")}>
              {l}
            </span>
            {n !== total && <span className="h-px flex-1 bg-[var(--qs-line)] " aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function OtpStep({ onVerified, actionLabel }: { onVerified: () => void; actionLabel: string }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(30);
  const [error, setError] = useState("");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const setAt = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    setError("");
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const nums = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (nums.length === 0) return;
    e.preventDefault();
    setDigits((prev) => prev.map((_, i) => nums[i] ?? ""));
    setError("");
    refs.current[Math.min(nums.length, 5)]?.focus();
  };

  const verify = () => {
    if (digits.some((d) => !d)) {
      setError("Enter all 6 digits.");
      return;
    }
    onVerified();
  };

  return (
    <div>
      <p className="text-[13px] text-[var(--qs-muted)] ">
        Enter the 6-digit code sent to your registered mobile number.
      </p>
      <div className="mt-4 flex justify-between gap-2" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${i + 1} of 6`}
            className="h-12 w-full min-w-0 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-center text-lg font-extrabold tabular-nums text-[var(--qs-ink)] outline-none transition-colors focus:border-[var(--qs-brand)] focus:ring-2 focus:ring-[var(--qs-brand)]/20 "
          />
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-[var(--qs-bad)] ">{error}</p>}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs tabular-nums text-[var(--qs-muted)] " aria-live="polite">
          {seconds > 0 ? `Resend code in 0:${String(seconds).padStart(2, "0")}` : "You can request a new code."}
        </p>
        <button
          type="button"
          disabled={seconds > 0}
          onClick={() => {
            setSeconds(30);
            setDigits(["", "", "", "", "", ""]);
            setError("");
            refs.current[0]?.focus();
          }}
          className="text-xs font-bold text-[var(--qs-brand)] outline-none hover:text-[var(--qs-brand)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 disabled:cursor-not-allowed disabled:opacity-40 "
        >
          Resend OTP
        </button>
      </div>
      <BillButton variant="primary" className="mt-4 h-11 w-full justify-center" onClick={verify} data-autofocus>
        {actionLabel}
      </BillButton>
    </div>
  );
}

function Kebab({ label, items }: {
  label: string;
  items: Array<{ label: string; icon?: LucideIcon; danger?: boolean; disabled?: boolean; disabledReason?: string; onSelect: () => void }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]   ",
          FOCUS
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label={label} className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-1 shadow-[4px_4px_0_var(--qs-sun)] ">
          {items.map((item) => {
            const Icon = item.icon;
            const btn = (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                title={item.disabled ? item.disabledReason : undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold outline-none transition-colors",
                  item.danger
                    ? "text-[var(--qs-bad)] hover:bg-[var(--qs-badbg)] focus-visible:bg-[var(--qs-badbg)] "
                    : "text-[var(--qs-ink)] hover:bg-[var(--qs-brand)]/[0.06] hover:text-[var(--qs-brand)] focus-visible:bg-[var(--qs-brand)]/[0.06] ",
                  item.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-[var(--qs-ink)] "
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                {item.label}
              </button>
            );
            return btn;
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================
   Page
   ============================================ */

export interface PaymentSettingsPageProps {
  demoState?: "empty" | "error";
  onAddAccount?: (data: { holderName: string; bankName: string; maskedNumber: string; ifsc: string; type: string }) => void;
  onMakePrimary?: (id: string) => void;
  onRemoveAccount?: (id: string) => void;
  onSaveSchedule?: (schedule: SchedState) => void;
  onToggleNotification?: (key: PaymentNotificationSetting, value: boolean) => void;
  onWithdraw?: () => void;
}

const INITIAL_SCHED: SchedState = {
  mode: "manual",
  weeklyDay: 1,
  monthlyDay: "1",
};

export function PaymentSettingsPage({
  demoState, onAddAccount, onMakePrimary, onRemoveAccount, onSaveSchedule, onToggleNotification, onWithdraw,
}: PaymentSettingsPageProps) {
  const toast = useToast();
  const { state, retry } = useBillingData(() => ({ ok: true }), { demoState });
  const [today] = useState(() => new Date());

  const kycComplete = false;

  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [upi, setUpi] = useState<string | null>(null);
  const [sched, setSched] = useState<SchedState>(INITIAL_SCHED);
  const [savedSched, setSavedSched] = useState<SchedState>(INITIAL_SCHED);

  const [events, setEvents] = useState<Record<PaymentNotificationSetting, boolean>>(() => {
    const base = Object.fromEntries(
      NOTIF_GROUPS.flatMap((group) => group.ids).map((id) => [id, false])
    ) as Record<PaymentNotificationSetting, boolean>;
    return base;
  });
  const [channels, setChannels] = useState({ email: false, sms: false, whatsapp: false });
  const [saveNote, setSaveNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmOff, setConfirmOff] = useState<PaymentNotificationSetting | null>(null);

  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("all");
  const [auditShown, setAuditShown] = useState(5);

  const [addBankOpen, setAddBankOpen] = useState(false);
  const [upiOpen, setUpiOpen] = useState(false);
  const [nicknameFor, setNicknameFor] = useState<PayoutAccount | null>(null);
  const [removeFor, setRemoveFor] = useState<{ kind: "bank"; acc: PayoutAccount } | { kind: "upi" } | null>(null);
  const [otpFor, setOtpFor] = useState<{ title: string; detail: string; onVerified: () => void } | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const primary = accounts.find((a) => a.isPrimary);
  const schedDirty = sched.mode !== savedSched.mode || sched.weeklyDay !== savedSched.weeklyDay || sched.monthlyDay !== savedSched.monthlyDay;

  const nextPayout: Date | null = useMemo(() => {
    if (sched.mode === "manual") return null;
    return sched.mode === "weekly" ? nextWeekly(sched.weeklyDay, today) : nextMonthly(sched.monthlyDay, today);
  }, [sched, today]);

  const pushAudit = (item: Omit<AuditItem, "id" | "time">) =>
    setAudit((prev) => [{ ...item, id: `aud_${Date.now()}`, time: "Just now" }, ...prev]);

  const canWithdraw = kycComplete && (accounts.length > 0 || upi !== null) && EMPTY_SUMMARY.available >= WITHDRAWAL_MIN;
  const withdrawHint = !kycComplete
    ? "Complete KYC to enable withdrawals"
    : accounts.length === 0 && upi === null
      ? "Add a payout account first"
      : EMPTY_SUMMARY.available < WITHDRAWAL_MIN
        ? `Minimum withdrawal is ${formatINR(WITHDRAWAL_MIN)}`
        : undefined;

  const doWithdraw = () => {
    if (!canWithdraw) return;
    if (onWithdraw) return onWithdraw();
    setWithdrawOpen(true);
  };

  const doMakePrimary = (acc: PayoutAccount) => {
    const apply = () => {
      setAccounts((prev) => prev.map((a) => ({ ...a, isPrimary: a.id === acc.id })));
      pushAudit({ label: "Payout account changed", detail: `Default set to ${acc.bankName} ${acc.maskedNumber}`, kind: "account", device: "Chrome on Windows, New Delhi" });
      toast.success({ title: "Payout account updated", description: `${acc.bankName} ${acc.maskedNumber} is now primary.` });
      if (onMakePrimary) onMakePrimary(acc.id);
    };
    setOtpFor({ title: "Make primary", detail: `${acc.bankName} ${acc.maskedNumber} will receive future payouts.`, onVerified: apply });
  };

  const doRemoveBank = (acc: PayoutAccount) => {
    const apply = () => {
      setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
      pushAudit({ label: "Bank account removed", detail: `${acc.bankName} ${acc.maskedNumber}`, kind: "account", device: "Chrome on Windows, New Delhi" });
      toast.success({ title: "Account removed", description: `${acc.bankName} ${acc.maskedNumber} was removed.` });
      if (onRemoveAccount) onRemoveAccount(acc.id);
    };
    setOtpFor({ title: "Remove account", detail: `${acc.bankName} ${acc.maskedNumber} will be removed.`, onVerified: apply });
  };

  const doRemoveUpi = () => {
    const apply = () => {
      setUpi(null);
      pushAudit({ label: "UPI ID removed", detail: "Payouts will go to your bank account", kind: "account", device: "Chrome on Windows, New Delhi" });
      toast.success({ title: "UPI ID removed", description: "Your UPI ID was removed." });
    };
    setOtpFor({ title: "Remove UPI ID", detail: "Future payouts will go to your bank account.", onVerified: apply });
  };

  const saveSchedule = () => {
    setSavedSched(sched);
    pushAudit({
      label: "Payout schedule changed",
      detail: sched.mode === "manual" ? "Automatic payouts turned off" : `${sched.mode === "weekly" ? "Weekly" : "Monthly"} schedule saved`,
      kind: "settings",
      device: "Chrome on Windows, New Delhi",
    });
    toast.success({ title: "Schedule saved", description: "Your payout schedule was updated." });
    if (onSaveSchedule) onSaveSchedule(sched);
  };

  const toggleEvent = (id: PaymentNotificationSetting, value: boolean) => {
    const meta = NOTIF_META[id];
    if (!value && meta.critical) {
      setConfirmOff(id);
      return;
    }
    applyToggle(id, value);
  };

  const applyToggle = (id: PaymentNotificationSetting, value: boolean) => {
    const prev = events[id];
    setEvents((e) => ({ ...e, [id]: value }));
    setSaveNote(null);
    window.setTimeout(() => {
      setEvents((e) => ({ ...e, [id]: value }));
      setSaveNote({ ok: true, text: `Saved ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` });
      if (onToggleNotification) onToggleNotification(id, value);
    }, 450);
    void prev;
  };

  const filteredAudit = auditFilter === "all" ? audit : audit.filter((a) => a.kind === auditFilter);
  const visibleAudit = filteredAudit.slice(0, auditShown);

  const AUDIT_STYLE: Record<AuditKind, { icon: LucideIcon; tile: string }> = {
    withdraw: { icon: Wallet, tile: "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" },
    account: { icon: CreditCard, tile: "bg-[#2457d6] text-[var(--qs-on-brand)]" },
    security: { icon: ShieldAlert, tile: "bg-amber-500 text-[var(--qs-on-brand)]" },
    settings: { icon: Bell, tile: "bg-[var(--qs-muted)] text-[var(--qs-on-brand)]" },
  };

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        title="Payment settings"
        subtitle="Manage payout accounts, automatic payouts and financial alerts."
      />

      {state === "loading" && (
        <>
          <div className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="app-skeleton h-3 w-24" aria-hidden="true" />
                  <div className="app-skeleton mt-2 h-7 w-28" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5" aria-label="Loading">
                <div className="app-skeleton h-4 w-40" aria-hidden="true" />
                <div className="app-skeleton mt-4 h-20 w-full rounded-[14px]" aria-hidden="true" />
                <div className="app-skeleton mt-3 h-20 w-full rounded-[14px]" aria-hidden="true" />
              </div>
            ))}
          </div>
        </>
      )}

      {(state === "ready" || state === "error") && (
        <>
          {!kycComplete && (
            <div className="flex flex-col gap-2 rounded-[22px] border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="status">
              <p className="flex items-start gap-2 text-[13px] font-semibold text-[#8a5600] ">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Complete KYC to enable withdrawals.
              </p>
              <BillButton
                variant="primary"
                className="h-9 shrink-0 bg-amber-500 hover:bg-amber-600 "
                onClick={() => toast.info({ title: "KYC verification", description: "A verification link was sent to your email." })}
              >
                Complete KYC
              </BillButton>
            </div>
          )}

          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-brand)]" />
                Available balance
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="qs-display text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--qs-ink)]">
                  {formatINR(EMPTY_SUMMARY.available)}
                </p>
                <span title={withdrawHint} className="inline-flex">
                  <BillButton variant="primary" className="h-8 px-3 text-[11px]" disabled={!canWithdraw} onClick={doWithdraw}>
                    Withdraw
                  </BillButton>
                </span>
              </div>
              <p className="mt-1.5 text-[12px] text-[var(--qs-muted)]">Ready to withdraw</p>
            </div>
            <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-sun)]" />
                Pending clearance
                <span title="Amounts become withdrawable 3 days after a sale." aria-label="Amounts become withdrawable 3 days after a sale.">
                  <Info className="h-3.5 w-3.5 cursor-help" aria-hidden="true" />
                </span>
              </p>
              <p className="qs-display mt-2 text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--qs-ink)]">
                {formatINR(EMPTY_SUMMARY.pending)}
              </p>
              <p className="mt-1.5 text-[12px] text-[var(--qs-muted)]">Clears in up to 3 days</p>
            </div>
            <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-ok)]" />
                Next payout
              </p>
              <p className="qs-display mt-2 text-[20px] font-extrabold leading-none tracking-tight text-[var(--qs-ink)]">
                {nextPayout ? fmtPayoutShort(nextPayout) : "Manual"}
              </p>
              <p className="mt-1.5 text-[12px] text-[var(--qs-muted)]">Automatic payout schedule</p>
            </div>
            <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2457d6]" />
                Last activity
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[14px] font-bold tabular-nums text-[var(--qs-ink)]">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)]" aria-hidden="true" />
                {EMPTY_SUMMARY.lastActivity}
              </p>
              <p className="mt-1.5 text-[12px] text-[var(--qs-muted)]">Secure account activity</p>
            </div>
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            {/* LEFT: payout accounts */}
            {state === "error" ? <CardError onRetry={() => retry()} what="payout accounts" /> : (
            <section aria-labelledby="payout-accounts-h" className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="payout-accounts-h" className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">Payout accounts</h2>
                  <p className="mt-0.5 text-xs text-[var(--qs-muted)] ">Where your withdrawals are sent</p>
                </div>
                <BillButton variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setAddBankOpen(true)} className="shrink-0">
                  Add account
                </BillButton>
              </div>

              {accounts.length === 0 && upi === null ? (
                <div className="mt-4 flex flex-col items-center rounded-[14px] border border-dashed border-[var(--qs-line)] px-6 py-10 text-center ">
                  <span className="grid h-14 w-14 place-items-center rounded-[22px] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)] " aria-hidden="true">
                    <Landmark className="h-7 w-7" />
                  </span>
                  <p className="mt-4 text-sm font-bold text-[var(--qs-ink)] ">No payout account yet</p>
                  <p className="mt-1 max-w-xs text-xs text-[var(--qs-muted)] ">
                    Add a bank account or UPI ID to receive your earnings.
                  </p>
                  <BillButton variant="primary" className="mt-5" onClick={() => setAddBankOpen(true)}>
                    Add account
                  </BillButton>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {accounts.map((acc) => (
                    <li
                      key={acc.id}
                      className={cn(
                        "flex items-center gap-3 rounded-[14px] border p-4",
                        acc.isPrimary
                          ? "border-[var(--qs-brand)]/40 bg-[var(--qs-sun)]/25  "
                          : "border-[var(--qs-line)] bg-[var(--qs-surface)]  "
                      )}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[var(--qs-line)]/40 text-[var(--qs-muted)] " aria-hidden="true">
                        <Landmark className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--qs-ink)] ">
                          {acc.nickname ?? acc.bankName}
                          {acc.isPrimary && (
                            <span className="inline-flex items-center rounded-full bg-[var(--qs-brand)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-on-brand)] ">
                              Primary
                            </span>
                          )}
                          {acc.verified ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-ok)] ">
                              <Check className="h-3 w-3" aria-hidden="true" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-muted)] ">
                              Pending
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs tabular-nums text-[var(--qs-ink)] ">{acc.maskedNumber}</p>
                        <p className="mt-0.5 truncate text-xs text-[var(--qs-muted)] ">
                          {acc.holderName} · IFSC {acc.ifsc}
                        </p>
                      </div>
                      {!acc.isPrimary && (
                        <button
                          type="button"
                          onClick={() => doMakePrimary(acc)}
                          className={cn(
                            "hidden shrink-0 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)] sm:block   ",
                            FOCUS
                          )}
                        >
                          Make primary
                        </button>
                      )}
                      <Kebab
                        label={`More actions for ${acc.bankName}`}
                        items={[
                          ...(acc.isPrimary
                            ? []
                            : [{ label: "Make primary", onSelect: () => doMakePrimary(acc) }]),
                          { label: "Edit nickname", onSelect: () => setNicknameFor(acc) },
                          {
                            label: "Remove", danger: true,
                            disabled: acc.isPrimary && accounts.length > 1,
                            disabledReason: acc.isPrimary ? "Make another account primary before removing this one." : undefined,
                            onSelect: () => setRemoveFor({ kind: "bank", acc }),
                          },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {upi !== null && (
                <div className="mt-4 border-t-2 border-[var(--qs-line)] pt-4 ">
                  <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--qs-muted)] ">UPI</p>
                  <div className="flex items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 ">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[var(--qs-okbg)] text-[var(--qs-ok)] " aria-hidden="true">
                      <Smartphone className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--qs-ink)] ">
                        <span className="truncate tabular-nums">{upi}</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-ok)] ">
                          <Check className="h-3 w-3" aria-hidden="true" /> Active
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--qs-muted)] ">Verified UPI ID for instant payouts</p>
                    </div>
                    <Kebab
                      label="More actions for UPI ID"
                      items={[
                        { label: "Change UPI ID", onSelect: () => setUpiOpen(true) },
                        { label: "Remove", danger: true, onSelect: () => setRemoveFor({ kind: "upi" }) },
                      ]}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => setAddBankOpen(true)}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--qs-line)] py-3 text-xs font-semibold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)]  ",
                    FOCUS
                  )}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add bank account
                </button>
                <button
                  type="button"
                  onClick={() => setUpiOpen(true)}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--qs-line)] py-3 text-xs font-semibold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)]  ",
                    FOCUS
                  )}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add UPI ID
                </button>
              </div>
            </section>
            )}

            {/* RIGHT: payout schedule */}
            {state === "error" ? <CardError onRetry={() => retry()} what="payout schedule" /> : (
            <div className="space-y-6">
              <section aria-labelledby="payout-schedule-h" className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
                <h2 id="payout-schedule-h" className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">Payout schedule</h2>
                <p className="mt-0.5 text-xs text-[var(--qs-muted)] ">How often you receive payouts</p>

                <SegmentedControl
                  value={sched.mode}
                  onChange={(m) => setSched((s) => ({ ...s, mode: m }))}
                  options={[
                    { id: "manual", label: "Manual" },
                    { id: "weekly", label: "Weekly" },
                    { id: "monthly", label: "Monthly" },
                  ]}
                  size="md"
                  className="mt-4 w-full"
                />

                {sched.mode === "manual" && (
                  <p className="mt-3 text-[13px] text-[var(--qs-muted)] ">
                    You request payouts manually.
                  </p>
                )}
                {sched.mode === "weekly" && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-[var(--qs-ink)] ">Payout day</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Day of week">
                      {MONDAY_FIRST.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSched((s) => ({ ...s, weeklyDay: d }))}
                          aria-pressed={sched.weeklyDay === d}
                          aria-label={`Pay out every ${WEEKDAY_FULL[d]}`}
                          className={cn(
                            "h-10 min-w-11 flex-1 cursor-pointer rounded-[14px] border px-2 text-xs font-bold transition-colors",
                            sched.weeklyDay === d
                              ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]  "
                              : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)]   ",
                            FOCUS
                          )}
                        >
                          {WEEKDAYS[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {sched.mode === "monthly" && (
                  <div className="relative mt-4">
                    <label htmlFor="sched-dom" className="mb-1.5 block text-xs font-semibold text-[var(--qs-ink)] ">
                      Day of month
                    </label>
                    <select
                      id="sched-dom"
                      value={sched.monthlyDay}
                      onChange={(e) => setSched((s) => ({ ...s, monthlyDay: e.target.value }))}
                      className={cn(INPUT, "appearance-none pr-10", FOCUS)}
                    >
                      {MONTHLY_DAYS.map((d) => (
                        <option key={d} value={d}>{d === "last" ? "Last day" : `Day ${d}`}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute bottom-3.5 right-3.5 h-4 w-4 text-[var(--qs-muted)]" aria-hidden="true" />
                  </div>
                )}

                <p className="mt-4 flex items-start gap-2 rounded-[14px] bg-[var(--qs-brand)]/[0.06] px-3.5 py-3 text-[13px] font-semibold text-[var(--qs-ink)] ">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-brand)] " aria-hidden="true" />
                  {nextPayout
                    ? `Next payout: ${fmtPayout(nextPayout)} to ${primary ? `${primary.bankName} ${primary.maskedNumber}` : "your primary account"}`
                    : "You request payouts manually."}
                </p>
                <p className="mt-2 text-xs text-[var(--qs-muted)] ">
                  Balance below {formatINR(WITHDRAWAL_MIN)} rolls over to the next payout.
                </p>

                <BillButton variant="primary" className="mt-4 h-11 w-full justify-center" disabled={!schedDirty} onClick={saveSchedule}>
                  Save schedule
                </BillButton>

                {sched.mode === "manual" && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 ">
                    <Wallet className="h-4 w-4 shrink-0 text-[var(--qs-brand)] " aria-hidden="true" />
                    <p className="text-xs text-[var(--qs-muted)] ">
                      Minimum withdrawal {formatINR(WITHDRAWAL_MIN)}. Request anytime from your balance above.
                    </p>
                  </div>
                )}
              </section>

              <section aria-labelledby="payout-limits-h" className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
                <h2 id="payout-limits-h" className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">Payout limits</h2>
                <dl className="mt-3 space-y-2.5">
                  {[
                    ["Minimum withdrawal", formatINR(WITHDRAWAL_MIN)],
                    ["Daily limit", formatINR(DAILY_LIMIT)],
                    ["Processing time", "1 to 2 working days"],
                  ].map(([k, v], i, arr) => (
                    <div key={k} className={cn("flex items-center justify-between", i !== arr.length - 1 && "border-b-2 border-[var(--qs-line)] pb-2.5 ")}>
                      <dt className="text-xs text-[var(--qs-muted)] ">{k}</dt>
                      <dd className="text-xs font-bold tabular-nums text-[var(--qs-ink)] ">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
            )}
          </div>

          {/* Notifications */}
          {state === "error" ? <CardError onRetry={() => retry()} what="notifications" /> : (
          <section aria-labelledby="notif-h" className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <h2 id="notif-h" className="qs-display flex items-center gap-2 text-[20px] font-extrabold text-[var(--qs-ink)]">
                  Payment notifications
                  {saveNote && (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs font-semibold",
                      saveNote.ok ? "text-[var(--qs-ok)] " : "text-[var(--qs-bad)] "
                    )} role="status">
                      {saveNote.ok && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      {saveNote.text}
                    </span>
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--qs-muted)] ">Choose which financial events notify you</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Notification channels">
              <span className="text-xs font-semibold text-[var(--qs-muted)] ">Channels:</span>
              {(["email", "sms", "whatsapp"] as const).map((c) => {
                const on = channels[c];
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChannels((ch) => ({ ...ch, [c]: !ch[c] }))}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                      on
                        ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]  "
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)]   ",
                      FOCUS
                    )}
                  >
                    {on && <Check className="h-3 w-3" aria-hidden="true" />}
                    {c === "sms" ? "SMS" : c === "whatsapp" ? "WhatsApp" : "Email"}
                  </button>
                );
              })}
            </div>

            {NOTIF_GROUPS.map((g) => (
              <div key={g.title} className="mt-5">
                <h3 className="text-[13px] font-bold text-[var(--qs-ink)] ">{g.title}</h3>
                <ul className="mt-1 divide-y-2 divide-[var(--qs-line)] ">
                  {g.ids.map((id) => {
                    const meta = NOTIF_META[id];
                    return (
                      <li key={id} className="flex min-h-[44px] items-center justify-between gap-4 py-1.5">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[var(--qs-ink)] ">
                            {meta.label}
                            {meta.critical && (
                              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-[#a85d00] ">
                                Recommended
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--qs-muted)] ">{meta.description}</p>
                        </div>
                        <Switch checked={events[id]} onChange={(v) => toggleEvent(id, v)} label={`${meta.label} notifications`} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
          )}

          {/* Audit activity */}
          {state === "error" ? <CardError onRetry={() => retry()} what="audit activity" /> : (
          <section aria-labelledby="audit-h" className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="audit-h" className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">Audit activity</h2>
                <p className="mt-0.5 text-xs text-[var(--qs-muted)] ">Security-sensitive financial actions</p>
              </div>
              <button
                type="button"
                onClick={() => { setAuditFilter("all"); setAuditShown(5); }}
                className={cn("inline-flex items-center gap-1 text-xs font-bold text-[var(--qs-brand)] hover:text-[var(--qs-brand)] ", FOCUS, "rounded-lg")}
              >
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter audit activity">
              {AUDIT_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setAuditFilter(f.id); setAuditShown(5); }}
                  aria-pressed={auditFilter === f.id}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                    auditFilter === f.id
                      ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]  "
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)]   ",
                    FOCUS
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredAudit.length === 0 ? (
              <p className="mt-4 rounded-[14px] bg-[var(--qs-bg)] px-4 py-6 text-center text-xs text-[var(--qs-muted)] ">
                No activity in this category yet.
              </p>
            ) : (
              <ol className="relative mt-4">
                <span className="absolute bottom-2 left-[11px] top-2 w-px bg-[var(--qs-line)] " aria-hidden="true" />
                {visibleAudit.map((item) => {
                  const st = AUDIT_STYLE[item.kind];
                  const Icon = st.icon;
                  const { amount, rest } = splitAmount(item.detail);
                  return (
                    <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                      <span className={cn("z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full", st.tile)} aria-hidden="true">
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[var(--qs-ink)] ">
                          {item.label}
                          {item.failed && (
                            <span className="inline-flex items-center rounded-full bg-[var(--qs-badbg)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-bad)] ">
                              Failed
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--qs-muted)] ">
                          {amount && <span className="font-bold tabular-nums text-[var(--qs-ink)] ">{amount} </span>}
                          {rest}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-[var(--qs-muted)] ">{item.time}</p>
                        {item.device && (
                          <p className="mt-0.5 text-[11px] text-[var(--qs-muted)] sm:hidden ">{item.device}</p>
                        )}
                      </div>
                      {item.device && (
                        <p className="ml-2 hidden max-w-40 shrink-0 text-right text-[11px] leading-5 text-[var(--qs-muted)] sm:block ">
                          {item.device}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {filteredAudit.length > auditShown && (
              <button
                type="button"
                onClick={() => setAuditShown((n) => n + 5)}
                className={cn(
                  "mt-4 w-full rounded-[14px] border-2 border-[var(--qs-line)] py-2.5 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)]  ",
                  FOCUS
                )}
              >
                Load more
              </button>
            )}
          </section>
          )}
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {addBankOpen && (
          <AddBankModal
            key="add-bank"
            onClose={() => setAddBankOpen(false)}
            onAdded={(data) => {
              const acc: PayoutAccount = {
                id: `acc_${Date.now()}`,
                bankName: data.bankName,
                holderName: data.holderName,
                maskedNumber: data.maskedNumber,
                ifsc: data.ifsc,
                upiId: "",
                isPrimary: accounts.length === 0,
                verified: false,
              };
              setAccounts((prev) => [...prev, acc]);
              pushAudit({ label: "Bank account added", detail: `${data.bankName} ${data.maskedNumber}`, kind: "account", device: "Chrome on Windows, New Delhi" });
              toast.success({ title: "Account added", description: `${data.bankName} ${data.maskedNumber} is pending verification.` });
              setAddBankOpen(false);
              if (onAddAccount) onAddAccount(data);
            }}
          />
        )}
        {upiOpen && (
          <UpiModal
            key="upi"
            current={upi}
            onClose={() => setUpiOpen(false)}
            onSaved={(masked) => {
              setUpi(masked);
              pushAudit({ label: "UPI ID updated", detail: `${masked} added`, kind: "account", device: "Chrome on Windows, New Delhi" });
              toast.success({ title: "UPI ID updated", description: `${masked} is pending verification.` });
              setUpiOpen(false);
            }}
          />
        )}
        {nicknameFor && (
          <NicknameModal
            key="nickname"
            acc={nicknameFor}
            onClose={() => setNicknameFor(null)}
            onSave={(nickname) => {
              setAccounts((prev) => prev.map((a) => (a.id === nicknameFor.id ? { ...a, nickname } : a)));
              toast.success({ title: "Nickname saved", description: `Account renamed to “${nickname}”.` });
              setNicknameFor(null);
            }}
          />
        )}
        {removeFor && (
          <ModalShell
            key="remove"
            label={removeFor.kind === "bank" ? "Remove bank account" : "Remove UPI ID"}
            onClose={() => setRemoveFor(null)}
          >
            <ModalHead
              title={removeFor.kind === "bank" ? "Remove bank account?" : "Remove UPI ID?"}
              sub="This action is written to your audit activity."
              onClose={() => setRemoveFor(null)}
            />
            <div className="overflow-y-auto p-5">
              <div className="flex items-start gap-2.5 rounded-[14px] bg-[var(--qs-badbg)] px-3.5 py-3 text-[13px] text-[var(--qs-ink)] ">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" aria-hidden="true" />
                {removeFor.kind === "bank"
                  ? `${removeFor.acc.bankName} ${removeFor.acc.maskedNumber} will stop receiving payouts.`
                  : "Future payouts will go to your bank account."}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-[var(--qs-muted)] ">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                For your safety, withdrawals to a new account are held for 24 hours.
              </p>
              <div className="mt-5 flex gap-2">
                <BillButton variant="ghost" className="h-11 flex-1 justify-center" onClick={() => setRemoveFor(null)}>
                  Cancel
                </BillButton>
                <BillButton
                  variant="danger"
                  className="h-11 flex-1 justify-center"
                  data-autofocus
                  onClick={() => {
                    const target = removeFor;
                    setRemoveFor(null);
                    if (target.kind === "bank") doRemoveBank(target.acc);
                    else doRemoveUpi();
                  }}
                >
                  Continue
                </BillButton>
              </div>
            </div>
          </ModalShell>
        )}
        {otpFor && (
          <ModalShell key="otp" label={otpFor.title} onClose={() => setOtpFor(null)}>
            <ModalHead title={otpFor.title} sub={otpFor.detail} onClose={() => setOtpFor(null)} />
            <div className="overflow-y-auto p-5">
              <OtpStep
                actionLabel="Verify and confirm"
                onVerified={() => {
                  otpFor.onVerified();
                  setOtpFor(null);
                }}
              />
            </div>
          </ModalShell>
        )}
        {confirmOff && (
          <ModalShell key="confirm-off" label="Keep this alert on?" onClose={() => setConfirmOff(null)}>
            <ModalHead
              title={`Turn off “${NOTIF_META[confirmOff].label}”?`}
              sub="You may miss time-sensitive money alerts."
              onClose={() => setConfirmOff(null)}
            />
            <div className="overflow-y-auto p-5">
              <div className="flex items-start gap-2.5 rounded-[14px] bg-amber-500/[0.08] px-3.5 py-3 text-[13px] text-[var(--qs-ink)] ">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                This alert is recommended. Turning it off means failed payouts or new logins won’t notify you.
              </div>
              <div className="mt-5 flex gap-2">
                <BillButton variant="ghost" className="h-11 flex-1 justify-center" data-autofocus onClick={() => setConfirmOff(null)}>
                  Keep on
                </BillButton>
                <BillButton
                  variant="primary"
                  className="h-11 flex-1 justify-center"
                  onClick={() => {
                    applyToggle(confirmOff, false);
                    setConfirmOff(null);
                  }}
                >
                  Turn off
                </BillButton>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <WithdrawDrawer
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        accounts={accounts}
        available={EMPTY_SUMMARY.available}
        nextPayoutDate={nextPayout ? fmtPayout(nextPayout) : "Manual"}
      />
    </div>
  );
}

/* ============================================
   Add bank account — 3-step secure flow
   ============================================ */

function AddBankModal({ onClose, onAdded }: {
  onClose: () => void;
  onAdded: (data: { holderName: string; bankName: string; maskedNumber: string; ifsc: string; type: string }) => void;
}) {
  const [step, setStep] = useState(1);
  const [holder, setHolder] = useState("");
  const [accNum, setAccNum] = useState("");
  const [confirmNum, setConfirmNum] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accType, setAccType] = useState("Savings");
  const [errors, setErrors] = useState({ holder: "", acc: "", confirm: "", ifsc: "" });

  const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  const validate = () => {
    const e = { holder: "", acc: "", confirm: "", ifsc: "" };
    if (holder.trim().length < 3) e.holder = "Enter the account holder name.";
    if (!/^\d{9,18}$/.test(accNum.replace(/\s/g, ""))) e.acc = "Account number must be 9–18 digits.";
    if (confirmNum !== accNum) e.confirm = "Account numbers do not match.";
    if (!ifscValid) e.ifsc = "IFSC must be 11 characters, e.g. HDFC0001234.";
    setErrors(e);
    return !e.holder && !e.acc && !e.confirm && !e.ifsc;
  };

  return (
    <ModalShell label="Add bank account" onClose={onClose} wide>
      <ModalHead title="Add bank account" sub="Payouts are enabled after the provider verifies this account." onClose={onClose} />
      <StepIndicator step={step} total={2} labels={["Details", "Review"]} />
      <div className="overflow-y-auto p-5">
        {step === 1 && (
          <div className="space-y-3.5">
            <Field id="ba-holder" label="Account holder name" error={errors.holder}>
              <input
                id="ba-holder" value={holder} onChange={(e) => setHolder(e.target.value)}
                placeholder="As per bank records" autoComplete="off"
                className={cn(INPUT, errors.holder && "border-[var(--qs-bad)]", FOCUS)} data-autofocus
              />
            </Field>
            <Field id="ba-num" label="Account number" error={errors.acc}>
              <input
                id="ba-num" value={accNum} onChange={(e) => setAccNum(e.target.value.replace(/\D/g, "").slice(0, 18))}
                placeholder="9–18 digits" inputMode="numeric" autoComplete="off"
                className={cn(INPUT, errors.acc && "border-[var(--qs-bad)]", FOCUS, "tabular-nums")}
              />
            </Field>
            <Field id="ba-confirm" label="Confirm account number" error={errors.confirm}>
              <input
                id="ba-confirm" value={confirmNum}
                onChange={(e) => setConfirmNum(e.target.value.replace(/\D/g, "").slice(0, 18))}
                onPaste={(e) => e.preventDefault()}
                placeholder="Re-enter the account number" inputMode="numeric" autoComplete="off"
                className={cn(INPUT, errors.confirm && "border-[var(--qs-bad)]", FOCUS, "tabular-nums")}
              />
            </Field>
            <Field id="ba-ifsc" label="IFSC" error={errors.ifsc}>
              <input
                id="ba-ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
                placeholder="HDFC0001234" autoComplete="off" autoCapitalize="characters"
                className={cn(INPUT, errors.ifsc && "border-[var(--qs-bad)]", FOCUS, "uppercase tabular-nums")}
              />
            </Field>
            {ifscValid && (
              <p className="flex items-start gap-1.5 rounded-[10px] bg-[var(--qs-okbg)] px-3 py-2.5 text-xs text-[var(--qs-ok)] " role="status">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                IFSC format is valid — bank will be confirmed during verification.
              </p>
            )}
            <div className="relative">
              <label htmlFor="ba-type" className="mb-1.5 block text-[13px] font-semibold text-[var(--qs-ink)] ">
                Account type
              </label>
              <select id="ba-type" value={accType} onChange={(e) => setAccType(e.target.value)} className={cn(INPUT, "appearance-none pr-10", FOCUS)}>
                <option>Savings</option>
                <option>Current</option>
              </select>
              <ChevronDown className="pointer-events-none absolute bottom-3.5 right-3.5 h-4 w-4 text-[var(--qs-muted)]" aria-hidden="true" />
            </div>
            <BillButton
              variant="primary" className="h-11 w-full justify-center" data-autofocus
              onClick={() => {
                if (!validate()) return;
                setStep(2);
              }}
            >
              Continue
            </BillButton>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="rounded-[14px] border-2 border-[var(--qs-line)] p-4 text-sm ">
              <p className="font-semibold text-[var(--qs-ink)] ">Review the account details.</p>
              <p className="mt-1 text-xs tabular-nums text-[var(--qs-muted)] ">
                {holder.trim()} · {maskAcc(accNum)} · IFSC {ifsc}
              </p>
            </div>
            <p className="mt-3 rounded-[14px] bg-[var(--qs-okbg)] px-3.5 py-3 text-xs text-[var(--qs-ok)] " role="status">
              The payout provider will verify this account before withdrawals are enabled.
            </p>
            <div className="mt-4 flex gap-2">
              <BillButton variant="ghost" className="h-11 flex-1 justify-center" onClick={() => setStep(1)}>
                Back
              </BillButton>
              <BillButton
                variant="primary"
                className="h-11 flex-1 justify-center"
                data-autofocus
                onClick={() =>
                  onAdded({
                    holderName: holder.trim(),
                    bankName: "Bank account",
                    maskedNumber: maskAcc(accNum),
                    ifsc,
                    type: accType,
                  })
                }
              >
                Add account
              </BillButton>
            </div>
          </div>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-xs text-[var(--qs-muted)] ">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          For your safety, withdrawals to a new account are held for 24 hours.
        </p>
      </div>
    </ModalShell>
  );
}

/* ============================================
   UPI modal — verify ID, confirm holder, OTP
   ============================================ */

function UpiModal({ current, onClose, onSaved }: {
  current: string | null; onClose: () => void; onSaved: (masked: string) => void;
}) {
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) {
      setError("Enter a valid UPI ID, e.g. name@okhdfcbank.");
      return;
    }
    setError("");
    onSaved(maskedPreview(upiId.trim()));
  };

  const maskedPreview = (id: string) => {
    const [name, bank] = id.split("@");
    return `${name.slice(0, 2)}••••@${bank}`;
  };

  return (
    <ModalShell label={current ? "Change UPI ID" : "Add UPI ID"} onClose={onClose}>
      <ModalHead
        title={current ? "Change UPI ID" : "Add UPI ID"}
        sub={current ? `Current: ${current}` : "Payouts go straight to this ID."}
        onClose={onClose}
      />
      <div className="overflow-y-auto p-5">
        <div>
          <Field id="upi-id" label="UPI ID" error={error}>
            <input
              id="upi-id" value={upiId}
              onChange={(e) => { setUpiId(e.target.value); setError(""); }}
              placeholder="name@okhdfcbank" autoComplete="off" inputMode="email" autoCapitalize="off"
              className={cn(INPUT, error && "border-[var(--qs-bad)]", FOCUS)} data-autofocus
            />
          </Field>
          <p className="mt-3 rounded-[14px] bg-[var(--qs-okbg)] px-3.5 py-3 text-xs text-[var(--qs-ok)] " role="status">
            The payout provider will verify this UPI ID before withdrawals are enabled.
          </p>
          <BillButton variant="primary" className="mt-4 h-11 w-full justify-center" onClick={save}>
            Save UPI ID
          </BillButton>
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-xs text-[var(--qs-muted)] ">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          For your safety, withdrawals to a new account are held for 24 hours.
        </p>
      </div>
    </ModalShell>
  );
}

/* ============================================
   Nickname modal
   ============================================ */

function NicknameModal({ acc, onClose, onSave }: {
  acc: PayoutAccount; onClose: () => void; onSave: (nickname: string) => void;
}) {
  const [name, setName] = useState(acc.nickname ?? acc.bankName);
  const [error, setError] = useState("");

  return (
    <ModalShell label="Edit account nickname" onClose={onClose}>
      <ModalHead title="Edit nickname" sub={`${acc.bankName} ${acc.maskedNumber}`} onClose={onClose} />
      <div className="overflow-y-auto p-5">
        <Field id="nick" label="Nickname" error={error}>
          <input
            id="nick" value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="e.g. Salary account" maxLength={40}
            className={cn(INPUT, error && "border-[var(--qs-bad)]", FOCUS)} data-autofocus
          />
        </Field>
        <div className="mt-5 flex gap-2">
          <BillButton variant="ghost" className="h-11 flex-1 justify-center" onClick={onClose}>
            Cancel
          </BillButton>
          <BillButton
            variant="primary" className="h-11 flex-1 justify-center"
            onClick={() => {
              if (name.trim().length < 2) {
                setError("Enter at least 2 characters.");
                return;
              }
              onSave(name.trim());
            }}
          >
            Save
          </BillButton>
        </div>
      </div>
    </ModalShell>
  );
}

export default PaymentSettingsPage;
