import type { Request, Response } from "express";
import { pool } from "../config/database.js";
import redisClient from "../config/redis.js";

/**
 * Owner-only platform analytics.
 * All handlers are read-only aggregation queries against the real schema
 * (users / quiz / quiz_attempt / quiz_problems / quiz_student_response).
 * Every metric is wrapped in `safe()` so a missing table/column degrades to
 * `{ unavailable: true }` instead of failing the whole response or inventing
 * numbers. The frontend distinguishes "No data" from "Data unavailable".
 */

type RangeKey = "today" | "7d" | "30d" | "90d";

function parseRange(q: unknown): { key: RangeKey; days: number } {
  const params = (q ?? {}) as Record<string, unknown>;
  const raw = String(params.range ?? "7d").toLowerCase();
  const customDays = Math.round(Number(params.days));
  if (raw === "custom" && Number.isFinite(customDays)) {
    return { key: "today", days: Math.min(90, Math.max(1, customDays)) };
  }
  if (raw === "today" || raw === "1d") return { key: "today", days: 1 };
  if (raw === "30d" || raw === "30days") return { key: "30d", days: 30 };
  if (raw === "90d" || raw === "90days") return { key: "90d", days: 90 };
  return { key: "7d", days: 7 };
}

// Registration timestamps were not backfilled on older rows (both createdat
// and created_at can be NULL) — coalesce every candidate column.
const USER_CREATED = `COALESCE(u.created_at, u.createdat, u.updated_at, u.updatedat)`;
const QUIZ_CREATED = `COALESCE(q.created_at, q.updated_at)`;

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn("[platform] metric unavailable:", (e as Error)?.message);
    return null;
  }
}

const one = async (sql: string, params: unknown[] = []) =>
  (await pool.query(sql, params as never[])).rows[0] as Record<string, unknown> | undefined;

const num = (v: unknown, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return +(((current - previous) / previous) * 100).toFixed(1);
}

