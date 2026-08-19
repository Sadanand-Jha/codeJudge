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
            className="h-9 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-danger to-rose-600 px-4 text-xs font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Room
          </button>
        </div>
      }
    >
      <div className="rounded-xl border border-danger/20 bg-danger/[0.04] p-3.5">
        <p className="text-xs leading-relaxed text-text-secondary">
          This permanently removes the room and its student list. This cannot be undone. If this room has
          been used in quizzes,{" "}
          <span className="font-semibold text-text-primary">archive it instead</span> so historical quiz
          data stays intact.
        </p>
      </div>
    </AudienceModal>
  );
}