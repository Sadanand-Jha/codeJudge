"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import AudienceModal from "@/components/quiz/creator/settings/audience/AudienceModal";

interface DeleteRoomModalProps {
  open: boolean;
  onClose: () => void;
  roomName: string;
  onConfirm: () => void;
}

/**
 * Destructive confirm for permanently deleting a room. Rooms already used in
 * quizzes should be archived instead — the warning makes that clear.
 */
export default function DeleteRoomModal({
  open,
  onClose,
  roomName,
  onConfirm,
}: DeleteRoomModalProps) {
  return (
    <AudienceModal
      open={open}
      onClose={onClose}
      title="Delete Room"
      subtitle={`Permanently delete "${roomName}"?`}
      icon={<AlertTriangle className="h-5 w-5" />}
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
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] px-4 text-xs font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Room
          </button>
        </div>
      }
    >
      <div className="rounded-[14px] border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] p-3.5">
        <p className="text-xs font-medium leading-relaxed text-[var(--qs-ink)]">
          This permanently removes the room and its student list. This cannot be undone. If this room has
          been used in quizzes,{" "}
          <span className="font-extrabold text-[var(--qs-ink)]">archive it instead</span> so historical quiz
          data stays intact.
        </p>
      </div>
    </AudienceModal>
  );
}