// ── Overview ──────────────────────────────────────────────
export const getOverview = async (req: Request, res: Response) => {
  const { key, days } = parseRange(req.query);

  const users = await safe(async () => {
    const total = num((await one(`SELECT COUNT(*)::int AS n FROM users`))?.n);
    const r = await one(
      `SELECT
         COUNT(*) FILTER (WHERE ${USER_CREATED} >= NOW() - INTERVAL '1 day')::int AS d1,
         COUNT(*) FILTER (WHERE ${USER_CREATED} >= NOW() - INTERVAL '7 days')::int AS d7,
         COUNT(*) FILTER (WHERE ${USER_CREATED} >= NOW() - INTERVAL '30 days')::int AS d30,
         COUNT(*) FILTER (WHERE ${USER_CREATED} >= NOW() - INTERVAL '14 days' AND ${USER_CREATED} < NOW() - INTERVAL '7 days')::int AS prev7
       FROM users u`
    );
    return {
      total,
      newToday: num(r?.d1),
      newWeek: num(r?.d7),
      newMonth: num(r?.d30),
      newWeekChangePct: pctChange(num(r?.d7), num(r?.prev7)),
      timestampsBackfilled: total > 0 ? undefined : undefined,
    };
  });

  const active = await safe(async () => {
    const r = await one(
      `SELECT
         COUNT(*) FILTER (WHERE u.lastlogin >= NOW() - INTERVAL '1 day')::int AS d1,
         COUNT(*) FILTER (WHERE u.lastlogin >= NOW() - INTERVAL '7 days')::int AS d7,
         COUNT(*) FILTER (WHERE u.lastlogin >= NOW() - INTERVAL '30 days')::int AS d30,
         COUNT(*) FILTER (WHERE u.lastlogin >= NOW() - INTERVAL '15 minutes')::int AS online,
         COUNT(*) FILTER (WHERE u.lastlogin >= NOW() - INTERVAL '14 days' AND u.lastlogin < NOW() - INTERVAL '7 days')::int AS prev7
       FROM users u`
    );
    return {
      today: num(r?.d1),
      last7d: num(r?.d7),
      last30d: num(r?.d30),
      online: num(r?.online),
      changePct: pctChange(num(r?.d7), num(r?.prev7)),
    };
  });

  const quizzes = await safe(async () => {
    const r = await one(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE ${QUIZ_CREATED} >= NOW() - INTERVAL '1 day')::int AS today
       FROM quiz q WHERE q.deleted_at IS NULL`
    );
    const status = await pool.query(
      `SELECT COALESCE(s.name, q.quiz_status::text, 'unknown') AS status, COUNT(*)::int AS n
       FROM quiz q LEFT JOIN quiz_status s ON s.id = q.quiz_status
       WHERE q.deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`
    ).then((x) => x.rows).catch(() => null);
    return { total: num(r?.total), createdToday: num(r?.today), byStatus: status };
  });

  const attempts = await safe(async () => {
    const r = await one(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '1 day')::int AS today,
              COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '1 day' AND a.status = 'completed')::int AS completedToday,
              COUNT(*) FILTER (WHERE a.status = 'completed')::int AS completed
       FROM quiz_attempt a`
    );
    return {
      total: num(r?.total),
      today: num(r?.today),
      completedToday: num(r?.completedToday),
      completed: num(r?.completed),
    };
  });

  const engagement = await safe(async () => {
    const r = await one(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              AVG(percentage)::float AS avg_score,
              AVG(time_taken)::float AS avg_duration_s
       FROM quiz_attempt`
    );
    const perUser = await one(
      `SELECT AVG(c)::float AS avg_attempts FROM (SELECT COUNT(*)::float AS c FROM quiz_attempt GROUP BY user_id) t`
    );
    const total = num(r?.total);
    return {
      completionRate: total ? +((num(r?.completed) / total) * 100).toFixed(1) : null,
      avgScore: r?.avg_score == null ? null : +Number(r.avg_score).toFixed(1),
      avgDurationS: r?.avg_duration_s == null ? null : Math.round(Number(r.avg_duration_s)),
      avgAttemptsPerUser: perUser?.avg_attempts == null ? null : +Number(perUser.avg_attempts).toFixed(2),
    };
  });

  res.json({ success: true, data: { range: key, days, users, active, quizzes, attempts, engagement } });
};

// ── Time series ───────────────────────────────────────────
export const getSeries = async (req: Request, res: Response) => {
  const { key, days } = parseRange(req.query);
  const data = await safe(async () => {
    const { rows } = await pool.query(
      `WITH days AS (
         SELECT generate_series(date_trunc('day', NOW() - ($1 || ' days')::interval), date_trunc('day', NOW()), INTERVAL '1 day') AS d
       )
       SELECT to_char(days.d, 'Dy DD') AS label,
              days.d::date AS date,
              (SELECT COUNT(*)::int FROM users u WHERE u.lastlogin >= days.d AND u.lastlogin < days.d + INTERVAL '1 day') AS dau,
              (SELECT COUNT(*)::int FROM users u WHERE ${USER_CREATED} >= days.d AND ${USER_CREATED} < days.d + INTERVAL '1 day') AS new_users,
              (SELECT COUNT(*)::int FROM quiz_attempt a WHERE a.created_at >= days.d AND a.created_at < days.d + INTERVAL '1 day') AS attempts,
              (SELECT COUNT(*)::int FROM quiz_attempt a
                WHERE a.status = 'completed'
                  AND COALESCE(a.completed_at, a.updated_at) >= days.d
                  AND COALESCE(a.completed_at, a.updated_at) < days.d + INTERVAL '1 day') AS completed
       FROM days ORDER BY days.d`,
      [String(days)]
    );
    return rows;
  });
  if (!data) {
    res.json({ success: true, data: { range: key, days, points: null, unavailable: true } });
    return;
  }
  res.json({ success: true, data: { range: key, days, points: data } });
};

// ── Live ──────────────────────────────────────────────────
export const getLive = async (_req: Request, res: Response) => {
  const data = await safe(async () => {
    const counts = await one(
      `SELECT
         (SELECT COUNT(*)::int FROM users u WHERE u.lastlogin >= NOW() - INTERVAL '15 minutes') AS online,
         (SELECT COUNT(*)::int FROM quiz_attempt a WHERE a.status = 'in_progress' AND a.updated_at >= NOW() - INTERVAL '2 hours') AS in_progress,
         (SELECT COUNT(DISTINCT quiz_id)::int FROM quiz_attempt a WHERE a.status = 'in_progress' AND a.updated_at >= NOW() - INTERVAL '2 hours') AS active_quizzes`
    );
    const rooms = await safe(async () => {
      const tables = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_name IN ('room','rooms') LIMIT 1`
      );
      if (!tables.rows.length) return null;
      const t = tables.rows[0].table_name;
      return num((await one(`SELECT COUNT(*)::int AS n FROM ${t} WHERE updated_at >= NOW() - INTERVAL '2 hours'`))?.n);
    });
    const events = await safe(async () =>
      (
        await pool.query(
          `(SELECT 'attempt_started' AS kind, u.username AS actor, ('Quiz #' || a.quiz_id) AS object, a.created_at AS at
            FROM quiz_attempt a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 5)
           UNION ALL
           (SELECT 'quiz_completed' AS kind, u.username AS actor, ('Quiz #' || a.quiz_id || ' · ' || COALESCE(a.percentage::text,'') || '%') AS object, COALESCE(a.completed_at, a.updated_at) AS at
            FROM quiz_attempt a LEFT JOIN users u ON u.id = a.user_id WHERE a.status = 'completed' ORDER BY COALESCE(a.completed_at, a.updated_at) DESC LIMIT 5)
           UNION ALL
           (SELECT 'quiz_created' AS kind, u.username AS actor, q.name AS object, COALESCE(q.created_at, q.updated_at) AS at
            FROM quiz q LEFT JOIN users u ON u.id = q.createdby ORDER BY COALESCE(q.created_at, q.updated_at) DESC LIMIT 5)
           UNION ALL
           (SELECT 'user_registered' AS kind, u.username AS actor, u.email AS object, ${USER_CREATED} AS at
            FROM users u ORDER BY ${USER_CREATED} DESC LIMIT 5)
           ORDER BY at DESC LIMIT 20`
        )
      ).rows
    );
    return {
      online: num(counts?.online),
      takingQuizzes: num(counts?.in_progress),
      activeQuizRooms: num(counts?.active_quizzes),
      liveRooms: rooms,
      attemptsInProgress: num(counts?.in_progress),
      events: events ?? [],
    };
  });
  if (!data) {
    res.json({ success: false, message: "Live data unavailable", statusCode: 503 });
    return;
  }
  res.json({ success: true, data });
};

