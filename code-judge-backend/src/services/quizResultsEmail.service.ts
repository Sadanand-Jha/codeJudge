import { pool } from "../config/database.ts";
import { enqueueResponsesReportEmail, isEmailQueueConfigured } from "../queues/email.queue.ts";
import { sendResponsesReportEmail } from "./email.service.ts";
import { generateResponsesReport } from "./responsesReport.service.ts";
import { schedulerLog } from "../utils/schedulerLog.ts";

type QuizResponsesEmailRow = {
  id: number;
  name: string;
  code: string;
  createdby: number;
  starttime: Date | string | null;
  endtime: Date | string | null;
  status: string | null;
  creator_email: string | null;
  responses_email_sent_at: Date | string | null;
};

function sessionToken(starttime: Date | string | null): string {
  if (!starttime) return "";
  const date = new Date(starttime);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(starttime);
}

function quizHasEnded(
  quiz: Pick<QuizResponsesEmailRow, "endtime" | "status">,
  now = Date.now()
): boolean {
  if (String(quiz.status ?? "").toLowerCase() === "ended") return true;
  if (!quiz.endtime) return false;
  const endtime = new Date(quiz.endtime).getTime();
  return Number.isFinite(endtime) && endtime <= now;
}

async function getQuizForResponsesEmail(quizId: number): Promise<QuizResponsesEmailRow | null> {
  const result = await pool.query(
    `SELECT q.id, q.name, q.code, q.createdby, q.starttime, q.endtime,
            q.responses_email_sent_at,
            qs.name AS status,
            u.email AS creator_email
       FROM quiz q
       JOIN users u ON u.id = q.createdby
       LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      WHERE q.id = $1 AND q.deleted_at IS NULL
      LIMIT 1`,
    [quizId]
  );
  return result.rows[0] ?? null;
}

