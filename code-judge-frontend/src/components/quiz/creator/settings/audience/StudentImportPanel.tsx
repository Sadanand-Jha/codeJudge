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
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { MAX_STUDENTS_PER_ROOM } from "@/lib/constants";
import { RoomStudent } from "@/types/room";
import { MAX_IMPORT_COLUMNS, MAX_IMPORT_ROWS } from "@/utils/importValidation";
import {
  parseImportFile,
  classifyImportedRows,
  downloadExcelTemplate,
  isSupportedImportFile,
  importFileLabel,
  type ExcelSheetData,
  type Classification,
} from "@/utils/excelImport";

type Step = "prepare" | "columns" | "validate" | "success";

interface StudentImportPanelProps {
  /** Room name used in the success message (may be empty for new rooms). */
  roomName: string;
  /** Usernames/rolls already present in the room — used for duplicate detection. */
  existingRolls: string[];
  /** Called with the validated student drafts once the teacher confirms the import. */
  onImported: (students: RoomStudent[]) => void;
  /** Optional link to the room page shown after a successful import. */
  viewStudentsHref?: string;
  /** Free slots left in the room — imported students beyond this are skipped. */
  remainingCapacity?: number;
}

/**
 * Guided Excel/CSV student import: schema explanation → upload → column
 * review → validation → import → success. Nothing is imported silently, and
 * every username/value is validated before it can be stored.
 */
