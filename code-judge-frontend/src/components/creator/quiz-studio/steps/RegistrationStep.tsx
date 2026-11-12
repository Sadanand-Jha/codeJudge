"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  // Only surface the manual Save action once the creator actually edits
  // registration fields or settings.
  const [dirty, setDirty] = useState(false);
  // Mobile delete is a two-tap confirm (same 3s window as the design).
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current);
    },
    []
  );

  const requestRemoveField = (id: string) => {
    if (confirmDeleteId === id) {
      if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current);
      setConfirmDeleteId(null);
      removeField(id);
      return;
    }
    setConfirmDeleteId(id);
    if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current);
    confirmDeleteTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveToServer();
      setDirty(false);
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

  const mutateFields = (fn: (prev: RegistrationFieldConfig[]) => RegistrationFieldConfig[]) => {
    setDirty(true);
    setState((s) => ({ ...s, registration: { ...s.registration, fields: fn(s.registration.fields) } }));
  };

  const updateSettings = (patch: Partial<typeof reg.settings>) => {
    setDirty(true);
    setState((s) => ({
      ...s,
      registration: { ...s.registration, settings: { ...s.registration.settings, ...patch } },
    }));
  };

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
      {/* Mobile — mirrors the Registration settings mobile design */}
      <div className="qs-jakarta lg:hidden">
        <h1 className="mb-4 text-[24px] font-extrabold leading-[1.2] text-[var(--qs-ink)]">
          Registration Settings
        </h1>

        <button
          type="button"
          role="switch"
          aria-checked={reg.settings.collectAdditionalInfo}
          onClick={() => updateSettings({ collectAdditionalInfo: !reg.settings.collectAdditionalInfo })}
          className="flex w-full items-start gap-3.5 rounded-[20px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 text-left active:scale-[0.99]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-extrabold leading-[1.3] text-[var(--qs-ink)]">
              Participants must fill a registration form
            </span>
            <span className="mt-1.5 block text-[14px] font-semibold leading-[1.45] text-[var(--qs-muted)]">
              Students fill extra details below. Otherwise they register with their account.
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "relative mt-0.5 h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200",
              reg.settings.collectAdditionalInfo ? "bg-[var(--qs-brand)]" : "bg-[var(--qs-line)]"
            )}
          >
            <span
              className={cn(
                "absolute left-[3px] top-[3px] h-[26px] w-[26px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200",
                reg.settings.collectAdditionalInfo && "translate-x-5"
              )}
            />
          </span>
        </button>

        {reg.settings.collectAdditionalInfo && (
          <section className="mt-4 rounded-[24px] border border-[var(--qs-line)] border-b-4 border-b-[var(--qs-sun)] bg-[var(--qs-surface)] p-4 shadow-[0_8px_20px_rgba(27,24,64,0.10)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[18px] font-extrabold leading-[1.25] text-[var(--qs-ink)]">
                  Registration fields
                </h2>
                <p className="mt-0.5 text-[14px] font-semibold text-[var(--qs-muted)]">
                  {fields.length} field{fields.length === 1 ? "" : "s"} · tap to edit
                </p>
              </div>
              <button
                type="button"
                onClick={addField}
                className="flex h-12 shrink-0 items-center gap-1.5 rounded-[14px] bg-[var(--qs-brand)] px-4 text-[15px] font-extrabold text-[var(--qs-on-brand)] shadow-[0_3px_0_#4a22b8] transition active:translate-y-0.5 active:shadow-[0_1px_0_#4a22b8]"
              >
                <Plus className="h-5 w-5" /> Add
              </button>
            </div>

            {fields.length === 0 ? (
              <p className="py-6 text-center text-[14px] font-semibold text-[var(--qs-muted)]">
                No fields yet. Tap Add to create one.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2.5">
                {fields.map((field, idx) => {
                  const expanded = expandedId === field.id;
                  return (
                    <li
                      key={field.id}
                      className={cn(
                        "overflow-hidden rounded-[18px] border bg-[var(--qs-surface)]",
                        expanded
                          ? "border-[var(--qs-brand)] shadow-[0_0_0_3px_rgba(106,60,240,0.12)]"
                          : "border-[var(--qs-line)]"
                      )}
                    >
                      <div className="flex min-h-16 items-center pr-1">
                        <span
                          aria-hidden="true"
                          className="grid h-11 w-9 shrink-0 place-items-center text-[var(--qs-muted)]"
                        >
                          <GripVertical className="h-[18px] w-[18px]" />
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : field.id)}
                          aria-expanded={expanded}
                          className="min-w-0 flex-1 py-2.5 pr-1 text-left"
                        >
                          <strong className="block break-words text-[16px] font-extrabold leading-[1.25] text-[var(--qs-ink)]">
                            {field.name.trim() || "Untitled field"}
                          </strong>
                          <span className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-[var(--qs-muted)]">
                            <span>Text input</span>
                            <span className="rounded-[8px] bg-[var(--qs-poly-1)] px-2 py-0.5 text-[12px] font-extrabold text-[var(--qs-brand)]">
                              Required
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : field.id)}
                          aria-label={expanded ? "Collapse configuration" : "Configure field"}
                          className="grid h-11 w-11 shrink-0 place-items-center text-[var(--qs-muted)]"
                        >
                          <ChevronDown
                            className={cn(
                              "h-5 w-5 transition-transform duration-200",
                              expanded && "rotate-180 text-[var(--qs-brand)]"
                            )}
                          />
                        </button>
                      </div>

                      {expanded && (
                        <div className="border-t border-[var(--qs-line)] px-3.5 pb-4">
                          <label className="mt-3.5 block">
                            <span className="mb-1.5 block text-[13px] font-extrabold tracking-[0.02em] text-[var(--qs-muted)]">
                              FIELD NAME
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
                              className="h-[50px] w-full rounded-[14px] border border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 text-[16px] font-semibold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)] focus:shadow-[0_0_0_3px_rgba(106,60,240,0.2)]"
                            />
                          </label>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => moveField(field.id, -1)}
                              disabled={idx === 0}
                              className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] border border-[var(--qs-line)] text-[12px] font-bold text-[var(--qs-ink)] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <ArrowUp className="h-5 w-5" /> Move up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveField(field.id, 1)}
                              disabled={idx === fields.length - 1}
                              className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] border border-[var(--qs-line)] text-[12px] font-bold text-[var(--qs-ink)] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <ArrowDown className="h-5 w-5" /> Move down
                            </button>
                            <button
                              type="button"
                              onClick={() => requestRemoveField(field.id)}
                              className={cn(
                                "flex h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] border text-[12px] font-bold transition-colors",
                                confirmDeleteId === field.id
                                  ? "border-[var(--qs-bad)] bg-[var(--qs-bad)] text-white"
                                  : "border-[var(--qs-line)] text-[var(--qs-bad)]"
                              )}
                            >
                              <Trash2 className="h-5 w-5" />
                              {confirmDeleteId === field.id ? "Confirm?" : "Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      <div className="hidden space-y-4 lg:block">
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
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3 sm:px-5 sm:py-4">
              <input
                type="checkbox"
                checked={reg.settings.collectAdditionalInfo}
                onChange={(e) => updateSettings({ collectAdditionalInfo: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0 rounded accent-[var(--qs-brand)]"
              />
              <span>
                <span className="block text-sm font-bold text-[var(--qs-ink)]">
                  Participants must fill a registration form
                </span>
                <span className="mt-0.5 block text-xs font-medium text-[var(--qs-muted)] sm:hidden">
                  Students fill extra details below; otherwise they register with their account.
                </span>
                <span className="mt-0.5 hidden text-xs font-medium text-[var(--qs-muted)] sm:block">
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
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                {dirty ? (
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)] disabled:pointer-events-none disabled:opacity-50 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
                  >
                    {saving ? <SecureLogo variant="mark" size={14} className="animate-pulse motion-reduce:animate-none" /> : null}
                    Save
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={addField}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Add Field
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
                              <ArrowUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </IconBtn>
                            <IconBtn
                              title="Move down"
                              disabled={idx === fields.length - 1}
                              onClick={() => moveField(field.id, 1)}
                            >
                              <ArrowDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </IconBtn>
                            <IconBtn title="Remove field" danger onClick={() => removeField(field.id)}>
                              <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </IconBtn>
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : field.id)}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors duration-150 hover:bg-[var(--qs-poly-2)] hover:text-[var(--qs-ink)] sm:h-auto sm:w-auto sm:p-1"
                              aria-label={expanded ? "Collapse configuration" : "Configure field"}
                            >
                              <ChevronDown className={cn("h-4 w-4 transition-transform sm:h-3.5 sm:w-3.5", expanded && "rotate-180")} />
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

        {/* ── Live Preview (desktop only; hidden on mobile/tablet) ── */}
        <aside data-sidebar="true" className="hidden h-full xl:sticky xl:top-4 xl:block">
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
        "grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors duration-150 hover:bg-[var(--qs-poly-2)] sm:h-auto sm:w-auto sm:p-1",
        danger ? "hover:text-[var(--qs-bad)]" : "hover:text-[var(--qs-ink)]",
        disabled && "pointer-events-none opacity-30"
      )}
    >
      {children}
    </button>
  );
}
