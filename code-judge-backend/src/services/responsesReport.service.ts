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

function statusLabel(status: string | null): string {
  const key = (status ?? "").toLowerCase();
  if (key === "completed") return "Submitted";
  if (key === "timed_out") return "Auto Submitted";
  if (key === "in_progress") return "In Progress";
  return "Not Started";
}

function formatDate(value: string | Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
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

function registrationValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function generateResponsesReport(quizId: number): Promise<ResponsesReportResult> {
  const quizResult = await pool.query(
    `SELECT id, name, code, registration_fields
       FROM quiz
      WHERE id = $1 AND deleted_at IS NULL`,
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
        u.email,
        u.first_name,
        u.last_name,
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
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Responses");

  worksheet.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Roll Number", key: "rollno", width: 16 },
    { header: "Student Name", key: "studentName", width: 26 },
    { header: "Username", key: "username", width: 20 },
    { header: "Email", key: "email", width: 30 },
    { header: "College", key: "college", width: 28 },
    ...registrationFields.map((field, index) => ({
      header: field,
      key: `registration_${index}`,
      width: Math.max(16, Math.min(40, field.length + 6)),
    })),
    { header: "Attempt", key: "attemptNumber", width: 10 },
    { header: "Status", key: "status", width: 16 },
    { header: "Submitted At", key: "submittedAt", width: 20 },
    { header: "Time Taken", key: "timeTaken", width: 14 },
    { header: "Total Questions", key: "totalQuestions", width: 16 },
    { header: "Correct", key: "correct", width: 10 },
    { header: "Wrong", key: "wrong", width: 10 },
    { header: "Skipped", key: "skipped", width: 10 },
    { header: "Percentage", key: "percentage", width: 12 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEC4899" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 25;
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((row, index) => {
    const registrationData = row.registration_data && typeof row.registration_data === "object" && !Array.isArray(row.registration_data)
      ? row.registration_data as Record<string, unknown>
      : {};
    const totalQuestions = Number(row.total_questions) || 0;
    const correct = Number(row.correct_answers) || 0;
    const values: Record<string, string | number> = {
      rank: Number(row.rank) || index + 1,
      rollno: row.rollno || "",
      studentName: `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "",
      username: row.username || "",
      email: row.email || "",
      college: row.college_name || "",
      attemptNumber: row.attempt_number || "",
      status: statusLabel(row.attempt_status),
      submittedAt: formatDate(row.completed_at),
      timeTaken: formatMinutes(row.time_taken),
      totalQuestions,
      correct,
      wrong: Number(row.wrong_answers) || 0,
      skipped: Number(row.skipped_questions) || 0,
      percentage: totalQuestions > 0 ? `${Math.round((correct / totalQuestions) * 10000) / 100}%` : "",
    };
    registrationFields.forEach((field, fieldIndex) => {
      values[`registration_${fieldIndex}`] = registrationValue(registrationData[field]);
    });
    worksheet.addRow(values);
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const scored = rows.filter((row) => row.attempt_id !== null);
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

  return {
    buffer: Buffer.from(buffer),
    registrationFields,
    stats: {
      totalParticipants: rows.length,
      submitted: rows.filter((row) => String(row.attempt_status ?? "").toLowerCase() === "completed").length,
      averageCorrect: Math.round(averageCorrect * 100) / 100,
      averagePercentage: Math.round(averagePercentage * 100) / 100,
      highestCorrect,
      totalQuestions,
    },
  };
}
