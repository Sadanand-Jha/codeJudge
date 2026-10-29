"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import {
  createKdfParams,
  deriveKek,
  makeKekCheck,
  MIN_PASSPHRASE_LENGTH,
  verifyKekCheck,
  type KdfParams,
} from "@/lib/crypto";
import { saveKekConfig, type KekConfigResponse } from "@/services/quizCrypto";
import { getApiErrorMessage } from "@/lib/apiError";

interface KekGateDialogProps {
  open: boolean;
  mode: "setup" | "unlock" | null;
  config: KekConfigResponse | null;
  onComplete: (kek: CryptoKey, kdf: KdfParams) => void;
  onCancel: () => void;
}

export function KekGateDialog({
  open,
  mode,
  config,
  onComplete,
  onCancel,
}: KekGateDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setError(`Use at least ${MIN_PASSPHRASE_LENGTH} characters.`);
      return;
    }
    if (mode === "setup" && passphrase !== confirm) {
      setError("The passphrases do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "setup") {
        const params = createKdfParams();
        const kek = await deriveKek(passphrase, params);
        const check = await makeKekCheck(kek);
        await saveKekConfig({
          salt: params.salt,
          kdf: {
            algorithm: "PBKDF2-HMAC-SHA-256",
            iterations: params.iterations,
          },
          check,
        });
        onComplete(kek, params);
      } else {
        if (!config?.salt || !config.kdf || !config.check) {
          throw new Error("The encryption key setup is incomplete.");
        }
        const params: KdfParams = {
          salt: config.salt,
          iterations: config.kdf.iterations,
        };
        const kek = await deriveKek(passphrase, params);
        const valid = await verifyKekCheck(kek, config.check);
        if (!valid) {
          setError("Incorrect passphrase. Try again.");
          return;
        }
        onComplete(kek, params);
      }
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          mode === "setup"
            ? "Could not set up the quiz encryption key."
            : "Could not unlock the quiz encryption key."
        )
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && mode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-[#1A1240]/70 p-3 backdrop-blur-[3px] sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kek-gate-title"
          onClick={() => {
            if (!busy) onCancel();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-md overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink,#111827)] bg-[var(--qs-surface,#ffffff)] shadow-[7px_7px_0_var(--qs-sun,#facc15)]"
          >
            <div className="border-b-2 border-[var(--qs-line,#e5e7eb)] px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border-2 border-[var(--qs-ink,#111827)] bg-[var(--qs-brand,#4f46e5)] text-white shadow-[2px_2px_0_var(--qs-sun,#facc15)]">
                  {mode === "setup" ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <h2
                    id="kek-gate-title"
                    className="text-base font-black tracking-tight text-[var(--qs-ink,#111827)]"
                  >
                    {mode === "setup"
                      ? "Set your quiz passphrase"
                      : "Unlock encrypted quizzes"}
                  </h2>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted,#475569)]">
                    {mode === "setup"
                      ? "This passphrase protects quiz questions only. It stays in this browser and is never sent to the server. Use it again on any device to edit your encrypted quizzes."
                      : "Enter the passphrase you created for encrypted quizzes. It is verified in this browser and is never uploaded."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-5 py-5">
              <label className="block">
                <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted,#475569)]">
                  Passphrase
                </span>
                <div className="flex items-center gap-2 rounded-[12px] border-2 border-[var(--qs-line,#e5e7eb)] bg-[var(--qs-bg,#f8fafc)] px-3 py-2">
                  <KeyRound className="h-4 w-4 shrink-0 text-[var(--qs-muted,#475569)]" />
                  <input
                    autoFocus
                    type={show ? "text" : "password"}
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submit();
                    }}
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                    placeholder="At least 10 characters"
                    autoComplete={
                      mode === "setup" ? "new-password" : "current-password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShow((value) => !value)}
                    className="shrink-0 text-[var(--qs-muted,#475569)]"
                    aria-label={show ? "Hide passphrase" : "Show passphrase"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {mode === "setup" && (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted,#475569)]">
                    Confirm passphrase
                  </span>
                  <div className="flex items-center gap-2 rounded-[12px] border-2 border-[var(--qs-line,#e5e7eb)] bg-[var(--qs-bg,#f8fafc)] px-3 py-2">
                    <KeyRound className="h-4 w-4 shrink-0 text-[var(--qs-muted,#475569)]" />
                    <input
                      type={show ? "text" : "password"}
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void submit();
                      }}
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      autoComplete="new-password"
                    />
                  </div>
                </label>
              )}

              {error && (
                <p className="rounded-[10px] border-2 border-red-300 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                  {error}
                </p>
              )}

              {mode === "setup" && (
                <p className="text-[10px] font-medium leading-relaxed text-[var(--qs-muted,#475569)]">
                  If you forget this passphrase, existing encrypted quizzes cannot be recovered. There is no server-side reset.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t-2 border-[var(--qs-line,#e5e7eb)] px-5 py-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="rounded-[10px] px-3 py-2 text-xs font-bold text-[var(--qs-muted,#475569)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-[10px] border-2 border-[var(--qs-ink,#111827)] bg-[var(--qs-brand,#4f46e5)] px-4 py-2 text-xs font-black text-white shadow-[2px_2px_0_var(--qs-sun,#facc15)] disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {mode === "setup" ? "Set passphrase" : "Unlock"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
