"use client";

import { useState } from "react";
import { AlertTriangle, Check, UserRound } from "lucide-react";
import { cn } from "@/lib/helpers";
import { RoomStudent } from "@/types/room";
import AudienceModal from "@/components/quiz/creator/settings/audience/AudienceModal";

interface EditStudentModalProps {
  open: boolean;
  onClose: () => void;
  student: RoomStudent | null;
  onSave: (patch: Partial<Pick<RoomStudent, "name" | "rollNumber" | "username" | "active">>) => void;
}

/**
 * Edit a student's details (name / roll number / username / active state).
 */
export default function EditStudentModal({ open, onClose, student, onSave }: EditStudentModalProps) {
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [username, setUsername] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-seed local state whenever a new student is opened.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (student && student.id !== seededFor) {
    setSeededFor(student.id);
    setName(student.name);
    setRoll(student.rollNumber);
    setUsername(student.username ?? "");
    setActive(student.active);
    setError(null);
  }
  if (!student && seededFor !== null) {
    setSeededFor(null);
  }

  const handleSave = () => {
    if (!student) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!roll.trim()) {
      setError("Roll number is required.");
      return;
    }
    onSave({ name, rollNumber: roll, active });
    onClose();
  };

  return (
    <AudienceModal
      open={open}
      onClose={onClose}
      title="Edit Student"
      subtitle="Update this student's details."
      icon={<UserRound className="h-5 w-5" />}
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
            onClick={handleSave}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Check className="h-3.5 w-3.5" />
            Save Changes
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Kumar"
            className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Roll Number</label>
          <input
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder="23CSE1042"
            className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Username</label>
          <input
            value={username}
            disabled
            className="h-10 w-full rounded-xl border border-border bg-card-hover/60 px-3.5 text-sm text-text-muted cursor-not-allowed"
          />
          <p className="mt-1 text-[11px] text-text-muted">Username cannot be changed.</p>
        </div>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5">
          <span className="text-xs font-semibold text-text-primary">Active</span>
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className={cn("relative h-5 w-9 rounded-full transition-colors", active ? "bg-success" : "bg-border-hover")}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                active ? "left-[18px]" : "left-0.5"
              )}
            />
          </button>
        </label>
        {error && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>
    </AudienceModal>
  );
}
