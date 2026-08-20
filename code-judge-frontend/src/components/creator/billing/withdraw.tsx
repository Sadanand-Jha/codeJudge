"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Banknote, ShieldCheck, Building2, PartyPopper, ChevronLeft, Lock } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { formatINR } from "./ui";
import { BillButton, IconButton } from "./ui";
import { WALLET, WITHDRAWAL_FEE, WITHDRAWAL_FEE_EXCL_GST, WITHDRAWAL_GST, WITHDRAWAL_MIN, WITHDRAWAL_FEE_NOTE } from "./mockData";
import type { BankAccount } from "./types";

const QUICK_PCTS = [25, 50, 75, 100];

export function WithdrawDrawer({
  open,
  onClose,
  accounts,
  available = WALLET.available,
}: {
  open: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  available?: number;
}) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState<number | null>(null);
  const [amountDirty, setAmountDirty] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const primary = accounts.find((a) => a.isPrimary);

  const parsed = amount ?? 0;
  const overBalance = parsed > available;
  const belowMin = parsed < WITHDRAWAL_MIN;
  const netAmount = parsed - WITHDRAWAL_FEE;
  const valid = parsed > 0 && !overBalance && !belowMin;
  const canContinue = valid && (step !== 2 || !!selectedAccount);

  const close = () => {
    if (submitting) return;
    onClose();
    setTimeout(() => {
      setStep(1);
      setAmount(null);
      setAmountDirty(false);
      setSelectedAccount(null);
      setReference(null);
    }, 200);
  };

  const handleQuick = (pct: number) => {
    const value = Math.floor((available * pct) / 100);
    setAmount(value);
    setAmountDirty(true);
  };

  const handleConfirm = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const ref = `WDL_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      setReference(ref);
      setStep(4);
      toast.success({
        title: "Withdrawal requested",
        description: `${formatINR(parsed)} is being processed. Expected by ${WALLET.nextPayoutDate}.`,
      });
    }, 1200);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Withdraw money"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="text-[15px] font-bold text-text-primary">Withdraw Money</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
                  <Lock className="h-3 w-3" />
                  Secured by 256-bit encryption
                </p>
              </div>
              <IconButton label="Close" onClick={close}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>

            {/* Stepper */}
            {step < 4 && (
              <div className="flex items-center gap-2 px-6 pt-5">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex flex-1 items-center gap-2">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                        s < step
                          ? "bg-emerald-500 text-white"
                          : s === step
                            ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                            : "border border-border bg-card-hover text-text-muted"
                      )}
                    >
                      {s < step ? <Check className="h-3.5 w-3.5" /> : s}
                    </div>
                    {s < 3 && <div className={cn("h-px flex-1", s < step ? "bg-emerald-500" : "bg-border")} />}
                  </div>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <AnimatePresence mode="wait">
                {/* STEP 1 — Amount */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
                    <h3 className="text-base font-semibold text-text-primary">Withdrawal Amount</h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      Available balance: <span className="font-bold text-emerald-500">{formatINR(available)}</span>
                    </p>

                    <div className="mt-6">
                      <div className="flex h-16 items-center overflow-hidden rounded-xl border border-border bg-input-bg focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--input-focus-ring)]">
                        <span className="pl-4 text-xl font-bold text-text-secondary">₹</span>
                        <input
                          autoFocus
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={amountDirty && amount !== null ? amount : ""}
                          onChange={(e) => {
                            setAmount(e.target.value === "" ? null : Number(e.target.value));
                            setAmountDirty(true);
                          }}
                          className="h-full w-full bg-transparent px-3 text-2xl font-bold text-text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      {amountDirty && overBalance && (
                        <p className="mt-1.5 text-xs font-medium text-rose-500">Amount exceeds available balance.</p>
                      )}
                      {amountDirty && belowMin && !overBalance && (
                        <p className="mt-1.5 text-xs font-medium text-amber-500">Minimum withdrawal is {formatINR(WITHDRAWAL_MIN)}.</p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {QUICK_PCTS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleQuick(pct)}
                          className="flex-1 rounded-lg border border-border bg-card-hover px-2 py-1.5 text-[11px] font-bold text-text-secondary transition-all hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
                        >
                          {pct === 100 ? "MAX" : `${pct}%`}
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Withdrawal amount</span>
                        <span className="font-semibold text-text-primary tabular-nums">{formatINR(parsed)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Processing fee (excl. GST)</span>
                        <span className="font-semibold text-text-secondary tabular-nums">−{formatINR(WITHDRAWAL_FEE_EXCL_GST)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">GST (18%)</span>
                        <span className="tabular-nums text-text-muted">−{formatINR(WITHDRAWAL_GST)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                        <span className="font-semibold text-text-primary">Estimated payout</span>
                        <span className="font-bold text-text-primary tabular-nums">{formatINR(netAmount)}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-text-muted">{WITHDRAWAL_FEE_NOTE}</p>
                  </motion.div>
                )}

                {/* STEP 2 — Account */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
                    <h3 className="text-base font-semibold text-text-primary">Select Payout Account</h3>
                    <p className="mt-1 text-xs text-text-secondary">Withdrawing {formatINR(parsed)} to your bank account.</p>

                    <div className="mt-5 space-y-3">
                      {accounts.map((acc) => {
                        const selected = selectedAccount === acc.id || (selectedAccount === null && acc.isPrimary);
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSelectedAccount(acc.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                              selected
                                ? "border-pink-500/40 bg-pink-500/[0.06] dark:border-ai-accent/40 dark:bg-ai-accent-soft"
                                : "border-border bg-card-hover hover:border-border-hover"
                            )}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-text-primary">{acc.bankName}</p>
                                {acc.isPrimary && (
                                  <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-500">Primary</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-text-secondary">{acc.maskedNumber} · {acc.holderName}</p>
                            </div>
                            <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", selected ? "border-pink-500 bg-pink-500" : "border-border")}>
                              {selected && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="mt-4 flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-semibold text-pink-500 transition-colors hover:text-pink-600 dark:text-ai-accent"
                    >
                      <Banknote className="h-4 w-4" />
                      Add bank account
                    </button>
                  </motion.div>
                )}

                {/* STEP 3 — Confirm */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
                    <h3 className="text-base font-semibold text-text-primary">Confirm Withdrawal</h3>
                    <p className="mt-1 text-xs text-text-secondary">Review the details before confirming.</p>

                    <div className="mt-5 overflow-hidden rounded-xl border border-border">
                      {[
                        ["Withdrawal amount", formatINR(parsed)],
                        ["Processing fee", `−${formatINR(WITHDRAWAL_FEE)}`],
                        ["Net amount", formatINR(netAmount)],
                      ].map(([label, value], i) => (
                        <div key={label} className={cn("flex items-center justify-between px-4 py-3", i === 0 ? "bg-white/[0.03]" : "border-t border-border")}>
                          <span className="text-xs text-text-secondary">{label}</span>
                          <span className={cn("text-xs font-bold tabular-nums", i === 2 ? "text-emerald-500" : "text-text-primary")}>{value}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-border bg-white/[0.03] px-4 py-3">
                        <span className="text-xs text-text-secondary">Destination bank</span>
                        <span className="text-xs font-semibold text-text-primary">
                          {(accounts.find((a) => a.id === selectedAccount) ?? primary)?.bankName}{" "}
                          {(accounts.find((a) => a.id === selectedAccount) ?? primary)?.maskedNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <span className="text-xs text-text-secondary">Estimated arrival</span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          By {WALLET.nextPayoutDate}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* SUCCESS */}
                {step === 4 && (
                  <motion.div
                    key="s4"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center py-8 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/10"
                    >
                      <PartyPopper className="h-7 w-7 text-emerald-500" />
                    </motion.div>
                    <h3 className="mt-5 text-lg font-bold text-text-primary">Withdrawal requested</h3>
                    <p className="mt-1 text-sm font-bold text-text-primary tabular-nums">{formatINR(parsed)}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Expected by <span className="font-semibold text-text-primary">{WALLET.nextPayoutDate}</span>
                    </p>
                    <div className="mt-5 w-full rounded-xl border border-border bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Reference ID</span>
                        <span className="font-semibold text-text-primary tabular-nums">{reference}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Destination</span>
                        <span className="font-semibold text-text-primary">
                          {(accounts.find((a) => a.id === selectedAccount) ?? primary)?.bankName}{" "}
                          {(accounts.find((a) => a.id === selectedAccount) ?? primary)?.maskedNumber}
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] text-text-muted">You can track this withdrawal under Payouts.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step < 4 && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                ) : (
                  <span />
                )}
                {step === 1 && (
                  <BillButton disabled={!valid} onClick={() => setStep(2)}>
                    Continue
                  </BillButton>
                )}
                {step === 2 && (
                  <BillButton disabled={!canContinue} onClick={() => setStep(3)}>
                    Continue
                  </BillButton>
                )}
                {step === 3 && (
                  <BillButton loading={submitting} onClick={handleConfirm}>
                    {submitting ? "Processing..." : "Confirm Withdrawal"}
                  </BillButton>
                )}
              </div>
            )}
            {step === 4 && (
              <div className="border-t border-border px-6 py-4">
                <BillButton className="w-full" onClick={close}>
                  Done
                </BillButton>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
