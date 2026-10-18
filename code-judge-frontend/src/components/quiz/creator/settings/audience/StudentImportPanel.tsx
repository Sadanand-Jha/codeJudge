"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  AtSign,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileUp,
  Hash,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { RoomStudent } from "@/types/room";
import {
  parseImportFile,
  detectColumnMapping,
  missingColumns,
  extractRows,
  classifyImportedRows,
  downloadExcelTemplate,
  isSupportedImportFile,
  importFileLabel,
  type ColumnKey,
  type ColumnMapping,
  type ExcelSheetData,
  type Classification,
} from "@/utils/excelImport";

type Step = "prepare" | "mapping" | "validate" | "success";

interface StudentImportPanelProps {
  /** Room name used in the success message (may be empty for new rooms). */
  roomName: string;
  /** Roll numbers already present in the room — used for duplicate detection. */
  existingRolls: string[];
  /** Called with the validated student drafts once the teacher confirms the import. */
  onImported: (students: RoomStudent[]) => void;
  /** Optional link to the room page shown after a successful import. */
  viewStudentsHref?: string;
}

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: "Name",
  roll: "Roll Number",
  username: "Username",
};

const COLUMN_HINTS: Record<ColumnKey, { desc: string; example: string }> = {
  name: { desc: "Student's full name.", example: "Rahul Kumar" },
  roll: { desc: "Student's unique college/school roll number.", example: "23CSE1042" },
  username: { desc: "Student's unique username.", example: "rahul.kumar42" },
};

const FIELD_ICONS: Record<ColumnKey, React.ComponentType<{ className?: string }>> = {
  name: UserRound,
  roll: Hash,
  username: AtSign,
};

/**
 * Guided Excel/CSV student import: schema explanation → upload → column
 * mapping → validation → import → success. Nothing is imported silently.
 */
