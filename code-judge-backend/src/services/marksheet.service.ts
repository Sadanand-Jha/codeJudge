// Marksheet generation. Creates an Excel workbook (via ExcelJS) containing quiz
// results sorted by roll number, with headers, per-student rows, and a summary
// statistics sheet.
import ExcelJS from "exceljs";
import { pool } from "../app.ts";

export interface MarksheetStats {
  totalParticipants: number;
  totalSubmissions: number;
  completionRate: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  averageTimeTaken: number;
  highestPercentage: number;
}

export interface MarksheetResult {
  buffer: Buffer;
  stats: MarksheetStats;
}

/**
 * Generate marksheet Excel file for a quiz
 * Sorted by roll number ascending
 */
export async function generateMarksheet(quizId: number): Promise<MarksheetResult> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Marksheet");

  // Fetch quiz details
  const quizQuery = `
    SELECT q.*, u.username as creator_username
    FROM quiz q
    JOIN users u ON u.id = q.createdby
    WHERE q.id = $1
  `;
  const quizResult = await pool.query(quizQuery, [quizId]);
  const quiz = quizResult.rows[0];

  if (!quiz) {
    throw new Error(`Quiz not found: ${quizId}`);
  }

  // Fetch all attempts with student details, sorted by roll number
  const attemptsQuery = `
    SELECT 
      qa.*,
      u.username,
      u.email,
      u.first_name,
      u.last_name,
      c.name as college_name,
      qr.rollno
    FROM quiz_attempt qa
    JOIN users u ON u.id = qa.user_id
    LEFT JOIN college c ON c.id = u.college_id
    LEFT JOIN quiz_registration qr ON qr.user_id = qa.user_id AND qr.quiz_id = qa.quiz_id
    WHERE qa.quiz_id = $1 AND qa.status = 'completed'
    ORDER BY qr.rollno ASC NULLS LAST, u.username ASC
  `;
  const attemptsResult = await pool.query(attemptsQuery, [quizId]);
  const attempts = attemptsResult.rows;

  // Calculate stats
  const stats = calculateQuizStats(quiz, attempts);

  // Define columns
  worksheet.columns = [
    { header: "Roll Number", key: "rollno", width: 15 },
    { header: "Student Name", key: "studentName", width: 25 },
    { header: "Username", key: "username", width: 20 },
    { header: "Email", key: "email", width: 30 },
    { header: "College", key: "college", width: 30 },
    { header: "Quiz Name", key: "quizName", width: 30 },
    { header: "Quiz Code", key: "quizCode", width: 20 },
    { header: "Attempt Date", key: "attemptDate", width: 20 },
    { header: "Quiz Duration (min)", key: "quizDuration", width: 18 },
    { header: "Time Taken (min)", key: "timeTaken", width: 18 },
    { header: "Total Questions", key: "totalQuestions", width: 16 },
    { header: "Correct", key: "correct", width: 10 },
    { header: "Wrong", key: "wrong", width: 10 },
    { header: "Skipped", key: "skipped", width: 10 },
    { header: "Marks Obtained", key: "marks", width: 16 },
    { header: "Percentage", key: "percentage", width: 12 },
    { header: "Rank", key: "rank", width: 8 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEC4899" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 25;

  // Freeze header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Add data rows
  attempts.forEach((attempt, index) => {
    const row = worksheet.addRow({
      rollno: attempt.rollno || `N/A`,
      studentName: `${attempt.first_name || ""} ${attempt.last_name || ""}`.trim() || attempt.username,
      username: attempt.username,
      email: attempt.email || "",
      college: attempt.college_name || "",
      quizName: quiz.name,
      quizCode: quiz.code,
      attemptDate: formatDate(attempt.completed_at),
      quizDuration: formatDuration(quiz.duration || 0),
      timeTaken: formatDuration(attempt.time_taken || 0),
      totalQuestions: attempt.total_questions,
      correct: attempt.correct_answers,
      wrong: attempt.wrong_answers,
      skipped: attempt.skipped_questions,
      marks: attempt.score,
      percentage: `${attempt.percentage}%`,
      rank: attempt.rank || index + 1,
    });

    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0B0D12" },
      };
    }

    // Center align numeric columns
    row.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Auto-size columns
  worksheet.columns.forEach((column: any) => {
    if (column.width) {
      column.width = Math.max(column.width, 10);
    }
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    stats,
  };
}

/**
 * Calculate quiz statistics
 */
function calculateQuizStats(quiz: any, attempts: any[]): MarksheetStats {
  const totalParticipants = attempts.length;
  const totalSubmissions = attempts.filter((a) => a.status === "completed").length;
  const completionRate = totalParticipants > 0 ? ((totalSubmissions / totalParticipants) * 100) : 0;

  const marks = attempts.map((a) => a.score);
  const averageMarks = marks.length > 0 ? marks.reduce((sum, m) => sum + m, 0) / marks.length : 0;
  const highestMarks = marks.length > 0 ? Math.max(...marks) : 0;
  const lowestMarks = marks.length > 0 ? Math.min(...marks) : 0;

  const timeTaken = attempts.map((a) => a.time_taken || 0);
  const averageTimeTaken = timeTaken.length > 0 ? timeTaken.reduce((sum, t) => sum + t, 0) / timeTaken.length : 0;

  const percentages = attempts.map((a) => a.percentage);
  const highestPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;

  return {
    totalParticipants,
    totalSubmissions,
    completionRate: Math.round(completionRate * 100) / 100,
    averageMarks: Math.round(averageMarks * 100) / 100,
    highestMarks,
    lowestMarks,
    averageTimeTaken: Math.round(averageTimeTaken),
    highestPercentage: Math.round(highestPercentage * 100) / 100,
  };
}

/**
 * Format date for Excel
 */
function formatDate(date: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format duration from seconds to minutes
 */
function formatDuration(seconds: number): string {
  if (!seconds) return "0";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}