// ── Activity feed ─────────────────────────────────────────
const ACTIVITY_SCOPES = ["users", "quizzes", "attempts", "ai", "system", "security"] as const;

export const getActivity = async (req: Request, res: Response) => {
  const scope = String(req.query.scope ?? "all").toLowerCase();
  const search = String(req.query.search ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const like = `%${search}%`;

  const parts: string[] = [];
  const args: unknown[] = [];
  let i = 1;

  const want = (s: string) => scope === "all" || scope === s;

  if (want("users")) {
    parts.push(`(SELECT 'user_registered' AS type, 'users' AS scope, u.username AS actor, u.email AS object,
      ${USER_CREATED} AS at, NULL::text AS meta FROM users u
      ${search ? `WHERE u.username ILIKE $${i} OR u.email ILIKE $${i}` : ""})`);
    if (search) { args.push(like); i++; }
  }
  if (want("quizzes")) {
    parts.push(`(SELECT 'quiz_created' AS type, 'quizzes' AS scope, u.username AS actor, q.name AS object,
      COALESCE(q.created_at, q.updated_at) AS at, ('Quiz #' || q.id || ' · ' || q.code) AS meta
      FROM quiz q LEFT JOIN users u ON u.id = q.createdby WHERE q.deleted_at IS NULL
      ${search ? `AND (q.name ILIKE $${i} OR q.code ILIKE $${i})` : ""})`);
    if (search) { args.push(like, like); i += 2; }
  }
  if (want("attempts")) {
    parts.push(`(SELECT 'quiz_' || a.status AS type, 'attempts' AS scope, u.username AS actor,
      ('Quiz #' || a.quiz_id) AS object, COALESCE(a.completed_at, a.updated_at, a.created_at) AS at,
      ('score ' || COALESCE(a.percentage::text, '—') || '%') AS meta
      FROM quiz_attempt a LEFT JOIN users u ON u.id = a.user_id
      ${search ? `WHERE u.username ILIKE $${i}` : ""})`);
    if (search) { args.push(like); i++; }
  }
  // No dedicated AI / system / security event stores exist yet — surfaced
  // honestly as empty rather than fabricated.
  if (!parts.length) {
    res.json({ success: true, data: { items: [], page, limit, total: null, scopes: [...ACTIVITY_SCOPES] } });
    return;
  }

  const data = await safe(async () => {
    const union = parts.join(" UNION ALL ");
    const total = await one(`SELECT COUNT(*)::int AS n FROM (${union}) t`, args).catch(() => null);
    const items = (
      await pool.query(`SELECT * FROM (${union}) t ORDER BY at DESC NULLS LAST LIMIT $${i} OFFSET $${i + 1}`, [
        ...args, limit, offset,
      ] as never[])
    ).rows;
    return { items, total: total ? num((total as Record<string, unknown>).n) : null };
  });

  if (!data) {
    res.json({ success: false, message: "Activity unavailable", statusCode: 503 });
    return;
  }
  res.json({ success: true, data: { ...data, page, limit, scopes: [...ACTIVITY_SCOPES] } });
};

// ── Users ─────────────────────────────────────────────────
export const getUsers = async (_req: Request, res: Response) => {
  const data = await safe(async () => {
    const summary = await one(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE ${USER_CREATED} >= NOW() - INTERVAL '30 days')::int AS new_30d,
              COUNT(*) FILTER (WHERE u.lastlogin >= NOW() - INTERVAL '30 days')::int AS active_30d,
              COUNT(*) FILTER (WHERE u.lastlogin IS NULL OR u.lastlogin < NOW() - INTERVAL '90 days')::int AS dormant
       FROM users u`
    );
    const sessions = await one(
      `SELECT AVG(c)::float AS avg_sessions FROM (SELECT COUNT(*)::float AS c FROM quiz_attempt GROUP BY user_id) t`
    );
    const topUsers = await pool.query(
      `SELECT u.id, u.username, u.email, u.lastlogin AS last_active,
              COUNT(a.id)::int AS attempts,
              COUNT(*) FILTER (WHERE a.status = 'completed')::int AS completed
       FROM users u LEFT JOIN quiz_attempt a ON a.user_id = u.id
       GROUP BY u.id ORDER BY attempts DESC LIMIT 10`
    ).then((r) => r.rows);
    const topTeachers = await pool.query(
      `SELECT u.id, u.username, COUNT(q.id)::int AS created,
              COUNT(*) FILTER (WHERE q.quiz_status = 3)::int AS live,
              (SELECT COUNT(*)::int FROM quiz_attempt a WHERE a.quiz_id IN (SELECT id FROM quiz WHERE createdby = u.id)) AS attempts_generated,
              MAX(COALESCE(q.created_at, q.updated_at)) AS last_active
       FROM users u LEFT JOIN quiz q ON q.createdby = u.id AND q.deleted_at IS NULL
       GROUP BY u.id HAVING COUNT(q.id) > 0 ORDER BY created DESC LIMIT 10`
    ).then((r) => r.rows).catch(() => []);
    return {
      total: num(summary?.total),
      new30d: num(summary?.new_30d),
      returning30d: Math.max(0, num(summary?.active_30d) - num(summary?.new_30d)),
      dormant: num(summary?.dormant),
      avgSessionsPerUser: sessions?.avg_sessions == null ? null : +Number(sessions.avg_sessions).toFixed(2),
      avgSessionDurationS: null as number | null, // not tracked server-side (unavailable, not zero)
      topUsers, topTeachers,
    };
  });
  if (!data) {
    res.json({ success: false, message: "User analytics unavailable", statusCode: 503 });
    return;
  }
  res.json({ success: true, data });
};

// ── Quizzes ───────────────────────────────────────────────
export const getQuizzes = async (_req: Request, res: Response) => {
  const data = await safe(async () => {
    const byStatus = await pool.query(
      `SELECT COALESCE(s.name, q.quiz_status::text, 'unknown') AS status, COUNT(*)::int AS n
       FROM quiz q LEFT JOIN quiz_status s ON s.id = q.quiz_status
       WHERE q.deleted_at IS NULL GROUP BY 1`
    ).then((r) => r.rows).catch(() => null);
    const stats = await one(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status='completed')::int AS completed,
              COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress,
              COUNT(*) FILTER (WHERE status NOT IN ('completed','in_progress'))::int AS abandoned,
              AVG(percentage)::float AS avg_score,
              AVG(time_taken)::float AS avg_duration_s
       FROM quiz_attempt`
    );
    const funnel = await one(
      `SELECT COUNT(*)::int AS opened,
              COUNT(*) FILTER (WHERE status IN ('in_progress','completed','timed_out','submitted_late'))::int AS started,
              (SELECT COUNT(DISTINCT attempt_id)::int FROM quiz_student_response WHERE is_attempted) AS answered,
              COUNT(*) FILTER (WHERE status IN ('completed','submitted_late','timed_out'))::int AS submitted,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM quiz_attempt`
    );
    const top = await pool.query(
      `SELECT q.id, q.name, q.code, COALESCE(s.name, q.quiz_status::text, 'unknown') AS status, u.username AS creator,
              COUNT(a.id)::int AS attempts,
              COUNT(*) FILTER (WHERE a.status='completed')::int AS completed,
              AVG(a.percentage)::float AS avg_score,
              AVG(a.time_taken)::float AS avg_duration_s,
              MAX(COALESCE(a.completed_at, a.updated_at, a.created_at)) AS last_activity
       FROM quiz q LEFT JOIN users u ON u.id = q.createdby
       LEFT JOIN quiz_status s ON s.id = q.quiz_status
       LEFT JOIN quiz_attempt a ON a.quiz_id = q.id
       WHERE q.deleted_at IS NULL GROUP BY q.id, s.name, u.username ORDER BY attempts DESC LIMIT 20`
    ).then((r) => r.rows);
    const qtypes = await pool.query(
      `SELECT COALESCE(t.name, p.quiz_problem_type::text, 'unknown') AS type, COUNT(*)::int AS n
       FROM quiz_problems p LEFT JOIN quiz_problem_type t ON t.id = p.quiz_problem_type
       WHERE p.deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`
    ).then((r) => r.rows).catch(() => null);
    const hardest = await pool.query(
      `SELECT p.id, p.quiz_id, LEFT(p.problem_statement, 120) AS statement,
              COUNT(*)::int AS responses,
              AVG(CASE WHEN r.is_attempted THEN 0 ELSE 1 END)::float AS skip_rate,
              AVG(r.time_spent_seconds)::float AS avg_time_s
       FROM quiz_problems p LEFT JOIN quiz_student_response r ON r.problem_id = p.id
       WHERE p.deleted_at IS NULL GROUP BY p.id HAVING COUNT(r.id) > 0 ORDER BY skip_rate DESC NULLS LAST LIMIT 10`
    ).then((r) => r.rows).catch(() => []);
    return { byStatus, stats, funnel, top, questionTypes: qtypes, hardest, totalQuestions: qtypes?.reduce((s: number, t: { n: number }) => s + num(t.n), 0) ?? null };
  });
  if (!data) {
    res.json({ success: false, message: "Quiz analytics unavailable", statusCode: 503 });
    return;
  }
  res.json({ success: true, data });
};

