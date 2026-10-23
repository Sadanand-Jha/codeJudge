"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import AudienceModal from "@/components/quiz/creator/settings/audience/AudienceModal";
import {
  getRoomRegistrationForm,
  updateRoomRegistrationForm,
} from "@/services/rooms";
import type {
  RoomRegistrationField,
  RoomRegistrationFieldType,
  RoomRegistrationForm,
} from "@/types/room";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import {
  ROOM_REGISTRATION_FIELD_TYPES,
  ROOM_REGISTRATION_LIMITS,
  emptyRegistrationForm,
  newRegistrationField,
  parseRegistrationOptions,
  validateRegistrationFormConfig,
} from "@/utils/roomRegistration";

interface RoomRegistrationFormEditorProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  onSaved?: (form: RoomRegistrationForm) => void;
}

const inputCls =
  "w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

export default function RoomRegistrationFormEditor({
  open,
  onClose,
  roomId,
  roomName,
  onSaved,
}: RoomRegistrationFormEditorProps) {
  const [form, setForm] = useState<RoomRegistrationForm>(() => emptyRegistrationForm());
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) {
        setLoading(true);
        setErrors([]);
      }
    });

    getRoomRegistrationForm(roomId)
      .then((loaded) => {
        if (disposed) return;
        const next = loaded.fields.length > 0 ? loaded : emptyRegistrationForm();
        setForm(next);
        setOptionDrafts(
          Object.fromEntries(next.fields.map((field) => [field.id, field.options.join(", ")]))
        );
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setForm(emptyRegistrationForm());
        setOptionDrafts({});
        setErrors([getApiErrorMessage(error, "Could not load the registration form.")]);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [open, roomId]);

  function updateField(id: string, patch: Partial<RoomRegistrationField>) {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
    setErrors([]);
  }

  function updateType(id: string, type: RoomRegistrationFieldType) {
    updateField(id, {
      type,
      options: type === "select" ? parseRegistrationOptions(optionDrafts[id] ?? "") : [],
    });
  }

  function addField() {
    if (form.fields.length >= ROOM_REGISTRATION_LIMITS.maxFields) {
      toast.error({
        title: "Field limit reached",
        description: `A form can have at most ${ROOM_REGISTRATION_LIMITS.maxFields} fields.`,
      });
      return;
    }
    const field = newRegistrationField(form.fields.length);
    setForm((current) => ({ ...current, fields: [...current.fields, field] }));
    setOptionDrafts((current) => ({ ...current, [field.id]: "" }));
    setErrors([]);
  }

  function removeField(id: string) {
    setForm((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== id),
    }));
    setOptionDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setErrors([]);
  }

  function moveField(id: string, direction: -1 | 1) {
    setForm((current) => {
      const index = current.fields.findIndex((field) => field.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.fields.length) return current;
      const fields = [...current.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...current, fields };
    });
  }

  async function handleSave() {
    const normalized: RoomRegistrationForm = {
      title: form.title.trim() || emptyRegistrationForm().title,
      description: form.description.trim(),
      fields: form.fields.map((field) => ({
        ...field,
        label: field.label.trim(),
        options:
          field.type === "select"
            ? parseRegistrationOptions(optionDrafts[field.id] ?? field.options.join(", "))
            : [],
      })),
    };

    const configErrors = validateRegistrationFormConfig(normalized);
    setErrors(configErrors);
    if (configErrors.length > 0) return;

    setSaving(true);
    try {
      const saved = await updateRoomRegistrationForm(roomId, normalized);
      onSaved?.(saved);
      toast.success({
        title: "Registration form saved",
        description:
          saved.fields.length === 0
            ? "Students will join with code and password only."
            : `${saved.fields.length} field${saved.fields.length !== 1 ? "s" : ""} will appear before joining.`,
      });
      onClose();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not save the registration form.");
      setErrors([message]);
      toast.error({ title: "Could not save form", description: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AudienceModal
      open={open}
      onClose={onClose}
      title="Registration form"
      subtitle={`Choose what students fill before joining ${roomName}.`}
      icon={<ClipboardList className="h-5 w-5" />}
      size="xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-[11px] font-semibold text-[var(--qs-muted)] sm:block">
            Leave the form empty to let students join with code and password only.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save form"}
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--qs-brand)]" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <label htmlFor="registration-title" className="block text-xs font-extrabold text-[var(--qs-ink)]">
              Form title
            </label>
            <input
              id="registration-title"
              value={form.title}
              maxLength={ROOM_REGISTRATION_LIMITS.maxTitle}
              onChange={(event) => {
                setForm((current) => ({ ...current, title: event.target.value }));
                setErrors([]);
              }}
              placeholder="Student registration"
              className={cn(inputCls, "mt-1.5")}
            />

            <label htmlFor="registration-description" className="mt-4 block text-xs font-extrabold text-[var(--qs-ink)]">
              Description <span className="font-medium text-[var(--qs-muted)]">(optional)</span>
            </label>
            <textarea
              id="registration-description"
              value={form.description}
              maxLength={ROOM_REGISTRATION_LIMITS.maxDescription}
              onChange={(event) => {
                setForm((current) => ({ ...current, description: event.target.value }));
                setErrors([]);
              }}
              rows={2}
              placeholder="A few details before you join the class."
              className={cn(inputCls, "mt-1.5 resize-none")}
            />

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-[var(--qs-ink)]">Fields</p>
                <p className="text-[11px] font-medium text-[var(--qs-muted)]">
                  {form.fields.length} of {ROOM_REGISTRATION_LIMITS.maxFields}
                </p>
              </div>
              <button
                type="button"
                onClick={addField}
                disabled={form.fields.length >= ROOM_REGISTRATION_LIMITS.maxFields}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 text-xs font-extrabold text-[var(--qs-ink)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add field
              </button>
            </div>

            {form.fields.length === 0 ? (
              <div className="mt-3 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-8 text-center">
                <ClipboardList className="mx-auto h-6 w-6 text-[var(--qs-muted)]" />
                <p className="mt-2 text-xs font-bold text-[var(--qs-ink)]">No registration fields</p>
                <p className="mt-1 text-[11px] font-medium text-[var(--qs-muted)]">
                  Students join immediately after entering the room password.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {form.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-[10px] font-extrabold text-[var(--qs-bg)]">
                        {index + 1}
                      </span>
                      <input
                        value={field.label}
                        maxLength={ROOM_REGISTRATION_LIMITS.maxLabel}
                        onChange={(event) => updateField(field.id, { label: event.target.value })}
                        placeholder="Field label, e.g. Roll Number"
                        aria-label={`Field ${index + 1} label`}
                        className={cn(inputCls, "h-9 py-1.5 text-xs font-bold")}
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveField(field.id, -1)}
                          disabled={index === 0}
                          aria-label="Move field up"
                          className="grid h-8 w-8 place-items-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)] disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(field.id, 1)}
                          disabled={index === form.fields.length - 1}
                          aria-label="Move field down"
                          className="grid h-8 w-8 place-items-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)] disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          aria-label="Remove field"
                          className="grid h-8 w-8 place-items-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-bad)] transition-colors hover:border-[var(--qs-bad)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2.5 sm:grid-cols-[1fr_auto]">
                      <select
                        value={field.type}
                        onChange={(event) =>
                          updateType(field.id, event.target.value as RoomRegistrationFieldType)
                        }
                        aria-label={`Field ${index + 1} type`}
                        className={cn(inputCls, "h-9 py-1.5 text-xs font-bold")}
                      >
                        {ROOM_REGISTRATION_FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-bold text-[var(--qs-ink)]">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) => updateField(field.id, { required: event.target.checked })}
                          className="h-3.5 w-3.5 accent-[var(--qs-brand)]"
                        />
                        Required
                      </label>
                    </div>

                    {field.type === "select" ? (
                      <div className="mt-2.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                          Options (comma separated)
                        </label>
                        <input
                          value={optionDrafts[field.id] ?? field.options.join(", ")}
                          onChange={(event) => {
                            const value = event.target.value;
                            setOptionDrafts((current) => ({ ...current, [field.id]: value }));
                            updateField(field.id, { options: parseRegistrationOptions(value) });
                          }}
                          placeholder="Section A, Section B"
                          className={cn(inputCls, "mt-1 h-9 py-1.5 text-xs font-medium")}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {errors.length > 0 ? (
              <div className="mt-4 rounded-[14px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--qs-bad)]">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Fix these before saving
                </p>
                <ul className="mt-1 list-inside list-disc text-[11px] font-semibold text-[var(--qs-bad)]">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
              Live student preview
            </p>
            <div className="mt-2 rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[5px_5px_0_var(--qs-sun)]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-poly-1)] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
                <ClipboardList className="h-3 w-3" /> Step 2 of 2
              </span>
              <h4 className="mt-2.5 text-lg font-black text-[var(--qs-ink)]">
                {form.title.trim() || "Student registration"}
              </h4>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
                {form.description.trim() || "A few details before the student joins the room."}
              </p>

              <div className="mt-4 grid gap-3">
                {form.fields.length === 0 ? (
                  <p className="rounded-[12px] border-2 border-dashed border-[var(--qs-line)] px-3 py-5 text-center text-[11px] font-semibold text-[var(--qs-muted)]">
                    No fields — students join with just the password.
                  </p>
                ) : (
                  form.fields.map((field) => (
                    <div key={field.id}>
                      <p className="text-[11px] font-extrabold text-[var(--qs-ink)]">
                        {field.label.trim() || "Untitled field"}
                        {field.required ? <span className="ml-1 text-[var(--qs-bad)]">*</span> : null}
                      </p>
                      {field.type === "select" ? (
                        <select disabled className="mt-1 h-9 w-full rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 text-[11px] font-medium text-[var(--qs-muted)]">
                          <option>Select an option…</option>
                          {field.options.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          disabled
                          placeholder={
                            field.type === "email"
                              ? "you@example.com"
                              : field.type === "phone"
                                ? "+91 98765 43210"
                                : field.type === "number"
                                  ? "12345"
                                  : "Student answer"
                          }
                          className="mt-1 h-9 w-full rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 text-[11px] font-medium text-[var(--qs-muted)]"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AudienceModal>
  );
}
