import * as XLSX from "xlsx";
import { normalizeHeader, parseCsvLine } from "./studentCsv";
import {
  MAX_CELL_LENGTH,
  MAX_HEADER_LENGTH,
  MAX_IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  findUnsafeValueReason,
  isUsernameHeader,
  normalizeColumnKey,
  sanitizeColumnName,
  sanitizeImportValue,
  validateUsername,
} from "./importValidation";

/**
 * Excel / CSV student import helpers.
 *
 * The first column must be the Username column. Every additional column is a
 * teacher-defined field (Roll Number, Branch, Year, …) that is stored together
 * with the student's room membership — mirroring how quiz registration fields
 * are stored. Limits: 15 columns (including Username) and 200 data rows.
 */

export interface ExcelSheetData {
  sheetName: string;
  /** Sanitized column names — index 0 is always the Username column. */
  headers: string[];
  /** Sanitized rows; each row aligns with `headers`. */
  rows: string[][];
}

export const REQUIRED_COLUMNS = ["Username"] as const;

/** Name/roll are detected among the custom columns for display purposes. */
const KEYWORDS = {
  name: ["name", "student", "full name"],
  roll: ["roll", "reg", "enrollment", "id"],
};

export function isSupportedImportFile(fileName: string): boolean {
  return /\.(xlsx|xls|csv|txt)$/i.test(fileName);
}

export function importFileLabel(fileName: string): string {
  return /\.(xlsx|xls)$/i.test(fileName) ? "Excel" : "CSV";
}

/** Pick the column index that best matches a set of keywords. */
function pickColumnIndex(headers: string[], keys: string[]): number {
  return headers.findIndex((h) => {
    const n = normalizeHeader(h);
    return keys.some((k) => n === k || n.startsWith(`${k} `) || n.includes(k));
  });
}

/**
 * Parse the first sheet (or the whole CSV text) into a normalized header +
 * rows matrix. The first non-empty row is the header row.
 *
 * Validation performed here (all rows/columns are validated before the review
 * step ever sees them):
 *   - column count ≤ MAX_IMPORT_COLUMNS, row count ≤ MAX_IMPORT_ROWS
 *   - first column must be the Username column
 *   - column names: non-empty, unique, ≤ MAX_HEADER_LENGTH, no unsafe content
 */
export async function parseImportFile(file: File): Promise<ExcelSheetData> {
  const lower = file.name.toLowerCase();

  if (/\.(xlsx|xls)$/.test(lower)) {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("The workbook has no sheets.");
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: "" });
    return matrixToSheet(matrix, sheetName);
  }

  // CSV / text
  const text = await file.text();
  const rawLines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) throw new Error("The file appears to be empty.");
  const matrix = rawLines.map((l) => parseCsvLine(l));
  return matrixToSheet(matrix, file.name);
}

function matrixToSheet(matrix: unknown[][], sheetName: string): ExcelSheetData {
  const firstRow = matrix.findIndex((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""));
  if (firstRow < 0) throw new Error("The sheet appears to be empty.");

  const rawHeaders = (matrix[firstRow] ?? []).map((c) => sanitizeColumnName(c));
  let lastHeaderIdx = -1;
  for (let i = 0; i < rawHeaders.length; i++) {
    if (rawHeaders[i] !== "") lastHeaderIdx = i;
  }
  if (lastHeaderIdx < 0) throw new Error("The first row should contain the column names.");

  const headers: string[] = [];
  for (let i = 0; i <= lastHeaderIdx; i++) {
    const name = rawHeaders[i];
    if (!name) throw new Error(`Column ${i + 1} is missing a name. Give every column a header.`);
    if (name.length > MAX_HEADER_LENGTH) {
      throw new Error(`Column name “${name.slice(0, 24)}…” is too long — keep it under ${MAX_HEADER_LENGTH} characters.`);
    }
    const unsafe = findUnsafeValueReason(name);
    if (unsafe) throw new Error(`Column name “${name}” contains ${unsafe}. Rename the column and try again.`);
    headers.push(name);
  }

  if (headers.length > MAX_IMPORT_COLUMNS) {
    throw new Error(
      `The file has ${headers.length} columns — the maximum is ${MAX_IMPORT_COLUMNS}. Remove extra columns and try again.`
    );
  }

  if (!isUsernameHeader(headers[0])) {
    throw new Error(
      `The first column must be the Username column. Found “${headers[0]}” instead — move Username to the first column.`
    );
  }

  const seen = new Map<string, string>();
  for (const h of headers) {
    const key = normalizeColumnKey(h);
    const prev = seen.get(key);
    if (prev !== undefined) {
      throw new Error(`Duplicate column name “${h}”. Every column must have a unique name.`);
    }
    seen.set(key, h);
  }

  const rows = matrix
    .slice(firstRow + 1)
    .filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""))
    .map((r) => headers.map((_, i) => sanitizeImportValue((r ?? [])[i])));

  if (rows.length === 0) throw new Error("The sheet has no data rows below the header.");

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `The sheet has ${rows.length} rows — the maximum is ${MAX_IMPORT_ROWS}. Trim the file and try again.`
    );
  }

  return { sheetName, headers, rows };
}

export interface ImportedStudentRow {
  name: string;
  rollNumber: string;
  username: string;
  /** Values for the teacher-defined columns, keyed by column name. */
  data: Record<string, string>;
  status: "ready" | "attention" | "duplicate";
  issue?: string;
}

