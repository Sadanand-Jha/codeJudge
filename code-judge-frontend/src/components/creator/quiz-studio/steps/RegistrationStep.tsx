"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { isSecureSaveCancelledError } from "@/lib/quizCrypto";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ClipboardList,
  Eye,
  GripVertical,
  Plus,
  Rocket,
  Trash2,
} from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { useStudio, isQuestionValidationError } from "../StudioProvider";
import {
  REGISTRATION_FIELD_NAME_MAX,
  type RegistrationFieldConfig,
} from "../types";
import { StudioStepHeader, StudioStepLayout } from "../primitives";

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const inputCls =
  "w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] outline-none transition-colors focus:border-[var(--qs-brand)]";

export function RegistrationStep({ embedded = false }: { embedded?: boolean } = {}) {
  const { state, setState, saveToServer } = useStudio();
  const reg = state.registration;
  const fields = reg.fields;
  // The exact list the student form renders (named, non-blank fields only).
  const namedFields = fields.map((f) => f.name.trim()).filter(Boolean);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveToServer({ secure: true });
      toast.success({ title: "Saved", description: "Your quiz has been saved." });
    } catch (err) {
      if (isSecureSaveCancelledError(err)) {
        toast.info({
          title: "Encrypted save cancelled",
          description: "The encryption passphrase was not confirmed, so the encrypted copy was not updated.",
        });
      } else if (!isQuestionValidationError(err)) {
        toast.error({ title: "Could not save", description: err instanceof Error ? err.message : "Something went wrong." });
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── mutations ─────────────────────────────────────────── */

  const mutateFields = (fn: (prev: RegistrationFieldConfig[]) => RegistrationFieldConfig[]) =>
    setState((s) => ({ ...s, registration: { ...s.registration, fields: fn(s.registration.fields) } }));

  const updateSettings = (patch: Partial<typeof reg.settings>) =>
    setState((s) => ({
      ...s,
      registration: { ...s.registration, settings: { ...s.registration.settings, ...patch } },
    }));

  const addField = () => {
    const field: RegistrationFieldConfig = { id: uid("rfld"), name: "" };
    mutateFields((prev) => [...prev, field]);
    setExpandedId(field.id);
  };

  const removeField = (id: string) => {
    mutateFields((prev) => prev.filter((f) => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateField = (id: string, patch: Partial<RegistrationFieldConfig>) =>
    mutateFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const moveField = (id: string, dir: -1 | 1) => {
    mutateFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };

  const reorderDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    mutateFields((prev) => {
      const from = prev.findIndex((f) => f.id === draggingId);
      const to = prev.findIndex((f) => f.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggingId(null);
  };

  /* ── render ────────────────────────────────────────────── */

  return (
    <StudioStepLayout width="wide" embedded={embedded}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <StudioStepHeader title="Registration Settings" />
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1fr_360px] xl:items-stretch">
        {/* ── Left column ── */}
        <div className="space-y-5">
          {/* Form requirement */}
          <section className="rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
            <label className="flex cursor-pointer items-start gap-3 px-5 py-4">
              <input
                type="checkbox"
                checked={reg.settings.collectAdditionalInfo}
                onChange={(e) => updateSettings({ collectAdditionalInfo: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--qs-brand)]"
              />
              <span>
                <span className="block text-sm font-bold text-[var(--qs-ink)]">
                  Participants must fill a registration form
                </span>
                <span className="mt-0.5 block text-xs font-medium text-[var(--qs-muted)]">
                  When checked, students provide the academic details you select
                  below. Otherwise they register with just their platform account.
                </span>
              </span>
            </label>
          </section>

          {/* Registration Fields */}
          <section
            className={cn(
              "rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] transition-opacity duration-150",
              !reg.settings.collectAdditionalInfo && "pointer-events-none opacity-50"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--qs-line)] px-5 py-3.5">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--qs-ink)]">Registration Fields</h3>
                <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                  {fields.length} field{fields.length !== 1 ? "s" : ""} configured · drag to reorder
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)] disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving ? <SecureLogo variant="mark" size={14} className="animate-pulse motion-reduce:animate-none" /> : null}
                  Save
                </button>
                <button
                  type="button"
                  onClick={addField}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Registration Field
                </button>
              </div>
            </div>

            {/* Field list */}
            <div className="px-5 py-4">
              {fields.length === 0 ? (
                <div className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-4 py-10 text-center">
                  <p className="text-sm font-bold text-[var(--qs-ink)]">No registration fields yet</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                    Type any field name you want — for example Roll Number,
                    Branch or Team Name.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {fields.map((field, idx) => {
                    const expanded = expandedId === field.id;
                    return (
                      <li
                        key={field.id}
                        draggable
                        onDragStart={() => setDraggingId(field.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onDragOver={(e) => {
                          if (draggingId && draggingId !== field.id) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          reorderDrop(field.id);
                        }}
                        className={cn(
                          "rounded-[14px] border-2 transition-colors duration-150",
                          expanded
                            ? "border-[var(--qs-ink)] bg-[var(--qs-poly-1)]"
                            : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                        )}
                      >
                        {/* Row */}
                        <div className="flex items-center gap-2.5 px-3 py-2.5">
                          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--qs-muted)]" />
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : field.id)}
                            className="min-w-0 flex-1 text-left"
                            aria-expanded={expanded}
                          >
                            <span className="block truncate text-sm font-bold text-[var(--qs-ink)]">
                              {field.name.trim() || "Untitled field"}
                            </span>
                            <span className="text-[11px] font-medium text-[var(--qs-muted)]">Text input</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <IconBtn title="Move up" disabled={idx === 0} onClick={() => moveField(field.id, -1)}>
                              <ArrowUp className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn
                              title="Move down"
                              disabled={idx === fields.length - 1}
                              onClick={() => moveField(field.id, 1)}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn title="Remove field" danger onClick={() => removeField(field.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconBtn>
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : field.id)}
                              className="rounded-[8px] p-1 text-[var(--qs-muted)] transition-colors duration-150 hover:bg-[var(--qs-poly-2)] hover:text-[var(--qs-ink)]"
                              aria-label={expanded ? "Collapse configuration" : "Configure field"}
                            >
                              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                            </button>
                          </div>
                        </div>

                        {/* Configuration */}
                        {expanded && (
                          <div className="space-y-2 border-t-2 border-[var(--qs-line)] px-3.5 py-3.5">
                            <label className="block max-w-sm">
                              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                                Field name
                              </span>
                              <input
                                value={field.name}
                                maxLength={REGISTRATION_FIELD_NAME_MAX}
                                placeholder="e.g. Roll Number"
                                onChange={(e) =>
                                  updateField(field.id, {
                                    name: e.target.value.slice(0, REGISTRATION_FIELD_NAME_MAX),
                                  })
                                }
                                className={inputCls}
                              />
                            </label>
                            <p className="text-[10px] font-medium text-[var(--qs-muted)]">
                              Participants will see this label on the registration
                              form. Max {REGISTRATION_FIELD_NAME_MAX} characters.
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Advanced settings — commented out per request
          <section
            className={cn(
              "rounded-xl border border-border bg-card transition-opacity duration-150",
              !reg.settings.collectAdditionalInfo && "pointer-events-none opacity-50"
            )}
          >
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="text-sm font-semibold text-text-primary">Settings</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-text-secondary">
                  Registration deadline
                </span>
                <input
                  type="datetime-local"
                  value={reg.settings.deadline}
                  onChange={(e) => updateSettings({ deadline: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-text-secondary">
                  Maximum registrations (0 = unlimited)
                </span>
                <input
                  type="number"
                  value={reg.settings.maxRegistrations || ""}
                  onChange={(e) => updateSettings({ maxRegistrations: Number(e.target.value) })}
                  className={inputCls}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[10px] font-medium text-text-secondary">
                  Confirmation message
                </span>
                <textarea
                  rows={2}
                  value={reg.settings.confirmationMessage}
                  onChange={(e) => updateSettings({ confirmationMessage: e.target.value })}
                  className={inputCls}
                />
              </label>
            </div>
            <div className="border-t border-border px-5 py-3">
              <p className="mb-1 text-[10px] font-medium text-text-muted">Coming soon</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Allow editing after submission",
                  "Save incomplete registration",
                  "Require OTP verification",
                  "Multiple registrations",
                ].map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-md border border-border bg-card-hover/50 px-2 py-1 text-[10px] font-medium text-text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </section>
          */}
        </div>

        {/* ── Live Preview ── */}
        <aside data-sidebar="true" className="h-full xl:sticky xl:top-4">
          <section className="flex h-full flex-col overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
            <div className="flex shrink-0 items-center justify-between border-b-2 border-[var(--qs-line)] px-4 py-3">
              <h3 className="text-sm font-extrabold text-[var(--qs-ink)]">Live Preview</h3>
              <Eye className="h-4 w-4 text-[var(--qs-muted)]" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 max-h-[70vh] xl:max-h-none">
              {/* Mirrors the real student registration gate (ExamModeShell)
                  pixel-for-pixel so the creator sees exactly what is shown. */}
              <div className="text-center">
                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--qs-brand)]">
                  Registration required
                </p>
                <h4 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--qs-ink)]">
                  Fill your details to begin
                </h4>
                <p className="mt-1 truncate text-xs font-bold text-[var(--qs-muted)]">
                  {state.info.title || "Untitled Quiz"}
                </p>
                <p className="mt-1.5 text-xs font-medium text-[var(--qs-muted)]">
                  Your timer starts only after you submit this form.
                </p>
              </div>

              {namedFields.length > 0 ? (
                <div className="mt-5 space-y-3.5">
                  {namedFields.map((name) => (
                    <label key={name} className="block">
                      <span className="mb-1 block text-[11px] font-bold text-[var(--qs-muted)]">
                        {name} <span className="text-[var(--qs-bad)]">*</span>
                      </span>
                      <input
                        type="text"
                        readOnly
                        maxLength={500}
                        autoComplete="off"
                        placeholder={`Enter ${name.toLowerCase()}`}
                        className="h-12 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)]"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-[12px] border-2 border-dashed border-[var(--qs-line)] px-3 py-3 text-center text-xs font-medium text-[var(--qs-muted)]">
                  No fields configured — students enter the exam directly, without
                  a registration form.
                </p>
              )}
            </div>
            {namedFields.length > 0 ? (
              <div className="shrink-0 border-t-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5 xl:px-5">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 text-sm font-bold text-[var(--qs-ink)] sm:h-12 sm:w-auto sm:flex-1">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </span>
                  <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-5 text-sm font-extrabold text-[#1a1240] sm:h-12 sm:w-auto sm:flex-[1.4]">
                    <Rocket className="h-4 w-4" /> Start Exam
                  </span>
                </div>
                <p className="mt-2 text-center text-[11px] font-medium text-[var(--qs-muted)]">
                  All fields are required to start.
                </p>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </StudioStepLayout>
  );
}

function IconBtn({
  children,
  title,
  danger,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-[8px] p-1 text-[var(--qs-muted)] transition-colors duration-150 hover:bg-[var(--qs-poly-2)]",
        danger ? "hover:text-[var(--qs-bad)]" : "hover:text-[var(--qs-ink)]",
        disabled && "pointer-events-none opacity-30"
      )}
    >
      {children}
    </button>
  );
}