async function countPendingAttempts(quizId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM quiz_attempt
      WHERE quiz_id = $1
        AND status = 'in_progress'
        AND deleted_at IS NULL`,
    [quizId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function maybeQueueQuizResponsesEmail(quizId: number): Promise<boolean> {
  schedulerLog("email", `quiz ${quizId}: checking responses email eligibility`);
  const quiz = await getQuizForResponsesEmail(quizId);
  if (!quiz) {
    schedulerLog("email", `quiz ${quizId}: skipped because quiz was not found`);
    return false;
  }
  if (quiz.responses_email_sent_at) {
    schedulerLog(
      "email",
      `quiz ${quizId}: skipped because email was already sent at ${new Date(quiz.responses_email_sent_at).toISOString()}`
    );
    return false;
  }
  if (!quizHasEnded(quiz)) {
    schedulerLog(
      "email",
      `quiz ${quizId}: skipped because quiz has not ended (status=${quiz.status ?? "null"}, endtime=${quiz.endtime ?? "null"})`
    );
    return false;
  }
  if (!quiz.creator_email) {
    schedulerLog("email", `quiz ${quizId}: skipped because creator has no email`);
    return false;
  }

  const pendingAttempts = await countPendingAttempts(quizId);
  schedulerLog("email", `quiz ${quizId}: ${pendingAttempts} attempt(s) still in_progress`);
  if (pendingAttempts > 0) {
    schedulerLog("email", `quiz ${quizId}: waiting for in-progress attempts before sending report`);
    return false;
  }

  if (!isEmailQueueConfigured()) {
    schedulerLog("email", `quiz ${quizId}: email queue not configured, processing report inline`);
    const result = await processQuizResponsesEmail(quizId, sessionToken(quiz.starttime));
    schedulerLog("email", `quiz ${quizId}: inline processing completed (sent=${result.sent})`);
    return result.sent;
  }

  schedulerLog("email", `quiz ${quizId}: adding responses email job to BullMQ`);
  await enqueueResponsesReportEmail(quizId, sessionToken(quiz.starttime));
  schedulerLog("email", `quiz ${quizId}: responses email job queued`);
  return true;
}

export async function processQuizResponsesEmail(
  quizId: number,
  sessionId?: string
): Promise<{ sent: boolean; reason?: string }> {
  schedulerLog("email-worker", `quiz ${quizId}: processing responses email job`);
  const quiz = await getQuizForResponsesEmail(quizId);
  if (!quiz) throw new Error("Quiz not found");
  const currentSession = sessionToken(quiz.starttime);
  const currentSessionStart = quiz.starttime ? new Date(quiz.starttime) : null;
  if (sessionId && currentSession && sessionId !== currentSession) {
    schedulerLog(
      "email-worker",
      `quiz ${quizId}: skipped stale responses email for session ${sessionId} (current ${currentSession})`
    );
    return { sent: false, reason: "stale_session" };
  }
  if (quiz.responses_email_sent_at) {
    schedulerLog("email-worker", `quiz ${quizId}: skipped because email was already sent`);
    return { sent: false, reason: "already_sent" };
  }
  if (!quizHasEnded(quiz)) {
    schedulerLog("email-worker", `quiz ${quizId}: skipped because quiz has not ended`);
    return { sent: false, reason: "not_ended" };
  }
  if (!quiz.creator_email) throw new Error("Quiz creator email not found");

  const pendingAttempts = await countPendingAttempts(quizId);
  schedulerLog("email-worker", `quiz ${quizId}: ${pendingAttempts} attempt(s) still in_progress`);
  if (pendingAttempts > 0) throw new Error("RESULTS_PENDING");

  schedulerLog("email-worker", `quiz ${quizId}: generating responses report`);
  const { buffer, stats, registrationFields } = await generateResponsesReport(quizId);
  schedulerLog(
    "email-worker",
    `quiz ${quizId}: report generated (${buffer.length} bytes), sending email to creator`
  );
  await sendResponsesReportEmail({
    to: quiz.creator_email,
    quizName: quiz.name,
    quizCode: quiz.code,
    responsesBuffer: buffer,
    registrationFields,
    stats,
  });
  schedulerLog("email-worker", `quiz ${quizId}: email sent, marking responses_email_sent_at`);

  await pool.query(
    `UPDATE quiz
        SET responses_email_sent_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND responses_email_sent_at IS NULL
        AND ($2::timestamptz IS NULL OR starttime = $2::timestamptz)`,
    [quizId, currentSessionStart]
  ).catch((error) => {
    schedulerLog("email-worker", `quiz ${quizId}: failed to mark email as sent`, error);
  });

  schedulerLog("email-worker", `quiz ${quizId}: responses email job complete`);
  return { sent: true };
}

export async function queueDueQuizResponsesEmails(): Promise<number> {
  schedulerLog("email", "polling database for quizzes due a responses email");
  const result = await pool.query(
    `SELECT DISTINCT q.id
       FROM quiz q
       JOIN quiz_attempt qa ON qa.quiz_id = q.id AND qa.deleted_at IS NULL
       LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      WHERE q.deleted_at IS NULL
        AND q.responses_email_sent_at IS NULL
        AND (
          LOWER(COALESCE(qs.name, '')) = 'ended'
          OR (q.endtime IS NOT NULL AND q.endtime <= CURRENT_TIMESTAMP)
        )
        AND NOT EXISTS (
          SELECT 1 FROM quiz_attempt pending
           WHERE pending.quiz_id = q.id
             AND pending.status = 'in_progress'
             AND pending.deleted_at IS NULL
        )
      ORDER BY q.id ASC`
  );

  const candidateIds = result.rows
    .map((row) => Number(row.id))
    .filter((quizId) => Number.isInteger(quizId) && quizId > 0);
  schedulerLog(
    "email",
    `database poll returned ${candidateIds.length} candidate quiz(zes)${candidateIds.length > 0 ? `: [${candidateIds.join(", ")}]` : ""}`
  );

  let queued = 0;
  for (const row of result.rows) {
    const quizId = Number(row.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      schedulerLog("email", `skipping invalid quiz id from database: ${String(row.id)}`);
      continue;
    }
    schedulerLog("email", `quiz ${quizId}: beginning responses email check`);
    try {
      const didQueue = await maybeQueueQuizResponsesEmail(quizId);
      if (didQueue) queued += 1;
      schedulerLog("email", `quiz ${quizId}: check complete (queued=${didQueue})`);
    } catch (error) {
      schedulerLog("email", `quiz ${quizId}: responses email check failed`, error);
    }
  }

  schedulerLog("email", `responses email poll complete: ${queued} email job(s) queued`);
  return queued;
}
