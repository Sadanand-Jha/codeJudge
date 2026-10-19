"use client";

import { cn } from "@/lib/helpers";
import { PAPER_HEADING_PRESETS, type PaperHeaderMeta } from "@/utils/paperHeader";

const inputClass =
  "h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-semibold text-[var(--qs-ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] font-medium text-[var(--qs-muted)]">{hint}</span>}
    </label>
  );
}

function MarksInput({
  label,
  tone,
  value,
  onChange,
  disabled,
}: {
  label: string;
  tone: string;
  value: number;
  onChange: (marks: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className={cn("mb-1 block text-[11px] font-extrabold uppercase tracking-[0.06em]", tone)}>{label}</span>
      <input
        type="number"
        min={1}
        max={100}
        value={value}
        onChange={(event) => onChange(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
        disabled={disabled}
        className={inputClass}
      />
    </label>
  );
}

export function PaperHeaderFields({
  value,
  onChange,
  showHeading = true,
  showMarks = false,
  disabled = false,
}: {
  value: PaperHeaderMeta;
  onChange: (next: PaperHeaderMeta) => void;
  showHeading?: boolean;
  showMarks?: boolean;
  disabled?: boolean;
}) {
  const patch = (next: Partial<PaperHeaderMeta>) => onChange({ ...value, ...next });

  return (
    <div className="space-y-4">
      {showHeading && (
        <div>
          <Field label="Paper heading" hint="This appears at the top of the paper. You can use Assignment, Unit Test, etc.">
            <input
              type="text"
              value={value.heading}
              onChange={(event) => patch({ heading: event.target.value })}
              placeholder="e.g. Mid Semester Examination or Assignment"
              disabled={disabled}
              className={inputClass}
            />
          </Field>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PAPER_HEADING_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={value.heading.trim().toLowerCase() === preset.toLowerCase()}
                onClick={() => patch({ heading: preset })}
                disabled={disabled}
                className="b b-chip sm"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Institute name">
          <input
            type="text"
            value={value.instituteName}
            onChange={(event) => patch({ instituteName: event.target.value })}
            placeholder="e.g. Delhi Public School"
            disabled={disabled}
            className={inputClass}
          />
        </Field>
        <Field label="Subject">
          <input
            type="text"
            value={value.subject}
            onChange={(event) => patch({ subject: event.target.value })}
            placeholder="e.g. Operating Systems"
            disabled={disabled}
            className={inputClass}
          />
        </Field>
        <Field label="Class / Semester">
          <input
            type="text"
            value={value.className}
            onChange={(event) => patch({ className: event.target.value })}
            placeholder="e.g. B.Tech CSE, Semester 5"
            disabled={disabled}
            className={inputClass}
          />
        </Field>
        <Field label="Date">
          <input
            type="text"
            value={value.date}
            onChange={(event) => patch({ date: event.target.value })}
            placeholder="e.g. 20 October 2026"
            disabled={disabled}
            className={inputClass}
          />
        </Field>
        <Field label="Time allowed">
          <input
            type="text"
            value={value.timeAllowed}
            onChange={(event) => patch({ timeAllowed: event.target.value })}
            placeholder="e.g. 2 hours"
            disabled={disabled}
            className={inputClass}
          />
        </Field>
        <Field label="Set">
          <input
            type="text"
            value={value.setName}
            onChange={(event) => patch({ setName: event.target.value })}
            placeholder="e.g. A"
            disabled={disabled}
            className={inputClass}
          />
        </Field>
      </div>

      {showMarks && (
        <div>
          <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
            Marks per question
          </span>
          <div className="grid grid-cols-3 gap-3">
            <MarksInput
              label="Easy"
              tone="text-[var(--qs-ok)]"
              value={value.easyMarks}
              disabled={disabled}
              onChange={(marks) => patch({ easyMarks: marks })}
            />
            <MarksInput
              label="Medium"
              tone="text-[#a85d00]"
              value={value.mediumMarks}
              disabled={disabled}
              onChange={(marks) => patch({ mediumMarks: marks })}
            />
            <MarksInput
              label="Hard"
              tone="text-[var(--qs-bad)]"
              value={value.hardMarks}
              disabled={disabled}
              onChange={(marks) => patch({ hardMarks: marks })}
            />
          </div>
          <span className="mt-1 block text-[11px] font-medium text-[var(--qs-muted)]">
            Used in the PDF and Word paper — each question gets marks as per its difficulty.
          </span>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3 transition-colors hover:border-[var(--qs-brand)]">
        <input
          type="checkbox"
          checked={value.showStudentBlock}
          onChange={(event) => patch({ showStudentBlock: event.target.checked })}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--qs-brand)]"
        />
        <span>
          <span className="block text-xs font-extrabold text-[var(--qs-ink)]">Show Name and Roll No. on the paper</span>
          <span className="mt-0.5 block text-[11px] font-medium text-[var(--qs-muted)]">
            Prints blank lines students can fill in.
          </span>
        </span>
      </label>
    </div>
  );
}
