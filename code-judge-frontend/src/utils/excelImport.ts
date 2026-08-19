import * as XLSX from "xlsx";
import { normalizeHeader, parseCsvLine } from "./studentCsv";

/**
 * Excel / CSV student import helpers.
 *
 * The import workflow is guided: the teacher first sees the required schema,
 * uploads a file, confirms the column mapping, reviews validation, then
 * imports. Nothing is imported silently — every row is classified first.
 */

export interface ExcelSheetData {
  sheetName: string;
  headers: string[];
  rows: string[][];
}

export interface ColumnMapping {
  name: string | null;
  roll: string | null;
  email: string | null;
}

const REQUIRED_COLUMNS = ["Name", "Roll Number", "Email ID"] as const;

const KEYWORDS: Record<ColumnKey, string[]> = {
  name: ["name", "student", "full name"],
  roll: ["roll", "reg", "enrollment", "id"],
  email: ["email"],
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
    email: pickHeader(headers, KEYWORDS.email),
  };
}

export function missingColumns(mapping: ColumnMapping): ColumnKey[] {
  return (Object.keys(KEYWORDS) as ColumnKey[]).filter((k) => !mapping[k]);
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

/** Extract a name/roll/email row per data row using the confirmed mapping. */
export function extractRows(
  data: ExcelSheetData,
  mapping: ColumnMapping
): Array<{ name: string; rollNumber: string; email: string }> {
  const colIndex = (name: string | null) => (name ? data.headers.indexOf(name) : -1);
  const iName = colIndex(mapping.name);
  const iRoll = colIndex(mapping.roll);
  const iEmail = colIndex(mapping.email);
  return data.rows.map((row) => ({
    name: iName >= 0 ? row[iName] ?? "" : "",
    rollNumber: iRoll >= 0 ? row[iRoll] ?? "" : "",
    email: iEmail >= 0 ? row[iEmail] ?? "" : "",
  }));
}

export interface ImportedStudentRow {
  name: string;
  rollNumber: string;
  email: string;
  status: "ready" | "attention" | "duplicate";
  issue?: string;
}

export interface Classification {
  rows: ImportedStudentRow[];
  valid: ImportedStudentRow[];
  attention: ImportedStudentRow[];
  duplicate: ImportedStudentRow[];
}

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Classify every imported row. Checks required fields, email validity and
 * duplicates (within the file and against students already in the room).
 */
export function classifyImportedRows(
  raw: Array<{ name: string; rollNumber: string; email: string }>,
  existingRolls: string[]
): Classification {
  const existing = new Set(existingRolls.map((r) => r.toLowerCase()));
  const seenRoll = new Set<string>();
  const seenEmail = new Set<string>();
  const rows: ImportedStudentRow[] = [];

  for (const r of raw) {
    const name = r.name?.trim() ?? "";
    const roll = r.rollNumber?.trim() ?? "";
    const email = r.email?.trim().toLowerCase() ?? "";
    let status: ImportedStudentRow["status"] = "ready";
    let issue: string | undefined;

    if (!name) {
      status = "attention";
      issue = "Missing Name";
    } else if (!roll) {
      status = "attention";
      issue = "Missing Roll Number";
    } else if (existing.has(roll.toLowerCase())) {
      status = "duplicate";
      issue = "Already in this room";
    } else if (seenRoll.has(roll.toLowerCase())) {
      status = "duplicate";
      issue = "Duplicate Roll Number";
    } else if (email && !VALID_EMAIL.test(email)) {
      status = "attention";
      issue = "Invalid Email";
    } else if (email && seenEmail.has(email)) {
      status = "duplicate";
      issue = "Duplicate Email";
    }

    if (roll) seenRoll.add(roll.toLowerCase());
    if (email && VALID_EMAIL.test(email)) seenEmail.add(email);

    rows.push({ name, rollNumber: roll, email, status, issue });
  }

  return {
    rows,
    valid: rows.filter((r) => r.status === "ready"),
    attention: rows.filter((r) => r.status === "attention"),
    duplicate: rows.filter((r) => r.status === "duplicate"),
  };
}

/** Download a preformatted .xlsx template with a Students + Instructions sheet. */
export function downloadExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const students = XLSX.utils.aoa_to_sheet([
    ["Name", "Roll Number", "Email ID"],
    ["Rahul Kumar", "23CSE1042", "rahul@gmail.com"],
    ["Priya Singh", "23CSE1043", "priya@gmail.com"],
    ["Aman Sharma", "23CSE1044", "aman@gmail.com"],
    ["", "", ""],
    ["", "", ""],
  ]);
  students["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, students, "Students");

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Excel Import — Instructions"],
    [""],
    ["Your Excel file must contain these 3 columns:"],
    ["1. Name — Student's full name (e.g. Rahul Kumar)"],
    ["2. Roll Number — Student's unique college/school roll number (e.g. 23CSE1042)"],
    ["3. Email ID — Student's valid email address (e.g. rahul@gmail.com)"],
    [""],
    ["Rules:"],
    ["• The first row must contain the column names."],
    ["• Each subsequent row represents one student."],
    ["• Do not merge cells. Keep one student per row."],
    ["• Roll numbers should be unique within the room."],
    ["• Email addresses should be valid."],
    ["• Avoid completely empty rows."],
  ]);
  instructions["!cols"] = [{ wch: 72 }];
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");

  XLSX.writeFile(wb, "student-import-template.xlsx");
}

/**
 * Export a room's students to a .xlsx file for backup/sharing. Each row is one
 * student (Name | Roll Number | Email ID).
 */
export function exportStudentsToFile(
  fileName: string,
  students: Array<{ name: string; rollNumber: string; email: string }>
): void {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Name", "Roll Number", "Email ID"],
    ...students.map((s) => [s.name, s.rollNumber, s.email]),
  ]);
  sheet["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, sheet, "Students");
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}

export { REQUIRED_COLUMNS };