export default function StudentImportPanel({
  roomName,
  existingRolls,
  onImported,
  viewStudentsHref,
  remainingCapacity,
}: StudentImportPanelProps) {
  const [step, setStep] = useState<Step>("prepare");
  const [fileName, setFileName] = useState("");
  const [sheetData, setSheetData] = useState<ExcelSheetData | null>(null);
  const [excludedColumns, setExcludedColumns] = useState<string[]>([]);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState({ count: 0, skippedByCapacity: 0 });

  const capacity = Math.max(0, remainingCapacity ?? MAX_STUDENTS_PER_ROOM);

  const reset = () => {
    setStep("prepare");
    setFileName("");
    setSheetData(null);
    setExcludedColumns([]);
    setClassification(null);
    setShowIssues(false);
    setParseError(null);
    setResult({ count: 0, skippedByCapacity: 0 });
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
      setExcludedColumns([]);
      setStep("columns");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "We couldn't read that file. Please try again.");
    }
  };

  const toggleColumn = (name: string) => {
    setExcludedColumns((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const continueToReview = () => {
    if (!sheetData) return;
    setClassification(classifyImportedRows(sheetData, existingRolls, { excludedColumns }));
    setShowIssues(false);
    setStep("validate");
  };

  const importValid = () => {
    if (!classification) return;
    const toImport = classification.valid.slice(0, capacity);
    const students: RoomStudent[] = toImport.map((r, i) => ({
      id: `import_${Date.now()}_${i}`,
      name: r.name,
      rollNumber: r.rollNumber,
      username: r.username,
      active: true,
      avatarId: (i % 7) + 1,
      data: Object.keys(r.data).length > 0 ? r.data : undefined,
    }));
    onImported(students);
    setResult({ count: students.length, skippedByCapacity: classification.valid.length - students.length });
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

        {step === "columns" && sheetData && (
          <motion.div
            key="columns"
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
              <span className="shrink-0 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
                {importFileLabel(fileName)}
              </span>
            </div>

            <ColumnsStep
              sheetData={sheetData}
              excludedColumns={excludedColumns}
              onToggleColumn={toggleColumn}
              onContinue={continueToReview}
              onBack={reset}
              capacity={capacity}
            />
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
              onBack={() => setStep("columns")}
              capacity={capacity}
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
              count={result.count}
              skippedByCapacity={result.skippedByCapacity}
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
  const exampleHeaders = ["Username", "Roll Number", "Branch", "Year"];
  const exampleRows = [
    ["rahul.kumar42", "23CSE1042", "Computer Science", "3"],
    ["priya.singh43", "23CSE1043", "Computer Science", "3"],
    ["aman.sharma44", "23CSE1044", "Electrical", "2"],
  ];

  return (
    <>
      <div>
        <h4 className="text-sm font-black text-[var(--qs-ink)]">Prepare your Excel sheet</h4>
        <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
          The <span className="font-extrabold text-[var(--qs-ink)]">first column must be Username</span>. Add up to{" "}
          {MAX_IMPORT_COLUMNS - 1} more columns — Roll Number, Branch, Year, Section, anything you want — and every
          value is saved with the student&apos;s membership, just like quiz registration fields.
        </p>
      </div>

      {/* Mini-spreadsheet example */}
      <div className="overflow-x-auto rounded-[14px] border-2 border-[var(--qs-line)]">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead>
            <tr className="border-b-2 border-[var(--qs-line)] bg-[var(--qs-poly-0)]">
              {exampleHeaders.map((h, i) => (
                <th key={h} className="px-3 py-2.5 font-extrabold text-[var(--qs-ink)]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {h}
                    {i === 0 && (
                      <span className="rounded-[6px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wider text-[#1A1240]">
                        Required
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-medium text-[var(--qs-muted)]">
            {exampleRows.map((row, i) => (
              <tr key={i} className="border-b-2 border-[var(--qs-line)] last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="whitespace-nowrap px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {[
          "Username is always the first column",
          `Max ${MAX_IMPORT_COLUMNS} columns`,
          `Max ${MAX_IMPORT_ROWS} rows`,
          "No formulas, HTML or scripts",
        ].map((chip) => (
          <span
            key={chip}
            className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 font-bold text-[var(--qs-muted)]"
          >
            {chip}
          </span>
        ))}
      </div>

      {/* Field explanation */}
      <div className="grid grid-cols-1 gap-2">
        <div className="min-w-0 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <AtSign className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
            <span className="text-xs font-extrabold text-[var(--qs-ink)]">Username</span>
            <span className="shrink-0 whitespace-nowrap rounded-[6px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#1A1240]">
              Required · First column
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
            Student&apos;s unique username — must match their QuizSupport account.
          </p>
          <code className="mt-2 block w-fit break-words rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-1 text-xs font-medium text-[var(--qs-ink)]">
            rahul.kumar42
          </code>
          <p className="mt-2 text-[11px] font-medium text-[var(--qs-muted)]">
            2-30 characters: letters, numbers, dots, underscores and hyphens only.
          </p>
        </div>

        <div className="min-w-0 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
            <span className="text-xs font-extrabold text-[var(--qs-ink)]">Extra columns (up to {MAX_IMPORT_COLUMNS - 1})</span>
            <span className="shrink-0 whitespace-nowrap rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
              Optional
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
            Anything you want saved for the member — <span className="font-bold text-[var(--qs-ink)]">Roll Number,
            Branch, Year, Section</span>… You choose the column names.
          </p>
          <p className="mt-2 text-[11px] font-medium text-[var(--qs-muted)]">
            Name and Roll Number columns are used for the student list when present, otherwise both are filled from
            the username.
          </p>
        </div>
      </div>

      {/* Schema rules */}
      <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">Important</p>
        <ul className="mt-1.5 grid gap-1 text-[11px] font-medium text-[var(--qs-muted)] sm:grid-cols-2">
          {[
            "First column must be 'Username'.",
            `Up to ${MAX_IMPORT_COLUMNS} columns and ${MAX_IMPORT_ROWS} rows per file.`,
            "Column names must be unique (max 60 chars).",
            "Usernames: 2-30 chars — letters, numbers, ., _, -.",
            "Values are stored as plain text — no formulas, links, HTML or scripts.",
            "Duplicates are skipped automatically.",
            "Do not merge cells. Keep one student per row.",
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
   Step 2 — Review columns
   ============================================= */
function ColumnsStep({
  sheetData,
  excludedColumns,
  onToggleColumn,
  onContinue,
  onBack,
  capacity,
}: {
  sheetData: ExcelSheetData;
  excludedColumns: string[];
  onToggleColumn: (name: string) => void;
  onContinue: () => void;
  onBack: () => void;
  capacity: number;
}) {
  const customColumns = sheetData.headers.slice(1);
  const includedCount = customColumns.filter((c) => !excludedColumns.includes(c)).length;
  const sample = sheetData.rows[0] ?? [];
  const exceedsCapacity = sheetData.rows.length > capacity;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-[var(--qs-ink)]">Confirm your columns</h4>
        <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
          We read these columns from <span className="font-extrabold text-[var(--qs-ink)]">{sheetData.sheetName}</span>.
          Uncheck anything you don&apos;t want saved with your students.
        </p>
      </div>

      <div className="grid gap-2.5">
        {/* Username — locked, always first */}
        <div className="rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] p-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <AtSign className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
              <span className="text-xs font-extrabold text-[var(--qs-ink)]">{sheetData.headers[0]}</span>
              <span className="shrink-0 whitespace-nowrap rounded-[6px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#1A1240]">
                Required · First column
              </span>
            </div>
            <span className="min-w-0 truncate text-[11px] font-medium text-[var(--qs-muted)]">
              e.g. {sample[0] || "rahul.kumar42"}
            </span>
          </div>
        </div>

        {/* Custom columns */}
        {customColumns.map((col) => {
          const index = sheetData.headers.indexOf(col);
          const included = !excludedColumns.includes(col);
          return (
            <label
              key={col}
              className={cn(
                "flex cursor-pointer flex-col gap-2.5 rounded-[16px] border-2 p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
                included
                  ? "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-bg)] opacity-60"
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => onToggleColumn(col)}
                  className="h-3.5 w-3.5 shrink-0 rounded accent-[var(--qs-brand)]"
                />
                <span className="truncate text-xs font-extrabold text-[var(--qs-ink)]">{col}</span>
                <span className="shrink-0 whitespace-nowrap rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
                  Saved with student
                </span>
              </div>
              <span className="min-w-0 truncate text-[11px] font-medium text-[var(--qs-muted)]">
                e.g. {sample[index] || "—"}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5">
        <p className="text-[11px] font-medium text-[var(--qs-muted)]">
          <span className="font-extrabold text-[var(--qs-ink)]">{sheetData.rows.length}</span> data row
          {sheetData.rows.length !== 1 ? "s" : ""} detected ·{" "}
          <span className="font-extrabold text-[var(--qs-ink)]">{includedCount + 1}</span> column
          {includedCount + 1 !== 1 ? "s" : ""} will be saved
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

      {exceedsCapacity && (
        <div className="flex items-start gap-2 rounded-[12px] border-2 border-[#a85d00]/25 bg-[#fff3d6] px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a85d00]" />
          <p className="text-[11px] font-medium leading-relaxed text-[#a85d00]">
            This room only has room for {capacity} more student{capacity !== 1 ? "s" : ""}. The first {capacity} valid
            rows will be imported.
          </p>
        </div>
      )}
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
  capacity,
}: {
  classification: Classification;
  showIssues: boolean;
  onToggleIssues: () => void;
  onImport: () => void;
  onBack: () => void;
  capacity: number;
}) {
  const rows = showIssues ? [...classification.attention, ...classification.duplicate] : classification.rows;
  const columns = classification.columns;
  const gridTemplate = `minmax(150px, 1.2fr) ${columns.map(() => "minmax(110px, 1fr)").join(" ")} 128px`;
  const willImport = Math.min(classification.valid.length, capacity);
  const exceedsCapacity = classification.valid.length > capacity;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-[var(--qs-ink)]">Review your students</h4>
        <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
          We validated every row — usernames, duplicates and column values. Issues are highlighted below.
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
      <div className="overflow-x-auto rounded-[14px] border-2 border-[var(--qs-line)]">
        <div className="min-w-[560px]">
          <div
            className="grid items-center gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-poly-0)] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <span>Username</span>
            {columns.map((col) => (
              <span key={col} className="truncate">
                {col}
              </span>
            ))}
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
                  "grid items-center gap-3 border-b-2 border-[var(--qs-line)] px-3 py-2.5 text-xs last:border-0",
                  r.status === "ready"
                    ? "text-[var(--qs-muted)]"
                    : r.status === "attention"
                    ? "bg-[#fff7dd]/70"
                    : "bg-[var(--qs-badbg)]/60"
                )}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <span className="min-w-0 truncate font-bold text-[var(--qs-ink)]">
                  {r.username ? `@${r.username}` : "—"}
                </span>
                {columns.map((col) => (
                  <span key={col} className="min-w-0 truncate text-[11px] font-medium text-[var(--qs-muted)]" title={r.data[col] || undefined}>
                    {r.data[col] || "—"}
                  </span>
                ))}
                <span
                  className={cn(
                    "flex items-center justify-end gap-1 text-right text-[11px] font-extrabold",
                    r.status === "ready"
                      ? "text-[var(--qs-ok)]"
                      : r.status === "attention"
                      ? "text-[#a85d00]"
                      : "text-[var(--qs-bad)]"
                  )}
                >
                  {r.status === "ready" ? (
                    <Check className="h-3 w-3 shrink-0" />
                  ) : r.status === "attention" ? (
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                  ) : (
                    <X className="h-3 w-3 shrink-0" />
                  )}
                  <span className="min-w-0 truncate">
                    {r.status === "ready" ? "Ready" : r.issue}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {classification.duplicate.length > 0 && (
        <div className="flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/25 bg-[var(--qs-badbg)] px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-bad)]" />
          <p className="text-[11px] font-medium leading-relaxed text-[var(--qs-ink)]">
            Duplicate rows (already in the room or repeated in your file) will be skipped and never imported twice.
          </p>
        </div>
      )}

      {classification.attention.length > 0 && (
        <div className="flex items-start gap-2 rounded-[12px] border-2 border-[#a85d00]/25 bg-[#fff3d6] px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a85d00]" />
          <p className="text-[11px] font-medium leading-relaxed text-[#a85d00]">
            Invalid rows are never imported. Fix the highlighted usernames or values in your file and upload again.
          </p>
        </div>
      )}

      {exceedsCapacity && (
        <div className="flex items-start gap-2 rounded-[12px] border-2 border-[#a85d00]/25 bg-[#fff3d6] px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a85d00]" />
          <p className="text-[11px] font-medium leading-relaxed text-[#a85d00]">
            This room only has room for {capacity} more student{capacity !== 1 ? "s" : ""} — only the first {capacity}{" "}
            valid row{capacity !== 1 ? "s" : ""} will be added.
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
          disabled={willImport === 0}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" />
          Import {willImport} Valid Student
          {willImport !== 1 ? "s" : ""}
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
  skippedByCapacity,
  roomName,
  viewStudentsHref,
  onDone,
}: {
  count: number;
  skippedByCapacity: number;
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
      {skippedByCapacity > 0 && (
        <p className="mt-2 rounded-[12px] border-2 border-[#a85d00]/25 bg-[#fff3d6] px-3.5 py-2 text-[11px] font-medium text-[#a85d00]">
          {skippedByCapacity} valid row{skippedByCapacity !== 1 ? "s were" : " was"} skipped — the room reached its{" "}
          {MAX_STUDENTS_PER_ROOM}-student limit.
        </p>
      )}

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
