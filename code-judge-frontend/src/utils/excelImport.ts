import * as XLSX from "xlsx";
import { normalizeHeader, parseCsvLine } from "./studentCsv";

/**
 * Excel / CSV student import helpers — username-only mode.
 * Only Username is required; Name/Roll are optional and derived from username if missing.
 */

export interface ExcelSheetData {
  sheetName: string;
  headers: string[];
  rows: string[][];
}

export interface ColumnMapping {
  name: string | null;
  roll: string | null;
  username: string | null;
}

const REQUIRED_COLUMNS = ["Username"] as const;

const KEYWORDS: Record<ColumnKey, string[]> = {
  name: ["name", "student", "full name"],
  roll: ["roll", "reg", "enrollment", "id"],
  username: ["username", "user", "handle"],
};

export type ColumnKey = keyof ColumnMapping;

export function isSupportedImportFile(fileName: string): boolean {
  return /\.(xlsx|xls|csv|txt)$/i.test(fileName);
}

export function importFileLabel(fileName: string): string {
  return /\.(xlsx|xls)$/i.test(fileName) ? "Excel" : "CSV";
}

/** Pick the header that best matches a set of keywords (case/space-insensitive). */
function pickHeader(headers: string[], keys: string[]): string | null {
  const idx = headers.findIndex((h) => {
    const n = normalizeHeader(h);
    return keys.some((k) => n === k || n.startsWith(`${k} `) || n.includes(k));
  });
  return idx >= 0 ? headers[idx] : null;
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  return {
    name: pickHeader(headers, KEYWORDS.name),
    roll: pickHeader(headers, KEYWORDS.roll),
    username: pickHeader(headers, KEYWORDS.username),
  };
}

export function missingColumns(mapping: ColumnMapping): ColumnKey[] {
  // Only username is truly required — name/roll are optional (derived)
  return !mapping.username ? ["username"] : [];
}

/**
 * Parse the first sheet (or the whole CSV text) into a normalized header +
 * rows matrix. The first non-empty row is treated as the header row.
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

  const headers = (matrix[firstRow] ?? []).map((c) => String(c).trim()).filter(Boolean);
  if (headers.length === 0) throw new Error("The first row should contain the column names.");

  const rows = matrix
    .slice(firstRow + 1)
    .filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""))
    .map((r) => (r ?? []).map((c) => String(c).trim()));

  return { sheetName, headers, rows };
}

/** Extract a name/roll/username row per data row using the confirmed mapping. */
export function extractRows(
  data: ExcelSheetData,
  mapping: ColumnMapping
): Array<{ name: string; rollNumber: string; username: string }> {
  const colIndex = (name: string | null) => (name ? data.headers.indexOf(name) : -1);
  const iName = colIndex(mapping.name);
  const iRoll = colIndex(mapping.roll);
  const iUsername = colIndex(mapping.username);
  return data.rows.map((row) => ({
    name: iName >= 0 ? row[iName] ?? "" : "",
    rollNumber: iRoll >= 0 ? row[iRoll] ?? "" : "",
    username: iUsername >= 0 ? row[iUsername] ?? "" : "",
  }));
}

export interface ImportedStudentRow {
  name: string;
  rollNumber: string;
  username: string;
  status: "ready" | "attention" | "duplicate";
  issue?: string;
}

export interface Classification {
  rows: ImportedStudentRow[];
  valid: ImportedStudentRow[];
  attention: ImportedStudentRow[];
  duplicate: ImportedStudentRow[];
}

const VALID_USERNAME = /^[a-zA-Z0-9._-]{2,30}$/;

/**
 * Classify every imported row. Only username is required; name/roll are
 * derived from username if missing. Checks username validity and duplicates.
 */
export function classifyImportedRows(
  raw: Array<{ name: string; rollNumber: string; username: string }>,
  existingRolls: string[]
): Classification {
  const existing = new Set(existingRolls.map((r) => r.toLowerCase()));
  const seenUsername = new Set<string>();
  const rows: ImportedStudentRow[] = [];

  for (const r of raw) {
    const username = r.username?.trim().toLowerCase() ?? "";
    // Derive name/roll from username if not provided — keeps RoomStudent valid
    const name = r.name?.trim() || username;
    const roll = r.rollNumber?.trim() || username;
    let status: ImportedStudentRow["status"] = "ready";
    let issue: string | undefined;

    if (!username) {
      status = "attention";
      issue = "Missing Username";
    } else if (!VALID_USERNAME.test(username)) {
      status = "attention";
      issue = "Invalid Username";
    } else if (seenUsername.has(username)) {
      status = "duplicate";
      issue = "Duplicate Username";
    } else if (existing.has(username)) {
      // If existing Roll is username (username-only mode) treat as duplicate
      status = "duplicate";
      issue = "Already in this room";
    }

    if (username && VALID_USERNAME.test(username)) seenUsername.add(username);

    rows.push({ name, rollNumber: roll, username, status, issue });
  }

  return {
    rows,
    valid: rows.filter((r) => r.status === "ready"),
    attention: rows.filter((r) => r.status === "attention"),
    duplicate: rows.filter((r) => r.status === "duplicate"),
  };
}

/** Download a preformatted .xlsx template — username-only. */
export function downloadExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const students = XLSX.utils.aoa_to_sheet([
    ["Username"],
    ["rahul.kumar42"],
    ["priya.singh43"],
    ["aman.sharma44"],
    [""],
    [""],
  ]);
  students["!cols"] = [{ wch: 30 }];
  XLSX.utils.book_append_sheet(wb, students, "Students");

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Excel Import — Instructions"],
    [""],
    ["Your Excel file must contain a Username column."],
    ["Username — Student's unique username (e.g. rahul.kumar42)"],
    ["Optional: Name, Roll Number will be derived from username if omitted."],
    [""],
    ["Rules:"],
    ["• The first row must contain the column name 'Username'."],
    ["• Each subsequent row represents one student (one username)."],
    ["• Do not merge cells. Keep one student per row."],
    ["• Usernames should be 2-30 chars: letters, numbers, ., _, -."],
    ["• Duplicates (already in room or repeated in file) are skipped."],
    ["• Avoid completely empty rows."],
  ]);
  instructions["!cols"] = [{ wch: 72 }];
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");

  XLSX.writeFile(wb, "student-import-template.xlsx");
}

/**
 * Export a room's students — username-only for privacy.
 */
export function exportStudentsToFile(
  fileName: string,
  students: Array<{ name: string; rollNumber: string; username: string }>
): void {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Username"],
    ...students.map((s) => [s.username]),
  ]);
  sheet["!cols"] = [{ wch: 30 }];
  XLSX.utils.book_append_sheet(wb, sheet, "Students");
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}

export { REQUIRED_COLUMNS };