export interface Classification {
  rows: ImportedStudentRow[];
  valid: ImportedStudentRow[];
  attention: ImportedStudentRow[];
  duplicate: ImportedStudentRow[];
  /** Custom (non-username) columns the rows were built from, in sheet order. */
  columns: string[];
}

/**
 * Classify every imported row. The first column is the username (required);
 * name/roll are detected among the custom columns and derived from the
 * username if missing. Every custom value is scanned for unsafe payloads and
 * over-length values before a row can be marked ready.
 */
export function classifyImportedRows(
  sheet: ExcelSheetData,
  existingKeys: string[],
  options?: { excludedColumns?: string[] }
): Classification {
  const excluded = new Set((options?.excludedColumns ?? []).map((c) => normalizeColumnKey(c)));
  const columns = sheet.headers.slice(1).filter((h) => !excluded.has(normalizeColumnKey(h)));
  const columnIdx = columns.map((h) => sheet.headers.indexOf(h));
  const nameIdx = pickColumnIndex(columns, KEYWORDS.name);
  const rollIdx = pickColumnIndex(columns, KEYWORDS.roll);

  const existing = new Set(existingKeys.map((k) => k.toLowerCase()));
  const seenUsername = new Set<string>();
  const rows: ImportedStudentRow[] = [];

  for (const row of sheet.rows) {
    const check = validateUsername(row[0] ?? "");
    const username = check.value;

    const data: Record<string, string> = {};
    columns.forEach((col, i) => {
      const value = row[columnIdx[i]] ?? "";
      if (value) data[col] = value;
    });

    const nameFromColumn = nameIdx >= 0 ? row[sheet.headers.indexOf(columns[nameIdx])] : "";
    const rollFromColumn = rollIdx >= 0 ? row[sheet.headers.indexOf(columns[rollIdx])] : "";
    const name = nameFromColumn || username;
    const roll = rollFromColumn || username;

    let status: ImportedStudentRow["status"] = "ready";
    let issue: string | undefined;

    if (!username) {
      status = "attention";
      issue = "Missing Username";
    } else if (!check.ok) {
      status = "attention";
      issue = check.error ?? "Invalid Username";
    } else if (seenUsername.has(username)) {
      status = "duplicate";
      issue = "Duplicate Username";
    } else if (existing.has(username)) {
      status = "duplicate";
      issue = "Already in this room";
    } else {
      for (const col of columns) {
        const value = data[col];
        if (!value) continue;
        if (value.length > MAX_CELL_LENGTH) {
          status = "attention";
          issue = `Value in “${col}” exceeds ${MAX_CELL_LENGTH} characters`;
          break;
        }
        const unsafe = findUnsafeValueReason(value);
        if (unsafe) {
          status = "attention";
          issue = `${unsafe} in “${col}”`;
          break;
        }
      }
    }

    if (check.ok && status !== "duplicate") seenUsername.add(username);

    rows.push({ name, rollNumber: roll, username, data, status, issue });
  }

  return {
    rows,
    valid: rows.filter((r) => r.status === "ready"),
    attention: rows.filter((r) => r.status === "attention"),
    duplicate: rows.filter((r) => r.status === "duplicate"),
    columns,
  };
}

/** Download a preformatted .xlsx template — Username first, sample fields after. */
export function downloadExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const exampleHeaders = ["Username", "Roll Number", "Branch", "Year"];
  const students = XLSX.utils.aoa_to_sheet([
    exampleHeaders,
    ["rahul.kumar42", "23CSE1042", "Computer Science", "3"],
    ["priya.singh43", "23CSE1043", "Computer Science", "3"],
    ["aman.sharma44", "23CSE1044", "Electrical", "2"],
    [""],
    [""],
  ]);
  students["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, students, "Students");

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Excel Import — Instructions"],
    [""],
    ["Column 1 must be Username. Every other column is saved with the student."],
    [""],
    ["Rules:"],
    ["• The first column must be the Username column (required)."],
    ["• Add up to 14 more columns — Roll Number, Branch, Year, Section, anything"],
    ["  you want stored with the student's membership (max 15 columns total)."],
    ["• Maximum 200 students (rows) per file."],
    ["• Column names must be unique and under 60 characters."],
    ["• Usernames: 2-30 characters — letters, numbers, ., _, - only."],
    ["• Values are stored as plain text: no formulas (=, +, @), no HTML or scripts."],
    ["• Duplicates (already in the room or repeated in the file) are skipped."],
    ["• Do not merge cells. Keep one student per row. Avoid empty rows."],
  ]);
  instructions["!cols"] = [{ wch: 78 }];
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");

  XLSX.writeFile(wb, "student-import-template.xlsx");
}

/**
 * Export a room's students — Username first, followed by every custom column
 * found on the members, so imported data round-trips.
 */
export function exportStudentsToFile(
  fileName: string,
  students: Array<{ username?: string; rollNumber?: string; data?: Record<string, string> }>
): void {
  const columns: string[] = [];
  for (const s of students) {
    for (const key of Object.keys(s.data ?? {})) {
      if (!columns.includes(key)) columns.push(key);
    }
  }

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Username", ...columns],
    ...students.map((s) => [
      s.username ?? s.rollNumber ?? "",
      ...columns.map((c) => s.data?.[c] ?? ""),
    ]),
  ]);
  sheet["!cols"] = [{ wch: 24 }, ...columns.map(() => ({ wch: 18 }))];
  XLSX.utils.book_append_sheet(wb, sheet, "Students");
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
