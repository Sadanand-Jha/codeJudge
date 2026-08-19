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
            className="h-9 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
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
              "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
              copyStudents === opt.value
                ? "border-pink-500/40 bg-pink-500/[0.06]"
                : "border-border bg-card hover:border-border-hover"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                copyStudents === opt.value
                  ? "border-pink-500 bg-pink-500 text-white"
                  : "border-border-hover bg-input-bg"
              )}
            >
              {copyStudents === opt.value && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-text-primary">
                {opt.label}
                {!opt.value && (
                  <span className="ml-1.5 rounded bg-pink-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-pink-500">
                    Recommended
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-text-secondary">
                {opt.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </AudienceModal>
  );
}