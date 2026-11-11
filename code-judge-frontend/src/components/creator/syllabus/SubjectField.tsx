"use client";

import { useSyllabusImportAccess } from "@/hooks/useSyllabusImportAccess";
import { SyllabusSearchSelect } from "./SyllabusSearchSelect";

interface SubjectFieldProps {
  /** Selected subject name (from an imported syllabus). */
  subject: string;
  /** Selected syllabus subject id. */
  subjectId: number | string | null | undefined;
  onChange: (patch: { subject: string; subjectId: number | string }) => void;
  placeholder?: string;
  required?: boolean;
  theme?: "light" | "dark";
}

/**
 * Subject picker for quizzes. Only paid plans get it, and it lists imported
 * syllabi. Free plans don't have a subject field at all, so this renders
 * nothing for them (and while the plan is still loading).
 */
export function SubjectField({
  subject,
  subjectId,
  onChange,
  placeholder,
  required,
  theme = "light",
}: SubjectFieldProps) {
  const { hasPaidPlan, isLoading } = useSyllabusImportAccess();

  if (isLoading || !hasPaidPlan) return null;

  return (
    <SyllabusSearchSelect
      type="syllabus"
      theme={theme}
      placeholder={placeholder ?? "Search syllabi..."}
      required={required}
      value={subjectId ? Number(subjectId) || null : null}
      selectedLabel={subject || null}
      onChange={(item) => onChange({ subject: item?.name ?? "", subjectId: item?.id ?? "" })}
    />
  );
}

export default SubjectField;
