"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ClipboardList,
  Eye,
  GripVertical,
  Loader2,
  Plus,
  Rocket,
  Trash2,
} from "lucide-react";
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
  "w-full rounded-md border border-input-border bg-input-bg px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60";

export function RegistrationStep() {
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
      await saveToServer();
      toast.success({ title: "Saved", description: "Your quiz has been saved." });
    } catch (err) {
      if (!isQuestionValidationError(err)) {
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
    <StudioStepLayout width="wide">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <StudioStepHeader title="Registration Settings" />
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1fr_360px]">
        {/* ── Left column ── */}
        <div className="space-y-5">
          {/* Form requirement */}
          <section className="rounded-xl border border-border bg-card">
            <label className="flex cursor-pointer items-start gap-3 px-5 py-4">
              <input
                type="checkbox"
                checked={reg.settings.collectAdditionalInfo}
                onChange={(e) => updateSettings({ collectAdditionalInfo: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-pink-500"
              />
              <span>
                <span className="block text-sm font-medium text-text-primary">
                  Participants must fill a registration form
                </span>
                <span className="mt-0.5 block text-xs text-text-secondary">
                  When checked, students provide the academic details you select
                  below. Otherwise they register with just their platform account.
                </span>
              </span>
            </label>
          </section>

          {/* Registration Fields */}
          <section
            className={cn(
              "rounded-xl border border-border bg-card transition-opacity duration-150",
              !reg.settings.collectAdditionalInfo && "pointer-events-none opacity-50"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Registration Fields</h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {fields.length} field{fields.length !== 1 ? "s" : ""} configured · drag to reorder
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors duration-150 hover:bg-card-hover disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save
                </button>
                <button
                  type="button"
                  onClick={addField}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/40 bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-900 transition-colors duration-150 hover:bg-pink-100 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Registration Field
                </button>
              </div>
            </div>

            {/* Field list */}
            <div className="px-5 py-4">
              {fields.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                  <p className="text-sm font-medium text-text-primary">No registration fields yet</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-text-secondary">
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
                          "rounded-lg border transition-colors duration-150",
                          expanded
                            ? "border-pink-500/40 bg-pink-500/[0.04] dark:border-pink-400/50 dark:bg-pink-500/[0.07]"
                            : "border-border bg-background hover:border-border-hover"
                        )}
                      >
                        {/* Row */}
                        <div className="flex items-center gap-2.5 px-3 py-2.5">
                          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-muted" />
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : field.id)}
                            className="min-w-0 flex-1 text-left"
                            aria-expanded={expanded}
                          >
                            <span className="block truncate text-sm font-medium text-text-primary">
                              {field.name.trim() || "Untitled field"}
                            </span>
                            <span className="text-[11px] text-text-muted">Text input</span>
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
                              className="rounded p-1 text-text-muted transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
                              aria-label={expanded ? "Collapse configuration" : "Configure field"}
                            >
                              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                            </button>
                          </div>
                        </div>

                        {/* Configuration */}
                        {expanded && (
                          <div className="space-y-2 border-t border-border px-3.5 py-3.5">
                            <label className="block max-w-sm">
                              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
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
                            <p className="text-[10px] text-text-muted">
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
        <aside data-sidebar="true" className="xl:sticky xl:top-4 xl:self-start">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">Live Preview</h3>
              <Eye className="h-4 w-4 text-text-muted" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {/* Mirrors the real student registration gate (ExamModeShell)
                  pixel-for-pixel so the creator sees exactly what is shown. */}
              <div className="text-center">
                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-orange-400 to-amber-300 text-white shadow-[0_16px_34px_-16px_rgba(244,114,182,.9)] dark:from-violet-500 dark:via-indigo-500 dark:to-cyan-500">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-500 dark:text-violet-300">
                  Registration required
                </p>
                <h4 className="mt-1 text-xl font-black tracking-tight text-text-primary">
                  Fill your details to begin
                </h4>
                <p className="mt-1 truncate text-xs font-semibold text-text-muted">
                  {state.info.title || "Untitled Quiz"}
                </p>
                <p className="mt-1.5 text-xs text-text-secondary">
                  Your timer starts only after you submit this form.
                </p>
              </div>

              {namedFields.length > 0 ? (
                <div className="mt-5 space-y-3.5">
                  {namedFields.map((name) => (
                    <label key={name} className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-text-secondary">
                        {name} <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="text"
                        readOnly
                        maxLength={500}
                        autoComplete="off"
                        placeholder={`Enter ${name.toLowerCase()}`}
                        className="h-12 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted outline-none"
                      />
                    </label>
                  ))}

                  <div className="flex flex-col gap-2 pt-1.5 sm:flex-row">
                    <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border px-5 text-sm font-semibold text-text-primary sm:h-14 sm:w-auto sm:flex-1">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </span>
                    <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-5 text-sm font-bold text-white shadow-[0_12px_28px_-14px_rgba(244,114,182,.9)] dark:from-violet-500 dark:via-indigo-500 dark:to-cyan-500 sm:h-14 sm:w-auto sm:flex-[1.4]">
                      <Rocket className="h-4 w-4" /> Start Exam
                    </span>
                  </div>
                  <p className="text-center text-[11px] text-text-muted">
                    All fields are required to start.
                  </p>
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-text-muted">
                  No fields configured — students enter the exam directly, without
                  a registration form.
                </p>
              )}
            </div>
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
        "rounded p-1 text-text-muted transition-colors duration-150 hover:bg-card-hover",
        danger ? "hover:text-rose-500" : "hover:text-text-primary",
        disabled && "pointer-events-none opacity-30"
      )}
    >
      {children}
    </button>
  );
}
