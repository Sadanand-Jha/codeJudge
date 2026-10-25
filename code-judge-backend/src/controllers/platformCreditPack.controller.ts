// Owner-only credit-pack catalog management, mounted under
// /api/v1/platform/subscriptions/packs behind requireOwner.
import type { Request, Response } from "express";
import { getClientIp } from "../utils/getClientIp.ts";
import type { ActorContext } from "../services/plan.service.ts";
import {
  CreditPackServiceError,
  creditPackService,
} from "../services/creditPack.service.ts";

function actorFromRequest(req: Request): ActorContext {
  return {
    actorId: req.user?.userId ? Number(req.user.userId) : null,
    actorRole: "platform_admin",
    ip: getClientIp(req),
  };
}

function packIdFromRequest(req: Request, res: Response): number | null {
  const id = Number(req.params.packId);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: "Invalid credit pack id." });
    return null;
  }
  return id;
}

function respondError(error: unknown, res: Response, label: string): void {
  if (error instanceof CreditPackServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });
    return;
  }
  console.error(`Platform credit packs: ${label}`, error);
  res.status(500).json({ success: false, message: "Internal server error." });
}

export const listCreditPacksHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const packs = await creditPackService.listPacks();
    res.status(200).json({ success: true, data: { packs } });
  } catch (error) {
    respondError(error, res, "list packs");
  }
};

export const createCreditPackHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const pack = await creditPackService.createPack(req.body, actorFromRequest(req));
    res.status(201).json({ success: true, message: "Credit pack created.", data: pack });
  } catch (error) {
    respondError(error, res, "create pack");
  }
};

export const updateCreditPackHandler = async (req: Request, res: Response): Promise<void> => {
  const id = packIdFromRequest(req, res);
  if (id === null) return;
  try {
    const pack = await creditPackService.updatePack(id, req.body, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Credit pack updated.", data: pack });
  } catch (error) {
    respondError(error, res, "update pack");
  }
};

export const deleteCreditPackHandler = async (req: Request, res: Response): Promise<void> => {
  const id = packIdFromRequest(req, res);
  if (id === null) return;
  try {
    await creditPackService.deletePack(id, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Credit pack deactivated." });
  } catch (error) {
    respondError(error, res, "delete pack");
  }
};
