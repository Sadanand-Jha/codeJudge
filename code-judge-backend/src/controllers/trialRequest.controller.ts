// HTTP handlers for user trial requests and the owner review queue.
import type { Request, Response } from "express";
import {
  TrialRequestError,
  type TrialActor,
  trialRequestService,
} from "../services/trialRequest.service.ts";
import type { TrialRequestStatus } from "../repositories/trialRequest.repository.ts";
import { getClientIp } from "../utils/getClientIp.ts";

const REVIEW_STATUSES = new Set<TrialRequestStatus>([
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

function userIdFrom(req: Request): number | null {
  const userId = Number(req.user?.userId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function actorFromRequest(req: Request): TrialActor {
  const actorId = userIdFrom(req);
  return {
    actorId,
    actorRole: "platform_admin",
    ip: getClientIp(req),
  };
}

function sendError(error: unknown, res: Response, label: string): void {
  if (error instanceof TrialRequestError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return;
  }
  console.error(`Trial request: ${label}`, error);
  res.status(500).json({
    success: false,
    code: "TRIAL_REQUEST_ERROR",
    message: "Something went wrong while processing the trial request.",
  });
}

export const getTrialStatusHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = userIdFrom(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }
  try {
    res.status(200).json({ success: true, data: await trialRequestService.getStatus(userId) });
  } catch (error) {
    sendError(error, res, "get status");
  }
};

export const createTrialRequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = userIdFrom(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }
  try {
    const note = typeof req.body?.note === "string" ? req.body.note : null;
    const request = await trialRequestService.requestTrial(userId, note);
    res.status(201).json({
      success: true,
      message: "Trial request submitted. An owner will review it shortly.",
      data: { request },
    });
  } catch (error) {
    sendError(error, res, "create request");
  }
};

export const listTrialRequestsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawStatus = typeof req.query.status === "string" ? req.query.status : "";
    const status = REVIEW_STATUSES.has(rawStatus as TrialRequestStatus)
      ? (rawStatus as TrialRequestStatus)
      : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    res.status(200).json({
      success: true,
      data: await trialRequestService.listForAdmin({
        status,
        search: search || undefined,
      }),
    });
  } catch (error) {
    sendError(error, res, "list requests");
  }
};

export const approveTrialRequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const requestId = Number(req.params.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    res.status(400).json({ success: false, message: "Invalid trial request id." });
    return;
  }
  try {
    const note = typeof req.body?.note === "string" ? req.body.note : null;
    const result = await trialRequestService.approve(
      requestId,
      actorFromRequest(req),
      note
    );
    res.status(200).json({
      success: true,
      message: "Trial approved and credits granted.",
      data: result,
    });
  } catch (error) {
    sendError(error, res, "approve request");
  }
};

export const rejectTrialRequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const requestId = Number(req.params.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    res.status(400).json({ success: false, message: "Invalid trial request id." });
    return;
  }
  try {
    const note = typeof req.body?.note === "string" ? req.body.note : null;
    const request = await trialRequestService.reject(
      requestId,
      actorFromRequest(req),
      note
    );
    res.status(200).json({
      success: true,
      message: "Trial request rejected.",
      data: { request },
    });
  } catch (error) {
    sendError(error, res, "reject request");
  }
};
