"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/helpers";
import AudienceModal from "@/components/quiz/creator/settings/audience/AudienceModal";

interface DuplicateRoomModalProps {
  open: boolean;
  onClose: () => void;
  roomName: string;
  onConfirm: (copyStudents: boolean) => void;
}

/**
 * Duplicate a room — the admin chooses whether to copy students too. Defaults
 * to room information only, since student membership may change between
 * batches (e.g. CSE-A 2026 → CSE-A 2027).
 */
export default function DuplicateRoomModal({
  open,
  onClose,
  roomName,
  onConfirm,
}: DuplicateRoomModalProps) {
  const [copyStudents, setCopyStudents] = useState(false);

  const handleConfirm = () => {
    onConfirm(copyStudents);
    onClose();
  };

  const options: Array<{ value: boolean; label: string; description: string }> = [
    {
      value: false,
      label: "Room information only",
      description: "Copies the room name and description. Students are added later.",
    },
    {
      value: true,
      label: "Room information + students",
      description: "Copies the name, description and the current student list.",
    },
  ];

  return (
    <AudienceModal
      open={open}
      onClose={onClose}
      title="Duplicate Room"
      subtitle={`Create a copy of "${roomName}".`}
      icon={<Copy className="h-5 w-5" />}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate Room
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => setCopyStudents(opt.value)}
            className={cn(
              "flex w-full items-start gap-3 rounded-[16px] border-2 p-3.5 text-left transition-colors",
              copyStudents === opt.value
                ? "border-[var(--qs-ink)] bg-[var(--qs-poly-1)]"
                : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                copyStudents === opt.value
                  ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
              )}
            >
              {copyStudents === opt.value && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span>
              <span className="block text-sm font-extrabold text-[var(--qs-ink)]">
                {opt.label}
                {!opt.value && (
                  <span className="ml-1.5 rounded-[6px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-1 py-px text-[9px] font-extrabold uppercase tracking-wider text-[#1A1240]">
                    Recommended
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                {opt.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </AudienceModal>
  );
}
