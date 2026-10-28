import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { pool } from "../config/database.ts";

export interface ResponsesReportStats {
  totalParticipants: number;
  submitted: number;
  averageCorrect: number;
  averagePercentage: number;
  highestCorrect: number;
  totalQuestions: number;
}

export interface ResponsesReportResult {
  buffer: Buffer;
  stats: ResponsesReportStats;
  registrationFields: string[];
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(moduleDir, "../../public/logo/logo-email.png");

const INK = "FF1A1240";
const BRAND = "FF6A3DF0";
const MUTED = "FF5C5679";
const LINE = "FFE0DBF5";
const SOFT = "FFF7F5FF";
const WHITE = "FFFFFFFF";
const LIGHT_ORANGE = "FFFFE8CC";
const ORANGE = "FFFFB74D";
const RED = "FFC2303A";

function statusLabel(status: string | null): string {
  const key = (status ?? "").toLowerCase();
  if (key === "completed") return "Submitted";
  if (key === "timed_out") return "Auto Submitted";
  if (key === "in_progress") return "In Progress";
  return "Not Started";
}

function formatDate(value: string | Date | null, timeZone = "UTC"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(seconds: number | string | null): string {
  const value = Number(seconds) || 0;
  if (value <= 0) return "0 min";
  return `${Math.floor(value / 60)} min`;
}

const HIDDEN_REGISTRATION_FIELDS = new Set([
  "name",
  "student name",
  "full name",
  "email",
  "email address",
  "e mail",
  "mail",
  "student email",
  "student mail",
]);

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function registrationValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function countQuizResponses(quizId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM quiz_attempt
      WHERE quiz_id = $1
        AND deleted_at IS NULL`,
    [quizId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function generateResponsesReport(quizId: number): Promise<ResponsesReportResult> {
  const quizResult = await pool.query(
    `SELECT q.id, q.name, q.code, q.registration_fields, u.username AS creator_username
       FROM quiz q
       LEFT JOIN users u ON u.id = q.createdby
      WHERE q.id = $1 AND q.deleted_at IS NULL`,
    [quizId]
  );
  const quiz = quizResult.rows[0];
  if (!quiz) throw new Error("Quiz not found");

  const rowsResult = await pool.query(
    `SELECT
        COALESCE(qr.user_id, qa.user_id) AS user_id,
        qr.rollno,
        COALESCE(qr.is_registered, false) AS is_registered,
        u.username,
        c.name AS college_name,
        qa.id AS attempt_id,
        qa.rank,
        CASE WHEN qa.id IS NULL THEN NULL ELSE
          ROW_NUMBER() OVER (PARTITION BY COALESCE(qr.user_id, qa.user_id) ORDER BY qa.created_at ASC, qa.id ASC)
        END AS attempt_number,
        qa.status AS attempt_status,
        qa.completed_at,
        qa.time_taken,
        qa.total_questions,
        qa.correct_answers,
        qa.wrong_answers,
        qa.skipped_questions,
        qa.violations,
        qa.flagged,
        qa.flag_reason,
        qa.registration_data
      FROM quiz_registration qr
      FULL OUTER JOIN quiz_attempt qa
        ON qa.quiz_id = qr.quiz_id AND qa.user_id = qr.user_id AND qa.deleted_at IS NULL
      JOIN users u ON u.id = COALESCE(qr.user_id, qa.user_id)
      LEFT JOIN college c ON c.id = u.college_id
      WHERE COALESCE(qr.quiz_id, qa.quiz_id) = $1
        AND (qa.id IS NOT NULL OR qr.is_registered = true)
      ORDER BY qa.correct_answers DESC NULLS LAST, qa.time_taken ASC NULLS LAST, qr.rollno ASC NULLS LAST, u.username ASC`,
    [quizId]
  );
  const rows = rowsResult.rows;

  const configuredFields: string[] = Array.isArray(quiz.registration_fields)
    ? quiz.registration_fields.filter((field: unknown): field is string => typeof field === "string" && field.trim().length > 0)
    : [];
  const discoveredFields = new Set<string>();
  rows.forEach((row) => {
    const data = row.registration_data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      Object.keys(data).forEach((key) => discoveredFields.add(key));
    }
  });
  const registrationFields = [
    ...configuredFields,
    ...[...discoveredFields].filter((field) => !configuredFields.includes(field)),
  ].filter((field) => !HIDDEN_REGISTRATION_FIELDS.has(normalizeFieldName(field)));
  const hasRollNumberField = registrationFields.some((field) =>
    ["roll number", "roll no", "rollno", "enrollment number", "enrollment no"].includes(normalizeFieldName(field))
  );

  const participantRows = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    const userId = Number(row.user_id);
    if (!Number.isInteger(userId)) continue;
    const current = participantRows.get(userId);
    if (!current) {
      participantRows.set(userId, row);
      continue;
    }

    const currentCompleted = String(current.attempt_status ?? "").toLowerCase() === "completed";
    const nextCompleted = String(row.attempt_status ?? "").toLowerCase() === "completed";
    if (nextCompleted !== currentCompleted) {
      if (nextCompleted) participantRows.set(userId, row);
      continue;
    }

    const currentCorrect = current.attempt_id === null ? -1 : Number(current.correct_answers) || 0;
    const nextCorrect = row.attempt_id === null ? -1 : Number(row.correct_answers) || 0;
    const currentTime = current.attempt_id === null ? Infinity : Number(current.time_taken) || Infinity;
    const nextTime = row.attempt_id === null ? Infinity : Number(row.time_taken) || Infinity;
    if (nextCorrect > currentCorrect || (nextCorrect === currentCorrect && nextTime < currentTime)) {
      participantRows.set(userId, row);
    }
  }
  const participants = [...participantRows.values()];

  const scored = participants.filter(
    (row) => row.attempt_id !== null && row.correct_answers !== null && row.correct_answers !== undefined
  );
  const totalQuestions = rows.reduce((max, row) => Math.max(max, Number(row.total_questions) || 0), 0);
  const averageCorrect = scored.length
    ? scored.reduce((sum, row) => sum + (Number(row.correct_answers) || 0), 0) / scored.length
    : 0;
  const averagePercentage = scored.length
    ? (scored.reduce((sum, row) => {
        const questions = Number(row.total_questions) || 0;
        if (questions <= 0) return sum;
        return sum + ((Number(row.correct_answers) || 0) / questions) * 100;
      }, 0) / scored.length)
    : 0;
  const highestCorrect = scored.length
    ? Math.max(...scored.map((row) => Number(row.correct_answers) || 0))
    : 0;
  const submitted = participants.filter((row) => String(row.attempt_status ?? "").toLowerCase() === "completed").length;
  const flaggedUsers = new Set(
    rows
      .filter((row) => Number(row.violations) > 0)
      .map((row) => Number(row.user_id))
      .filter((userId) => Number.isInteger(userId))
  );
  const flaggedCount = flaggedUsers.size;

  const stats: ResponsesReportStats = {
    totalParticipants: participants.length,
    submitted,
    averageCorrect: Math.round(averageCorrect * 100) / 100,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    highestCorrect,
    totalQuestions,
  };

  const columns: Array<{ header: string; key: string; width: number }> = [
    { header: "Rank", key: "rank", width: 8 },
    ...(hasRollNumberField ? [] : [{ header: "Roll Number", key: "rollno", width: 16 }]),
    { header: "Username", key: "username", width: 22 },
    { header: "College", key: "college", width: 28 },
    ...registrationFields.map((field, index) => ({
      header: field,
      key: `registration_${index}`,
      width: Math.max(16, Math.min(40, field.length + 6)),
    })),
    { header: "Status", key: "status", width: 16 },
    { header: "No. of Flags", key: "flags", width: 12 },
    { header: "Flag Reason", key: "flagReason", width: 38 },
    { header: "Submitted At", key: "submittedAt", width: 20 },
    { header: "Time Taken", key: "timeTaken", width: 13 },
    { header: "Total Questions", key: "totalQuestions", width: 15 },
    { header: "Correct", key: "correct", width: 10 },
    { header: "Wrong", key: "wrong", width: 10 },
    { header: "Skipped", key: "skipped", width: 10 },
    { header: "Percentage", key: "percentage", width: 13 },
  ];
  const lastColumn = columns.length;
  const headerRow = 7;
  const firstDataRow = 8;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QuizSupport";
  workbook.lastModifiedBy = "QuizSupport";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = `Responses report - ${quiz.name}`;
  workbook.subject = "Quiz responses report";

  const worksheet = workbook.addWorksheet("Responses", {
    properties: { tabColor: { argb: BRAND } },
    views: [{ state: "frozen", xSplit: 3, ySplit: headerRow }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    headerFooter: {
      oddFooter: "&LQuizSupport&CResponses report&RPage &P of &N",
    },
  });

  worksheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));

  if (fs.existsSync(LOGO_PATH)) {
    const logoId = workbook.addImage({ filename: LOGO_PATH, extension: "png" });
    worksheet.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 130, height: 26 },
      editAs: "oneCell",
    });
  }

  worksheet.mergeCells(1, 1, 1, 2);
  worksheet.mergeCells(1, 3, 1, lastColumn);
  const userCell = worksheet.getCell(1, 3);
  userCell.value = `@${quiz.creator_username || "creator"}`;
  userCell.font = { bold: true, size: 11, color: { argb: MUTED } };
  userCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  worksheet.getRow(1).height = 38;

  worksheet.mergeCells(2, 1, 2, lastColumn);
  const titleCell = worksheet.getCell(2, 1);
  titleCell.value = quiz.name;
  titleCell.font = { bold: true, size: 18, color: { argb: INK } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(2).height = 28;

  worksheet.mergeCells(3, 1, 3, lastColumn);
  const metaCell = worksheet.getCell(3, 1);
  metaCell.value = `Code ${quiz.code}   |   ${stats.totalParticipants} participants   |   ${stats.submitted} submitted   |   Generated ${formatDate(new Date())}`;
  metaCell.font = { size: 10, color: { argb: MUTED } };
  metaCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(3).height = 18;
  worksheet.getRow(4).height = 8;

  const tiles = [
    { label: "TOTAL STUDENTS", value: String(stats.totalParticipants) },
    { label: "SUBMITTED", value: String(stats.submitted) },
    { label: "AVERAGE CORRECT", value: `${stats.averageCorrect} / ${stats.totalQuestions}` },
    { label: "AVERAGE ACCURACY", value: `${stats.averagePercentage}%` },
    { label: "FLAGGED ATTEMPTS", value: String(flaggedCount) },
  ];
  tiles.forEach((tile, index) => {
    const start = Math.floor((index * lastColumn) / tiles.length) + 1;
    const end = Math.floor(((index + 1) * lastColumn) / tiles.length);
    if (end > start) worksheet.mergeCells(5, start, 5, end);
    const cell = worksheet.getCell(5, start);
    cell.value = {
      richText: [
        { font: { bold: true, size: 9, color: { argb: MUTED } }, text: `${tile.label}\n` },
        { font: { bold: true, size: 16, color: { argb: INK } }, text: tile.value },
      ],
    };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SOFT } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  });
  worksheet.getRow(5).height = 44;
  worksheet.getRow(6).height = 8;

  columns.forEach((column, index) => {
    const cell = worksheet.getCell(headerRow, index + 1);
    cell.value = column.header;
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: INK } },
      left: { style: "thin", color: { argb: INK } },
      bottom: { style: "medium", color: { argb: INK } },
      right: { style: "thin", color: { argb: INK } },
    };
  });
  worksheet.getRow(headerRow).height = 30;

  const centeredKeys = new Set([
    "rank",
    "rollno",
    "status",
    "flags",
    "submittedAt",
    "timeTaken",
    "totalQuestions",
    "correct",
    "wrong",
    "skipped",
    "percentage",
  ]);

  rows.forEach((row, index) => {
    const registrationData = row.registration_data && typeof row.registration_data === "object" && !Array.isArray(row.registration_data)
      ? row.registration_data as Record<string, unknown>
      : {};
    const totalQuestionsValue = Number(row.total_questions) || 0;
    const correct = Number(row.correct_answers) || 0;
    const flags = Number(row.violations) > 0 ? Number(row.violations) : row.flagged || row.flag_reason ? 1 : 0;
    const reason = row.flag_reason ? String(row.flag_reason) : flags > 0 ? "—" : "";

    const values: Record<string, string | number> = {
      rank: Number(row.rank) || index + 1,
      rollno: row.rollno || "",
      username: row.username
        ? Number(row.attempt_number) > 1
          ? `${row.username}#${row.attempt_number}`
          : row.username
        : "",
      college: row.college_name || "",
      status: statusLabel(row.attempt_status),
      flags,
      flagReason: reason,
      submittedAt: formatDate(row.completed_at),
      timeTaken: formatMinutes(row.time_taken),
      totalQuestions: totalQuestionsValue,
      correct,
      wrong: Number(row.wrong_answers) || 0,
      skipped: Number(row.skipped_questions) || 0,
      percentage: totalQuestionsValue > 0 ? Math.round((correct / totalQuestionsValue) * 10000) / 100 : "",
    };
    registrationFields.forEach((field, fieldIndex) => {
      values[`registration_${fieldIndex}`] = registrationValue(registrationData[field]);
    });

    const excelRow = worksheet.getRow(firstDataRow + index);
    columns.forEach((column, columnIndex) => {
      const cell = worksheet.getCell(firstDataRow + index, columnIndex + 1);
      cell.value = values[column.key];
      cell.font = { size: 10, color: { argb: INK } };
      cell.alignment = {
        vertical: "middle",
        horizontal: centeredKeys.has(column.key) ? "center" : "left",
        wrapText: column.key === "flagReason",
      };
      cell.border = {
        top: { style: "thin", color: { argb: LINE } },
        left: { style: "thin", color: { argb: LINE } },
        bottom: { style: "thin", color: { argb: LINE } },
        right: { style: "thin", color: { argb: LINE } },
      };
      if (column.key === "percentage" && typeof values[column.key] === "number") {
        cell.numFmt = '0.0"%"';
      }
    });

    let rowFill: string | null = null;
    if (flags >= 3) rowFill = RED;
    else if (flags === 2) rowFill = ORANGE;
    else if (flags === 1) rowFill = LIGHT_ORANGE;
    else if (index % 2 === 1) rowFill = SOFT;

    if (rowFill) {
      const isRed = flags >= 3;
      columns.forEach((column, columnIndex) => {
        const cell = worksheet.getCell(firstDataRow + index, columnIndex + 1);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill as string } };
        if (isRed) {
          cell.font = { size: 10, color: { argb: WHITE } };
        }
      });
    }

    excelRow.height = reason.length > 40 ? 30 : 20;
  });

  const lastDataRow = firstDataRow + rows.length - 1;
  if (rows.length > 0) {
    worksheet.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: lastDataRow, column: lastColumn },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    registrationFields,
    stats,
  };
}
