"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  CreditCard,
  CalendarClock,
  Bell,
  ShieldAlert,
  Plus,
  X,
  Lock,
  Landmark,
  Smartphone,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { Toggle, SettingsRow } from "@/components/ui/settings";
import { useBillingData } from "./hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  SegmentedControl,
  BillButton,
  IconButton,
  StatusBadge,
  TableSkeleton,
  ErrorState,
  SecureNote,
} from "./ui";
import {
  BANK_ACCOUNTS,
  UPI_ID,
  PAYOUT_SCHEDULE,
  NOTIFICATION_SETTINGS,
  AUDIT_LOG,
  WALLET,
  WITHDRAWAL_MIN,
} from "./mockData";
import type { BankAccount, PaymentNotificationSetting, PayoutSchedule } from "./types";

const SCHEDULE_OPTIONS: Array<{ id: PayoutSchedule["mode"]; label: string }> = [
  { id: "manual", label: "Manual" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const AUDIT_ICON = {
  withdraw: Building2,
  account: CreditCard,
  login: ShieldAlert,
  settings: Bell,
};

export function PaymentSettingsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const { state, retry } = useBillingData(() => ({ ok: true }), { demoState });

  const [accounts, setAccounts] = useState<BankAccount[]>(BANK_ACCOUNTS);
  const [schedule, setSchedule] = useState<PayoutSchedule>(PAYOUT_SCHEDULE);
  const [notifications, setNotifications] = useState(
    NOTIFICATION_SETTINGS.map((n) => ({ id: n.id, enabled: n.enabled }))
  );
  const [reAuth, setReAuth] = useState<BankAccount | null>(null);
  const [password, setPassword] = useState("");
  const [reAuthError, setReAuthError] = useState(false);

  const notify = (id: PaymentNotificationSetting) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)));

  const isEnabled = (id: PaymentNotificationSetting) => notifications.find((n) => n.id === id)?.enabled ?? false;

  const makePrimary = (acc: BankAccount) => {
    setAccounts((prev) => prev.map((a) => ({ ...a, isPrimary: a.id === acc.id })));
    toast.success({
      title: "Payout account updated",
      description: `${acc.bankName} ${acc.maskedNumber} is now your primary payout account.`,
    });
  };

  const handleReAuth = () => {
    if (!reAuth) return;
    if (password.trim().length < 4) {
      setReAuthError(true);
      return;
    }
    makePrimary(reAuth);
    setReAuth(null);
    setPassword("");
    setReAuthError(false);
  };

  const scheduleLabel = (m: PayoutSchedule["mode"]) =>
    m === "weekly" ? "Every Friday" : m === "monthly" ? "1st of every month" : "You request payouts manually";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Settings"
        subtitle="Manage payout accounts, schedule and financial notifications."
        badge={<MockDataTag />}
      />

      <SecureNote text={`Last financial activity: ${WALLET.lastActivity}`} />

      {state === "loading" && <TableSkeleton rows={4} cols={2} />}
      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "ready" && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Payout account */}
            <Panel title="Payout Account" subtitle="Where your withdrawals are sent">
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={
                      "flex items-center gap-3 rounded-xl border p-4 transition-all " +
                      (acc.isPrimary
                        ? "border-pink-500/30 bg-pink-500/[0.05] dark:border-ai-accent/30 dark:bg-ai-accent-soft"
                        : "border-border bg-card-hover")
                    }
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">{acc.bankName}</p>
                        {acc.isPrimary && (
                          <StatusBadge label="Primary" tone="violet" />
                        )}
                        <StatusBadge label={acc.verified ? "Verified" : "Pending"} tone={acc.verified ? "emerald" : "amber"} dot />
                      </div>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {acc.maskedNumber} · {acc.holderName} · IFSC {acc.ifsc}
                      </p>
                    </div>
                    {!acc.isPrimary && (
                      <button
                        type="button"
                        onClick={() => setReAuth(acc)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
                      >
                        Make primary
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => toast.info({ title: "Add bank account", description: "This flow is coming next." })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
                >
                  <Plus className="h-4 w-4" />
                  Add bank account
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="h-4 w-4 text-emerald-500" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-text-primary">Connected UPI</p>
                    <p className="mt-0.5 text-xs text-text-secondary">{UPI_ID}</p>
                  </div>
                  <StatusBadge label="Active" tone="emerald" dot />
                </div>
              </div>
            </Panel>

            {/* Schedule */}
            <Panel title="Payout Schedule" subtitle="How often you receive payouts">
              <SegmentedControl value={schedule.mode} onChange={(m) => setSchedule({ ...schedule, mode: m })} options={SCHEDULE_OPTIONS} size="md" />
              <p className="mt-3 text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">{scheduleLabel(schedule.mode)}</span>
                {schedule.mode !== "manual" && ". Payouts are batched and sent on this cadence."}
              </p>
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.02] p-4">
                <CalendarClock className="h-4 w-4 text-pink-500 dark:text-ai-accent" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-text-primary">Minimum withdrawal</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    The platform minimum for a single withdrawal is{" "}
                    <span className="font-bold text-text-primary">₹{WITHDRAWAL_MIN.toLocaleString("en-IN")}</span>.
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          {/* Payment notifications */}
          <Panel title="Payment Notifications" subtitle="Choose which financial events notify you">
            <div className="divide-y divide-border/60">
              {NOTIFICATION_SETTINGS.map((n) => (
                <SettingsRow key={n.id} label={n.label} description={n.description}>
                  <Toggle checked={isEnabled(n.id)} onChange={() => notify(n.id)} />
                </SettingsRow>
              ))}
            </div>
          </Panel>

          {/* Audit activity */}
          <Panel title="Audit Activity" subtitle="Recent security-sensitive financial actions">
            <div className="relative ml-3 space-y-5 border-l border-border pl-5">
              {AUDIT_LOG.map((event) => {
                const Icon = AUDIT_ICON[event.kind];
                return (
                  <motion.div key={event.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                    <span className="absolute -left-[9px] mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card">
                      <span className="h-1.5 w-1.5 rounded-full bg-pink-500 dark:bg-ai-accent" />
                    </span>
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-3.5 w-3.5 text-text-muted" />
                      <p className="text-sm font-medium text-text-primary">{event.label}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">{event.detail}</p>
                    <p className="mt-0.5 text-[10px] text-text-muted">{event.time}</p>
                  </motion.div>
                );
              })}
            </div>
          </Panel>
        </>
      )}

      {/* Re-authentication for changing payout account */}
      <AnimatePresence>
        {reAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setReAuth(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-text-primary">Confirm to continue</p>
                    <p className="mt-0.5 text-xs text-text-secondary">Re-authenticate to change payout account.</p>
                  </div>
                </div>
                <IconButton label="Close" onClick={() => setReAuth(null)}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-white/[0.02] p-3">
                <p className="text-xs text-text-secondary">Making primary:</p>
                <p className="mt-0.5 text-sm font-semibold text-text-primary">
                  {reAuth.bankName} {reAuth.maskedNumber}
                </p>
              </div>
              <label className="mb-1.5 mt-4 block text-xs font-medium text-text-secondary">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setReAuthError(false);
                }}
                placeholder="Enter your account password"
                className={
                  "w-full rounded-xl border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:shadow-[0_0_0_3px_var(--input-focus-ring)] " +
                  (reAuthError ? "border-rose-500" : "border-input-border focus:border-accent")
                }
              />
              {reAuthError && <p className="mt-1.5 text-xs font-medium text-rose-500">Please enter your password.</p>}
              <div className="mt-5 flex items-center justify-end gap-3">
                <BillButton variant="ghost" onClick={() => setReAuth(null)}>
                  Cancel
                </BillButton>
                <BillButton onClick={handleReAuth}>Confirm</BillButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}