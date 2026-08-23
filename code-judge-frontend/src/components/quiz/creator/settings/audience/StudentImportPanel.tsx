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
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 font-semibold text-text-secondary transition-colors hover:text-pink-500"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Upload
              </button>
              <span className="text-border-hover">·</span>
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
        <h4 className="text-sm font-bold text-text-primary">Prepare your Excel sheet</h4>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          Your Excel file only needs a <span className="font-semibold text-text-primary">Username</span> column. One username per row — we&apos;ll derive the profile from the username.
        </p>
      </div>

      {/* Mini-spreadsheet example */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[240px] text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-white/[0.03]">
              <th className="px-3 py-2.5 font-bold text-text-primary">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  Username
                  <span className="rounded-md bg-pink-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-pink-500">
                    Required
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="font-medium text-text-secondary">
            {[["rahul.kumar42"], ["priya.singh43"], ["aman.sharma44"]].map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
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

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-2 text-[11px]">
        <span className="font-bold text-text-muted">Required column:</span>
        <span className="font-semibold text-text-primary">Username</span>
        <span className="text-text-muted">· optional: Name, Roll Number (derived if omitted)</span>
      </div>

      {/* Field explanations */}
      <div className="grid grid-cols-1 gap-2">
        {(["username"] as ColumnKey[]).map((key) => {
          const Icon = FIELD_ICONS[key];
          return (
            <div key={key} className="min-w-0 rounded-xl border border-border bg-card p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-pink-500" />
                <span className="text-xs font-bold text-text-primary">{COLUMN_LABELS[key]}</span>
                <span className="shrink-0 whitespace-nowrap rounded-md bg-pink-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pink-500">
                  Required
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{COLUMN_HINTS[key].desc}</p>
              <code className="mt-2 block w-fit break-words rounded-lg bg-input-bg px-2 py-1 text-xs font-medium text-text-primary">
                {COLUMN_HINTS[key].example}
              </code>
              <p className="mt-2 text-[11px] text-text-muted">If Name/Roll columns are present they&apos;ll be used, otherwise filled from the username.</p>
            </div>
          );
        })}
      </div>

      {/* Schema rules */}
      <div className="rounded-xl border border-border bg-card/40 p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Important</p>
        <ul className="mt-1.5 grid gap-1 text-[11px] text-text-secondary sm:grid-cols-2">
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
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Download template */}
      <button
        onClick={downloadExcelTemplate}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary transition-colors hover:border-border-hover hover:bg-card-hover"
      >
        <Download className="h-4 w-4" />
        Download Excel Template
      </button>

      {/* Upload area */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-primary">Upload Excel File</label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0]);
          }}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/40 px-4 py-7 text-center transition-colors hover:border-pink-500/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
            <FileUp className="h-5 w-5" />
          </span>
          <p className="mt-2.5 text-sm font-semibold text-text-primary">
            Drag and drop your <span className="text-pink-500">.xlsx</span> or{" "}
            <span className="text-pink-500">.xls</span> file here
          </p>
          <p className="mt-1 text-xs text-text-secondary">or</p>
          <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]">
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
          <p className="mt-2 text-[11px] text-text-muted">Supported formats: .xlsx, .xls, .csv</p>
        </div>
      </div>

      {parseError && (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5">
          <p className="flex items-start gap-2 text-xs font-medium text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {parseError}
          </p>
          <button onClick={onDismissError} className="shrink-0 rounded p-0.5 text-danger/70 hover:text-danger">
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
        <h4 className="text-sm font-bold text-text-primary">Confirm column mapping</h4>
        <p className="mt-1 text-xs text-text-secondary">
          We matched these columns from <span className="font-semibold text-text-primary">{sheetData.sheetName}</span>.
          Change any mapping if it looks wrong.
        </p>
      </div>

      <div className="grid gap-2.5">
        {(["name", "roll", "username"] as ColumnKey[]).map((key) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-card p-3.5"
          >
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-text-primary">{COLUMN_LABELS[key]}</span>
                {key === "username" ? (
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-pink-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pink-500">
                    Required
                  </span>
                ) : (
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
                    Optional
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="shrink-0 text-[11px] text-text-muted">Your column</span>
                <select
                  value={mapping[key] ?? ""}
                  onChange={(e) => onMappingChange({ ...mapping, [key]: e.target.value || null })}
                  className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2.5 text-xs font-medium text-text-primary focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10 sm:w-52"
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/40 px-3.5 py-2.5">
        <p className="text-[11px] text-text-secondary">
          <span className="font-bold text-text-primary">{sheetData.rows.length}</span> data row
          {sheetData.rows.length !== 1 ? "s" : ""} detected
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="h-9 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-card-hover"
          >
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
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
      <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/[0.05] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <div>
          <h4 className="text-sm font-bold text-text-primary">Missing required column</h4>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            We couldn&apos;t find a{" "}
            <span className="font-semibold text-text-primary">
              {missing.map((k) => COLUMN_LABELS[k]).join(" and ")}
            </span>{" "}
            column in your {fileLabel} file.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Required columns</p>
        <div className="mt-2 space-y-1.5">
          {(["name", "roll", "username"] as ColumnKey[]).map((key) => {
            const ok = Boolean(mapping[key]);
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                {ok ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <X className="h-3.5 w-3.5 text-danger" />
                )}
                <span className={ok ? "text-text-secondary" : "font-semibold text-danger"}>
                  {COLUMN_LABELS[key]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onBack}
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
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
        <h4 className="text-sm font-bold text-text-primary">Review your students</h4>
        <p className="mt-1 text-xs text-text-secondary">
          We found some issues while validating. Review the rows below before importing.
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
          <Check className="h-3 w-3" />
          {classification.valid.length} valid
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1 text-[11px] font-bold text-warning">
          <AlertTriangle className="h-3 w-3" />
          {classification.attention.length} invalid
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger">
          <X className="h-3 w-3" />
          {classification.duplicate.length} duplicate
        </span>
        <button
          onClick={onToggleIssues}
          className="ml-auto rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
        >
          {showIssues ? "Show all rows" : "Review Issues"}
        </button>
      </div>

      {/* Preview table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_104px_minmax(0,0.9fr)_112px] items-center gap-3 border-b border-border bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted sm:grid">
          <span>Name</span>
          <span>Roll Number</span>
          <span>Username</span>
          <span className="text-right">Status</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {rows.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-text-muted">
              {showIssues ? "No issues found — all rows are ready." : "No rows to review."}
            </p>
          )}
          {rows.map((r, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2.5 text-xs last:border-0 sm:grid-cols-[minmax(0,1.6fr)_104px_minmax(0,0.9fr)_112px] sm:gap-y-0",
                r.status === "ready"
                  ? "text-text-secondary"
                  : r.status === "attention"
                  ? "bg-warning/[0.03]"
                  : "bg-danger/[0.03]"
              )}
            >
              <span className="order-1 min-w-0 truncate font-medium text-text-primary">
                {r.name || "—"}
              </span>
              <span
                className={cn(
                  "order-3 col-span-2 flex items-center gap-1 font-mono text-[11px] sm:order-2 sm:col-span-1 sm:block sm:truncate",
                  r.rollNumber ? "text-text-secondary" : "text-danger"
                )}
              >
                {r.rollNumber || "—"}
              </span>
              <span className="order-4 col-span-2 truncate text-[11px] text-text-muted sm:order-3 sm:col-span-1">
                {r.username ? `@${r.username}` : "—"}
              </span>
              <span
                className={cn(
                  "order-2 flex items-center justify-end gap-1 text-right text-[11px] font-semibold sm:order-4",
                  r.status === "ready"
                    ? "text-success"
                    : r.status === "attention"
                    ? "text-warning"
                    : "text-danger"
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
        <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/[0.05] px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
          <p className="text-[11px] leading-relaxed text-text-secondary">
            Duplicate rows (already in the room or repeated in your file) will be skipped and never
            imported twice.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="h-9 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-card-hover"
        >
          Back
        </button>
        <button
          onClick={onImport}
          disabled={classification.valid.length === 0}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success ring-1 ring-inset ring-success/25">
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </span>
      <h4 className="mt-4 text-base font-bold text-text-primary">Students imported successfully</h4>
      <p className="mt-1 text-sm text-text-secondary">
        {count} student{count !== 1 ? "s" : ""} added to <span className="font-semibold text-text-primary">{roomName}</span>.
      </p>

      <div className="mt-5 flex items-center gap-2">
        {viewStudentsHref && (
          <a
            href={viewStudentsHref}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
          >
            View Students
          </a>
        )}
        <button
          onClick={onDone}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Done
        </button>
      </div>
    </div>
  );
}