import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { pool } from "../config/database.ts";
import { getClientIp } from "../utils/getClientIp.ts";
import { observabilityContext } from "../services/observabilityContext.ts";
import { runObservabilityRetentionCleanup } from "../services/observabilityRetention.ts";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      traceId?: string;
      observabilityError?: {
        name: string;
        code?: string;
        message: string;
        stack?: string;
      };
    }
  }
}

const SENSITIVE_KEY = /pass(word)?|otp|token|secret|api[-_]?key|authorization|cookie|credential|card|cvv|pin/i;
const MAX_STRING = 1024;
const MAX_JSON_BYTES = 16 * 1024;
let lastSystemMetricAt = 0;

const id = (prefix: "req" | "trace" | "err") => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[MAX_DEPTH]";
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitize(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitize(item, depth + 1)])
    );
  }
  return String(value);
}

function boundedJson(value: unknown): unknown {
  const clean = sanitize(value);
  try {
    return Buffer.byteLength(JSON.stringify(clean)) <= MAX_JSON_BYTES ? clean : { omitted: true, reason: "payload_too_large" };
  } catch {
    return { omitted: true, reason: "unserializable" };
  }
}

function parseDevice(userAgent: string | null) {
  const ua = userAgent || "";
  const deviceType = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
  const browser = /edg/i.test(ua) ? "Edge" : /chrome/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Other";
  const os = /windows/i.test(ua) ? "Windows" : /android/i.test(ua) ? "Android" : /iphone|ipad|ios/i.test(ua) ? "iOS" : /mac os/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
  return { deviceType, browser, os };
}

function normalizeErrorMessage(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "{uuid}")
    .replace(/\b\d+\b/g, "{n}")
    .slice(0, 500);
}

function activityTypeFor(method: string, endpoint: string): string {
  const path = endpoint.toLowerCase();
  if (path.includes("/logout")) return "LOGOUT";
  if (path.includes("/profile")) return "PROFILE_UPDATED";
  if (path.includes("/quiz") && path.includes("submit")) return "QUIZ_SUBMITTED";
  if (path.includes("/quiz") && path.includes("attempt")) return "QUIZ_STARTED";
  if (path.includes("/quiz") && method === "POST") return "QUIZ_CREATED";
  if (path.includes("/test") && method === "POST") return "TEST_CREATED";
  if (path.includes("/question") && method === "POST") return "QUESTION_CREATED";
  return "DATA_MUTATION";
}

