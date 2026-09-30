import crypto from "node:crypto";
import { pool } from "../config/database.ts";
import { observabilityContext } from "./observabilityContext.ts";
import type { LiveUsage } from "./ai.service.ts";

export interface AiObservation {
  provider: string;
  model: string;
  operation: string;
  startedAt: Date;
  success: boolean;
  usage?: LiveUsage;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
}

export async function recordAiObservation(observation: AiObservation): Promise<void> {
  const context = observabilityContext.getStore();
  const completedAt = new Date();
  const requestId = context?.requestId || `ai_${crypto.randomUUID().replaceAll("-", "")}`;
  const traceId = context?.traceId || `trace_${crypto.randomUUID().replaceAll("-", "")}`;
  const inputPrice = process.env.AI_INPUT_COST_PER_1M_TOKENS;
  const outputPrice = process.env.AI_OUTPUT_COST_PER_1M_TOKENS;
  const inputRate = Number(inputPrice);
  const outputRate = Number(outputPrice);
  const canEstimateCost = observation.usage && inputPrice !== undefined && inputPrice !== "" && outputPrice !== undefined && outputPrice !== "" && Number.isFinite(inputRate) && Number.isFinite(outputRate);
  const estimatedCost = canEstimateCost
    ? ((observation.usage?.inputTokens ?? 0) * inputRate + (observation.usage?.outputTokens ?? 0) * outputRate) / 1_000_000
    : null;
  try {
    await pool.query(
      `INSERT INTO ai_request_logs
        (request_id, trace_id, user_id, provider, model, operation, started_at, completed_at,
         duration_ms, success, status_code, input_tokens, output_tokens, total_tokens,
         estimated_cost, error_code, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [requestId, traceId, context?.userId() ?? null, observation.provider, observation.model,
        observation.operation, observation.startedAt, completedAt,
        Math.max(0, completedAt.getTime() - observation.startedAt.getTime()), observation.success,
        observation.statusCode ?? null, observation.usage?.inputTokens ?? null,
        observation.usage?.outputTokens ?? null, observation.usage?.totalTokens ?? null,
        estimatedCost, observation.errorCode ?? null, observation.errorMessage?.slice(0, 2000) ?? null]
    );
    const userId = context?.userId() ?? null;
    if (userId) {
      await pool.query(
        `INSERT INTO user_activity_logs
          (user_id, activity_type, entity_type, entity_id, description, metadata)
         VALUES ($1,$2,'ai_request',$3,$4,$5)`,
        [userId, observation.success ? "AI_GENERATION_COMPLETED" : "AI_GENERATION_FAILED", requestId,
          `${observation.operation} ${observation.success ? "completed" : "failed"}`,
          { requestId, traceId, provider: observation.provider, model: observation.model, operation: observation.operation }]
      );
    }
  } catch (error) {
    console.warn("[ai-observability] write skipped:", (error as Error).message);
  }
}
