"use client";

import { useState } from "react";
import { AlertTriangle, Check, UserRound } from "lucide-react";
import { cn } from "@/lib/helpers";
import { RoomStudent } from "@/types/room";
import { sanitizeImportValue } from "@/utils/importValidation";
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
    onSave({ name: sanitizeImportValue(name), rollNumber: sanitizeImportValue(roll), active });
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
            className="inline-flex h-9 items-center justify-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            <Check className="h-3.5 w-3.5" />
            Save Changes
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-extrabold text-[var(--qs-ink)]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Kumar"
            className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-extrabold text-[var(--qs-ink)]">Roll Number</label>
          <input
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder="23CSE1042"
            className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-extrabold text-[var(--qs-ink)]">Username</label>
          <input
            value={username}
            disabled
            className="h-10 w-full cursor-not-allowed rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 text-sm font-medium text-[var(--qs-muted)]"
          />
          <p className="mt-1 text-[11px] font-medium text-[var(--qs-muted)]">Username cannot be changed.</p>
        </div>
        <label className="flex cursor-pointer items-center justify-between rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-2.5">
          <span className="text-xs font-extrabold text-[var(--qs-ink)]">Active</span>
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className={cn(
              "relative h-5 w-9 rounded-full border-2 transition-colors",
              active ? "border-[var(--qs-ink)] bg-[var(--qs-ok)]" : "border-[var(--qs-line)] bg-[var(--qs-line)]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all",
                active ? "left-[18px]" : "left-0.5"
              )}
            />
          </button>
        </label>
        {error && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--qs-bad)]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>
    </AudienceModal>
  );
}