/** Automatic, redacted request telemetry for every HTTP request. */
export function observabilityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = new Date();
  const startedNs = process.hrtime.bigint();
  const requestId = id("req");
  const incomingTrace = String(req.headers["x-trace-id"] || "").replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80);
  const traceId = incomingTrace || id("trace");
  req.requestId = requestId;
  req.traceId = traceId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Trace-Id", traceId);

  let responsePayload: unknown;
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    responsePayload = body;
    return originalJson(body);
  }) as Response["json"];

  res.once("finish", () => {
    const completedAt = new Date();
    const durationMs = Math.max(0, Math.round(Number(process.hrtime.bigint() - startedNs) / 1_000_000));
    const endpoint = req.originalUrl.split("?")[0] || req.path;
    const routePath = typeof req.route?.path === "string" ? req.route.path : null;
    const routeTemplate = routePath ? `${req.baseUrl || ""}${routePath}` : null;
    const statusCode = res.statusCode;
    const success = statusCode < 400;
    // A synchronized quiz finish can produce hundreds of submit/status calls
    // in seconds. Persisting several telemetry rows for every successful poll
    // competes with the actual submissions for database connections. Errors
    // are still recorded; healthy hot-path requests rely on normal HTTP logs.
    const isSubmissionHotPath = /\/quiz\/attempt\/[^/]+\/(submit|submit-status)$/.test(endpoint);
    if (success && isSubmissionHotPath) return;
    const ipRaw = getClientIp(req);
    const ip = ipRaw === "unknown" ? null : ipRaw;
    const userAgent = req.get("user-agent") || null;
    const referer = req.get("referer") || null;
    const requestBytes = Number(req.get("content-length"));
    const responseBytes = Number(res.getHeader("content-length"));
    const errorBody = responsePayload && typeof responsePayload === "object" ? responsePayload as Record<string, unknown> : null;
    const capturedError = req.observabilityError;
    const errorMessage = !success
      ? (capturedError?.message || (typeof errorBody?.message === "string" ? errorBody.message : null))?.slice(0, 2000) ?? null
      : null;
    const errorCode = !success
      ? (capturedError?.code || (errorBody?.code != null ? String(errorBody.code) : null))?.slice(0, 200) ?? null
      : null;
    const errorStack = !success ? capturedError?.stack?.slice(0, 12000) ?? null : null;
    const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
    const userId = req.user?.userId && /^\d+$/.test(String(req.user.userId)) ? Number(req.user.userId) : null;

    void (async () => {
      try {
        const inserted = await pool.query(
          `INSERT INTO api_request_logs
            (request_id, trace_id, user_id, method, endpoint, route_template, status_code, success,
             started_at, completed_at, duration_ms, ip_address, user_agent, referer,
             request_size_bytes, response_size_bytes, error_code, error_message, error_stack, service, environment)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'api',$20)
           RETURNING id`,
          [requestId, traceId, userId, req.method, endpoint, routeTemplate, statusCode, success,
            startedAt, completedAt, durationMs, ip, userAgent, referer,
            Number.isFinite(requestBytes) ? requestBytes : null,
            Number.isFinite(responseBytes) ? responseBytes : null,
            errorCode, errorMessage, errorStack, environment]
        );
        const logId = inserted.rows[0]?.id;
        if (logId) {
          await pool.query(
            `INSERT INTO api_request_metadata
              (request_log_id, query_params, path_params, request_body, response_metadata)
             VALUES ($1,$2,$3,$4,$5)`,
            [logId, boundedJson(req.query), boundedJson(req.params), boundedJson(req.body), boundedJson({ success, statusCode, errorCode, errorMessage })]
          );
        }

        if (!success && statusCode >= 500) {
          const message = errorMessage || `HTTP ${statusCode}`;
          const fingerprint = crypto.createHash("sha256").update(`HTTPError|${normalizeErrorMessage(message)}|${routeTemplate || endpoint}`).digest("hex");
          await pool.query(
            `INSERT INTO application_errors
              (error_id, fingerprint, request_id, trace_id, user_id, endpoint, method, error_type,
               error_code, message, stack_trace, status_code, environment, first_seen_at, last_seen_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
             ON CONFLICT (fingerprint) DO UPDATE SET
               occurrence_count = application_errors.occurrence_count + 1,
               request_id = EXCLUDED.request_id, trace_id = EXCLUDED.trace_id,
               user_id = EXCLUDED.user_id, last_seen_at = EXCLUDED.last_seen_at,
               status_code = EXCLUDED.status_code, updated_at = NOW(), resolved_at = NULL`,
            [id("err"), fingerprint, requestId, traceId, userId, endpoint, req.method,
              capturedError?.name || "HTTPError", errorCode, message, errorStack, statusCode, environment, completedAt]
          );
        }

        if (userId) {
          const rawToken = req.cookies?.session_token || req.cookies?.platform_session || "";
          const sessionId = crypto.createHash("sha256").update(rawToken || `${userId}:${userAgent || "unknown"}`).digest("hex");
          const { deviceType, browser, os } = parseDevice(userAgent);
          await pool.query(
            `INSERT INTO user_sessions
              (user_id, session_id, login_at, last_seen_at, ip_address, user_agent, device_type, browser, os, is_active)
             VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,TRUE)
             ON CONFLICT (session_id) DO UPDATE SET
               last_seen_at = EXCLUDED.last_seen_at, ip_address = EXCLUDED.ip_address,
               user_agent = EXCLUDED.user_agent, device_type = EXCLUDED.device_type,
               browser = EXCLUDED.browser, os = EXCLUDED.os, is_active = TRUE,
               logout_at = NULL, updated_at = NOW()`,
            [userId, sessionId, completedAt, ip, userAgent, deviceType, browser, os]
          );

          if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
            await pool.query(
              `INSERT INTO user_activity_logs
                (user_id, activity_type, entity_type, entity_id, description, metadata, ip_address, user_agent)
               VALUES ($1,$2,'http_request',$3,$4,$5,$6,$7)`,
              [userId, activityTypeFor(req.method, endpoint), requestId,
                `${success ? "Completed" : "Failed"} ${req.method} ${routeTemplate || endpoint}`,
                boundedJson({ requestId, traceId, statusCode, success }), ip, userAgent]
            );
          }
        }

        // Lightweight process sampling. At most one sample per instance every
        // five minutes keeps this safe for serverless and long-running hosts.
        if (Date.now() - lastSystemMetricAt >= 300_000) {
          lastSystemMetricAt = Date.now();
          const memory = process.memoryUsage();
          await pool.query(
            `INSERT INTO system_metrics (metric_name, metric_value, unit, metadata)
             VALUES ('process_rss', $1, 'bytes', $3), ('heap_used', $2, 'bytes', $3)`,
            [memory.rss, memory.heapUsed, boundedJson({ service: "api", environment })]
          );
        }

        await runObservabilityRetentionCleanup();
      } catch (error) {
        // Telemetry must never make an application request fail. A missing
        // migration therefore degrades to server logs until it is applied.
        console.warn("[observability] write skipped:", (error as Error).message);
      }
    })();
  });

  observabilityContext.run({
    requestId,
    traceId,
    userId: () => req.user?.userId && /^\d+$/.test(String(req.user.userId)) ? Number(req.user.userId) : null,
  }, next);
}

export { sanitize as redactObservabilityValue };