// ── AI usage ──────────────────────────────────────────────
export const getAi = async (_req: Request, res: Response) => {
  // No AI usage/cost ledger exists in the database (AI calls go straight to
  // the provider). Report honestly instead of inventing token counts.
  const probe = await safe(async () => {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name IN ('ai_usage','ai_requests','ai_generations','ai_logs')`
    );
    return tables.rows.map((r) => r.table_name) as string[];
  });
  res.json({
    success: true,
    data: {
      available: false,
      reason: "Cost tracking unavailable — no AI usage ledger in the database yet.",
      ledgerTables: probe ?? [],
      requestsToday: null, requestsMonth: null, questionsGenerated: null,
      documentsProcessed: null, failed: null, avgGenerationTimeS: null,
      tokens: null, estimatedCost: null,
    },
  });
};

// ── Health ────────────────────────────────────────────────
export const getHealth = async (_req: Request, res: Response) => {
  const t0 = Date.now();
  const db = await safe(async () => {
    const s = Date.now();
    await pool.query("SELECT 1");
    return { status: "operational" as const, latencyMs: Date.now() - s };
  });
  const redis = await safe(async () => {
    const s = Date.now();
    await redisClient.set("__platform_health_probe", "1", { ex: 30 });
    await redisClient.get("__platform_health_probe");
    return { status: "operational" as const, latencyMs: Date.now() - s };
  });
  const api = { status: "operational" as const, latencyMs: Date.now() - t0 };
  const unavailable = (name: string) => ({ status: "unknown" as const, note: `${name} has no health probe wired yet` });
  res.json({
    success: true,
    data: {
      services: {
        api, database: db ?? { status: "down" as const, latencyMs: null },
        redis: redis ?? { status: "down" as const, latencyMs: null },
        bullmq: unavailable("BullMQ"), websocket: unavailable("WebSocket"),
        ai: unavailable("AI service"), storage: unavailable("Storage"),
      },
      errors: { today5xx: null as number | null, today4xx: null as number | null, note: "No error ledger yet — see server logs" },
    },
  });
};

// ── Jobs ──────────────────────────────────────────────────
export const getJobs = async (_req: Request, res: Response) => {
  // The backend has no BullMQ/queue dependency (pg + Upstash Redis only).
  res.json({
    success: true,
    data: {
      available: false, reason: "No background-job system (BullMQ) wired in the backend yet.",
      queued: null, processing: null, completed: null, failed: null, delayed: null, failedJobs: [],
    },
  });
};

// ── Errors ────────────────────────────────────────────────
export const getErrors = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      available: false, reason: "No error-tracking store wired yet — see server logs.",
      errorsToday: null, today5xx: null, failedJobs: null, failedAi: null, items: [],
    },
  });
};

// ── Security ──────────────────────────────────────────────
export const getSecurity = async (_req: Request, res: Response) => {
  const data = await safe(async () => {
    const recentLogins = await pool.query(
      `SELECT u.id, u.username, u.email, u.lastlogin AS at FROM users u
       WHERE u.lastlogin IS NOT NULL ORDER BY u.lastlogin DESC LIMIT 20`
    ).then((r) => r.rows);
    return {
      recentLogins,
      failedLogins: null as null, // no failed-login ledger
      activeSessions: null as null, // session store is JWT+blacklist; no enumerable session table
      note: "IP/device/location are not stored — columns omitted for privacy.",
    };
  });
  if (!data) {
    res.json({ success: false, message: "Security data unavailable", statusCode: 503 });
    return;
  }
  res.json({ success: true, data });
};

// ── Audit ─────────────────────────────────────────────────
export const getAudit = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      available: false, reason: "No admin audit-log table yet — privileged actions are not recorded.",
      items: [],
    },
  });
};

// ── Storage ───────────────────────────────────────────────
export const getStorage = async (_req: Request, res: Response) => {
  const data = await safe(async () => {
    const size = await one(`SELECT pg_database_size(current_database())::bigint AS bytes`).catch(() => null);
    return {
      databaseBytes: size?.bytes == null ? null : Number(size.bytes),
      uploads: null, redisMemory: null, dbConnections: null, cpu: null, memory: null, disk: null, network: null,
      note: "Only PostgreSQL database size is measurable from the app layer.",
    };
  });
  res.json({ success: true, data: data ?? { databaseBytes: null } });
};

// ── Growth ────────────────────────────────────────────────
export const getGrowth = async (req: Request, res: Response) => {
  const { key, days } = parseRange(req.query);
  const data = await safe(async () => {
    const { rows } = await pool.query(
      `WITH days AS (
         SELECT generate_series(date_trunc('day', NOW() - ($1 || ' days')::interval), date_trunc('day', NOW()), INTERVAL '1 day') AS d
       )
       SELECT days.d::date AS date,
         (SELECT COUNT(*)::int FROM users u WHERE ${USER_CREATED} >= days.d AND ${USER_CREATED} < days.d + INTERVAL '1 day') AS new_users,
         (SELECT COUNT(*)::int FROM quiz q WHERE COALESCE(q.created_at, q.updated_at) >= days.d AND COALESCE(q.created_at, q.updated_at) < days.d + INTERVAL '1 day' AND q.deleted_at IS NULL) AS new_quizzes,
         (SELECT COUNT(*)::int FROM quiz_attempt a WHERE a.created_at >= days.d AND a.created_at < days.d + INTERVAL '1 day') AS attempts
       FROM days ORDER BY days.d`,
      [String(days)]
    );
    return rows;
  });
  res.json({ success: true, data: { range: key, days, points: data ?? null } });
};

// ── Search ────────────────────────────────────────────────
export const search = async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim().slice(0, 80);
  if (!q) {
    res.json({ success: true, data: { users: [], quizzes: [], attempts: [] } });
    return;
  }
  const like = `%${q}%`;
  const data = await safe(async () => {
    const users = await pool.query(
      `SELECT id, username, email FROM users WHERE username ILIKE $1 OR email ILIKE $1 LIMIT 8`, [like]
    ).then((r) => r.rows);
    const quizzes = await pool.query(
      `SELECT id, name, code FROM quiz WHERE deleted_at IS NULL AND (name ILIKE $1 OR code ILIKE $1) LIMIT 8`, [like]
    ).then((r) => r.rows);
    const attempts = await pool.query(
      `SELECT a.id, a.quiz_id, a.user_id, a.status, u.username FROM quiz_attempt a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE u.username ILIKE $1 OR a.id::text = $2 LIMIT 8`, [like, q]
    ).then((r) => r.rows).catch(() => []);
    return { users, quizzes, attempts };
  });
  res.json({ success: true, data: data ?? { users: [], quizzes: [], attempts: [] } });
};

// ── Alerts ────────────────────────────────────────────────
export const getAlerts = async (_req: Request, res: Response) => {
  const items: Array<{ severity: "critical" | "warning" | "info"; message: string; link: string }> = [];
  await safe(async () => {
    const stuck = await one(
      `SELECT COUNT(*)::int AS n FROM quiz_attempt WHERE status = 'in_progress' AND updated_at < NOW() - INTERVAL '6 hours'`
    );
    if (num(stuck?.n) > 0) {
      items.push({ severity: "warning", message: `${stuck!.n} quiz attempts stuck in progress for 6h+`, link: "#quiz-analytics" });
    }
  });
  await safe(async () => {
    const dormant = await one(`SELECT COUNT(*)::int AS n FROM users WHERE lastlogin IS NULL`);
    if (num(dormant?.n) > 0) {
      items.push({ severity: "info", message: `${dormant!.n} users never logged in`, link: "#user-analytics" });
    }
  });
  res.json({ success: true, data: { items } });
};
