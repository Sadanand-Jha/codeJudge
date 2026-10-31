"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "@/services/user";
import { getApiErrorMessage } from "@/lib/apiError";

export function EditProfileDialog({
  open,
  initialName,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSaved?: (name: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <EditProfileDialogContent
          key={initialName}
          initialName={initialName}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </AnimatePresence>
  );
}

function EditProfileDialogContent({
  initialName,
  onClose,
  onSaved,
}: {
  initialName: string;
  onClose: () => void;
  onSaved?: (name: string) => void;
}) {
  const toast = useToast();
  const authUser = useAuthStore((state) => state.user);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const save = async () => {
    const nextName = name.trim();
    if (!nextName) {
      setError("Enter your name before saving.");
      return;
    }
    if (nextName.length > 80) {
      setError("Keep your name within 80 characters.");
      return;
    }
    if (nextName === initialName.trim()) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");
    try {
      const result = await updateProfile({ displayName: nextName });
      const savedName = result.displayName ?? nextName;
      useAuthStore.getState().setUser({ displayName: savedName });
      toast.success({
        title: "Name updated",
        description: "Your creator profile now shows the new name.",
        timestamp: "Just now",
      });
      onSaved?.(savedName);
      onClose();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Could not update your name. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(26,18,64,0.55)] p-3 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
              <Pencil className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="edit-profile-title"
                className="text-lg font-extrabold tracking-tight text-[var(--qs-ink)]"
              >
                Edit profile
              </h2>
              <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                Change your name. Username and email stay fixed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="b b-icon sm"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="px-5 py-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                Name
              </span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                }}
                maxLength={80}
                autoFocus
                disabled={saving}
                placeholder="e.g. Aarav Verma"
                className="h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 text-sm font-semibold text-[var(--qs-ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <p className="mt-2 text-[11px] font-medium leading-5 text-[var(--qs-muted)]">
              This name appears on your creator profile, tests, quizzes and public pages.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                  <Lock className="h-3 w-3" /> Username
                </span>
                <input
                  value={authUser?.username ? `@${authUser.username}` : "—"}
                  readOnly
                  aria-readonly="true"
                  tabIndex={-1}
                  className="h-11 w-full cursor-not-allowed rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 text-sm font-semibold text-[var(--qs-muted)] outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                  <Lock className="h-3 w-3" /> Email
                </span>
                <input
                  value={authUser?.email || "—"}
                  readOnly
                  aria-readonly="true"
                  tabIndex={-1}
                  className="h-11 w-full cursor-not-allowed rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 text-sm font-semibold text-[var(--qs-muted)] outline-none"
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] font-medium leading-5 text-[var(--qs-muted)]">
              Username and email are fixed for your account and cannot be changed.
            </p>
            {error ? (
              <p className="mt-3 rounded-xl border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-3 py-2 text-[11px] font-bold text-[var(--qs-bad)]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
            <span className="text-[10px] font-semibold text-[var(--qs-muted)]">Maximum 80 characters</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="b sm">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="b b-pri sm gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