export default function StudentImportPanel({
  roomName,
  existingRolls,
  onImported,
  viewStudentsHref,
}: StudentImportPanelProps) {
  const [step, setStep] = useState<Step>("prepare");
  const [fileName, setFileName] = useState("");
  const [sheetData, setSheetData] = useState<ExcelSheetData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: null, roll: null, username: null });
  const [classification, setClassification] = useState<Classification | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const reset = () => {
    setStep("prepare");
    setFileName("");
    setSheetData(null);
    setMapping({ name: null, roll: null, username: null });
    setClassification(null);
    setShowIssues(false);
    setParseError(null);
    setImportedCount(0);
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setParseError(null);
    if (!isSupportedImportFile(file.name)) {
      setParseError("Please upload a .xlsx, .xls or .csv file.");
      return;
    }
    try {
      const data = await parseImportFile(file);
      setFileName(file.name);
      setSheetData(data);
      setMapping(detectColumnMapping(data.headers));
      setStep("mapping");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "We couldn't read that file. Please try again.");
    }
  };

  const missing = sheetData ? missingColumns(mapping) : [];
  const confirmed = sheetData && missing.length === 0;

  const continueToReview = () => {
    if (!sheetData || !confirmed) return;
    const raw = extractRows(sheetData, mapping);
    setClassification(classifyImportedRows(raw, existingRolls));
    setShowIssues(false);
    setStep("validate");
  };

  const importValid = () => {
    if (!classification) return;
    const students: RoomStudent[] = classification.valid.map((r, i) => ({
      id: `import_${Date.now()}_${i}`,
      name: r.name,
      rollNumber: r.rollNumber,
      username: r.username,
      active: true,
      avatarId: (i % 7) + 1,
    }));
    onImported(students);
    setImportedCount(students.length);
    setStep("success");
  };

  const roomLabel = roomName.trim() ? roomName.trim() : "your room";

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {step === "prepare" && (
          <motion.div
            key="prepare"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <PrepareStep onFile={handleFile} parseError={parseError} onDismissError={() => setParseError(null)} />
          </motion.div>
        )}

        {step === "mapping" && sheetData && (
          <motion.div
            key="mapping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-xs text-[var(--qs-muted)]">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 font-bold text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-brand)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Upload
              </button>
              <span className="text-[var(--qs-line)]">·</span>
              <span className="truncate font-medium">{fileName}</span>
            </div>

            {missing.length > 0 ? (
              <MissingColumnState
                fileLabel={importFileLabel(fileName)}
                mapping={mapping}
                onBack={reset}
              />
            ) : (
              <MappingStep
                sheetData={sheetData}
                mapping={mapping}
                onMappingChange={setMapping}
                onContinue={continueToReview}
                onBack={reset}
              />
            )}
          </motion.div>
        )}

        {step === "validate" && classification && (
          <motion.div
            key="validate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <ValidationStep
              classification={classification}
              showIssues={showIssues}
              onToggleIssues={() => setShowIssues((v) => !v)}
              onImport={importValid}
              onBack={() => setStep("mapping")}
            />
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <SuccessStep
              count={importedCount}
              roomName={roomLabel}
              viewStudentsHref={viewStudentsHref}
              onDone={reset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =============================================
   Step 1 — Prepare your Excel sheet
   ============================================= */
function PrepareStep({
  onFile,
  parseError,
  onDismissError,
}: {
  onFile: (file?: File | null) => void;
  parseError: string | null;
  onDismissError: () => void;
}) {
  return (
    <>
      <div>
        <h4 className="text-sm font-black text-[var(--qs-ink)]">Prepare your Excel sheet</h4>
        <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
          Your Excel file only needs a <span className="font-extrabold text-[var(--qs-ink)]">Username</span> column. One username per row — we&apos;ll derive the profile from the username.
        </p>
      </div>

      {/* Mini-spreadsheet example */}
      <div className="overflow-x-auto rounded-[14px] border-2 border-[var(--qs-line)]">
        <table className="w-full min-w-[240px] text-left text-xs">
          <thead>
            <tr className="border-b-2 border-[var(--qs-line)] bg-[var(--qs-poly-0)]">
              <th className="px-3 py-2.5 font-extrabold text-[var(--qs-ink)]">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  Username
                  <span className="rounded-[6px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wider text-[#1A1240]">
                    Required
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="font-medium text-[var(--qs-muted)]">
            {[["rahul.kumar42"], ["priya.singh43"], ["aman.sharma44"]].map((row, i) => (
              <tr key={i} className="border-b-2 border-[var(--qs-line)] last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[11px]">
        <span className="font-extrabold text-[var(--qs-muted)]">Required column:</span>
        <span className="font-extrabold text-[var(--qs-ink)]">Username</span>
        <span className="font-medium text-[var(--qs-muted)]">· optional: Name, Roll Number (derived if omitted)</span>
      </div>

      {/* Field explanations */}
      <div className="grid grid-cols-1 gap-2">
        {(["username"] as ColumnKey[]).map((key) => {
          const Icon = FIELD_ICONS[key];
          return (
            <div key={key} className="min-w-0 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
                <span className="text-xs font-extrabold text-[var(--qs-ink)]">{COLUMN_LABELS[key]}</span>
                <span className="shrink-0 whitespace-nowrap rounded-[6px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#1A1240]">
                  Required
                </span>
              </div>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">{COLUMN_HINTS[key].desc}</p>
              <code className="mt-2 block w-fit break-words rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-1 text-xs font-medium text-[var(--qs-ink)]">
                {COLUMN_HINTS[key].example}
              </code>
              <p className="mt-2 text-[11px] font-medium text-[var(--qs-muted)]">If Name/Roll columns are present they&apos;ll be used, otherwise filled from the username.</p>
            </div>
          );
        })}
      </div>

      {/* Schema rules */}
      <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">Important</p>
        <ul className="mt-1.5 grid gap-1 text-[11px] font-medium text-[var(--qs-muted)] sm:grid-cols-2">
          {[
            "Only the Username column is required.",
            "The first row must be 'Username'.",
            "Each subsequent row is one username.",
            "Do not merge cells — keep one username per row.",
            "Usernames must be 2-30 chars: letters, numbers, ., _, -.",
            "Duplicates are skipped automatically.",
            "Avoid completely empty rows.",
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--qs-ok)]" />
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Download template */}
      <button
        onClick={downloadExcelTemplate}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
      >
        <Download className="h-4 w-4" />
        Download Excel Template
      </button>

      {/* Upload area */}
      <div>
        <label className="mb-1.5 block text-xs font-extrabold text-[var(--qs-ink)]">Upload Excel File</label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0]);
          }}
          className="flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-7 text-center transition-colors hover:border-[var(--qs-brand)]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
            <FileUp className="h-5 w-5" />
          </span>
          <p className="mt-2.5 text-sm font-extrabold text-[var(--qs-ink)]">
            Drag and drop your <span className="text-[var(--qs-brand)]">.xlsx</span> or{" "}
            <span className="text-[var(--qs-brand)]">.xls</span> file here
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">or</p>
          <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Browse Files
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="mt-2 text-[11px] font-medium text-[var(--qs-muted)]">Supported formats: .xlsx, .xls, .csv</p>
        </div>
      </div>

      {parseError && (
        <div className="flex items-start justify-between gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-3.5 py-2.5">
          <p className="flex items-start gap-2 text-xs font-bold text-[var(--qs-bad)]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {parseError}
          </p>
          <button onClick={onDismissError} className="shrink-0 rounded-[6px] p-0.5 text-[var(--qs-bad)]/70 transition-colors hover:text-[var(--qs-bad)]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

/* =============================================
   Step 2 — Confirm column mapping
   ============================================= */
function MappingStep({
  sheetData,
  mapping,
  onMappingChange,
  onContinue,
  onBack,
}: {
  sheetData: ExcelSheetData;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-[var(--qs-ink)]">Confirm column mapping</h4>
        <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
          We matched these columns from <span className="font-extrabold text-[var(--qs-ink)]">{sheetData.sheetName}</span>.
          Change any mapping if it looks wrong.
        </p>
      </div>

      <div className="grid gap-2.5">
        {(["name", "roll", "username"] as ColumnKey[]).map((key) => (
          <div
            key={key}
            className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5"
          >
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-[var(--qs-ink)]">{COLUMN_LABELS[key]}</span>
                {key === "username" ? (
                  <span className="shrink-0 whitespace-nowrap rounded-[6px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#1A1240]">
                    Required
                  </span>
                ) : (
                  <span className="shrink-0 whitespace-nowrap rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
                    Optional
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="shrink-0 text-[11px] font-medium text-[var(--qs-muted)]">Your column</span>
                <select
                  value={mapping[key] ?? ""}
                  onChange={(e) => onMappingChange({ ...mapping, [key]: e.target.value || null })}
                  className="h-9 w-full cursor-pointer rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-xs font-bold text-[var(--qs-ink)] focus:border-[var(--qs-brand)] focus:outline-none sm:w-52"
                >
                  <option value="">— Select column —</option>
                  {sheetData.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5">
        <p className="text-[11px] font-medium text-[var(--qs-muted)]">
          <span className="font-extrabold text-[var(--qs-ink)]">{sheetData.rows.length}</span> data row
          {sheetData.rows.length !== 1 ? "s" : ""} detected
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="h-9 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            Back
          </button>
          <button
            onClick={onContinue}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            Continue to Review
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MissingColumnState({
  fileLabel,
  mapping,
  onBack,
}: {
  fileLabel: string;
  mapping: ColumnMapping;
  onBack: () => void;
}) {
  const missing = missingColumns(mapping);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[16px] border-2 border-[#a85d00]/30 bg-[#fff3d6] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <h4 className="text-sm font-black text-[var(--qs-ink)]">Missing required column</h4>
          <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
            We couldn&apos;t find a{" "}
            <span className="font-extrabold text-[var(--qs-ink)]">
              {missing.map((k) => COLUMN_LABELS[k]).join(" and ")}
            </span>{" "}
            column in your {fileLabel} file.
          </p>
        </div>
      </div>

      <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">Required columns</p>
        <div className="mt-2 space-y-1.5">
          {(["name", "roll", "username"] as ColumnKey[]).map((key) => {
            const ok = Boolean(mapping[key]);
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                {ok ? (
                  <Check className="h-3.5 w-3.5 text-[var(--qs-ok)]" />
                ) : (
                  <X className="h-3.5 w-3.5 text-[var(--qs-bad)]" />
                )}
                <span className={ok ? "font-medium text-[var(--qs-muted)]" : "font-extrabold text-[var(--qs-bad)]"}>
                  {COLUMN_LABELS[key]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onBack}
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Upload
      </button>
    </div>
  );
}

/* =============================================
   Step 3 — Validate students
   ============================================= */
function ValidationStep({
  classification,
  showIssues,
  onToggleIssues,
  onImport,
  onBack,
}: {
  classification: Classification;
  showIssues: boolean;
  onToggleIssues: () => void;
  onImport: () => void;
  onBack: () => void;
}) {
  const rows = showIssues ? [...classification.attention, ...classification.duplicate] : classification.rows;
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-[var(--qs-ink)]">Review your students</h4>
        <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
          We found some issues while validating. Review the rows below before importing.
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--qs-ok)]">
          <Check className="h-3 w-3" />
          {classification.valid.length} valid
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#a85d00]/30 bg-[#fff3d6] px-2.5 py-1 text-[11px] font-extrabold text-[#a85d00]">
          <AlertTriangle className="h-3 w-3" />
          {classification.attention.length} invalid
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--qs-bad)]">
          <X className="h-3 w-3" />
          {classification.duplicate.length} duplicate
        </span>
        <button
          onClick={onToggleIssues}
          className="ml-auto rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
        >
          {showIssues ? "Show all rows" : "Review Issues"}
        </button>
      </div>

      {/* Preview table */}
      <div className="overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)]">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_104px_minmax(0,0.9fr)_112px] items-center gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-poly-0)] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)] sm:grid">
          <span>Name</span>
          <span>Roll Number</span>
          <span>Username</span>
          <span className="text-right">Status</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {rows.length === 0 && (
            <p className="px-3 py-8 text-center text-xs font-medium text-[var(--qs-muted)]">
              {showIssues ? "No issues found — all rows are ready." : "No rows to review."}
            </p>
          )}
          {rows.map((r, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b-2 border-[var(--qs-line)] px-3 py-2.5 text-xs last:border-0 sm:grid-cols-[minmax(0,1.6fr)_104px_minmax(0,0.9fr)_112px] sm:gap-y-0",
                r.status === "ready"
                  ? "text-[var(--qs-muted)]"
                  : r.status === "attention"
                  ? "bg-[#fff7dd]/70"
                  : "bg-[var(--qs-badbg)]/60"
              )}
            >
              <span className="order-1 min-w-0 truncate font-bold text-[var(--qs-ink)]">
                {r.name || "—"}
              </span>
              <span
                className={cn(
                  "order-3 col-span-2 flex items-center gap-1 font-mono text-[11px] sm:order-2 sm:col-span-1 sm:block sm:truncate",
                  r.rollNumber ? "text-[var(--qs-muted)]" : "text-[var(--qs-bad)]"
                )}
              >
                {r.rollNumber || "—"}
              </span>
              <span className="order-4 col-span-2 truncate text-[11px] font-medium text-[var(--qs-muted)] sm:order-3 sm:col-span-1">
                {r.username ? `@${r.username}` : "—"}
              </span>
              <span
                className={cn(
                  "order-2 flex items-center justify-end gap-1 text-right text-[11px] font-extrabold sm:order-4",
                  r.status === "ready"
                    ? "text-[var(--qs-ok)]"
                    : r.status === "attention"
                    ? "text-[#a85d00]"
                    : "text-[var(--qs-bad)]"
                )}
              >
                {r.status === "ready" ? (
                  <Check className="h-3 w-3" />
                ) : r.status === "attention" ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                <span className="whitespace-nowrap">
                  {r.status === "ready" ? "Ready" : r.issue}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {classification.duplicate.length > 0 && (
        <div className="flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/25 bg-[var(--qs-badbg)] px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-bad)]" />
          <p className="text-[11px] font-medium leading-relaxed text-[var(--qs-ink)]">
            Duplicate rows (already in the room or repeated in your file) will be skipped and never
            imported twice.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="h-9 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
        >
          Back
        </button>
        <button
          onClick={onImport}
          disabled={classification.valid.length === 0}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" />
          Import {classification.valid.length} Valid Student
          {classification.valid.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

/* =============================================
   Step 4 — Success
   ============================================= */
function SuccessStep({
  count,
  roomName,
  viewStudentsHref,
  onDone,
}: {
  count: number;
  roomName: string;
  viewStudentsHref?: string;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </span>
      <h4 className="mt-4 text-base font-black text-[var(--qs-ink)]">Students imported successfully</h4>
      <p className="mt-1 text-sm font-medium text-[var(--qs-muted)]">
        {count} student{count !== 1 ? "s" : ""} added to <span className="font-extrabold text-[var(--qs-ink)]">{roomName}</span>.
      </p>

      <div className="mt-5 flex items-center gap-2">
        {viewStudentsHref && (
          <a
            href={viewStudentsHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            View Students
          </a>
        )}
        <button
          onClick={onDone}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Done
        </button>
      </div>
    </div>
  );
}
