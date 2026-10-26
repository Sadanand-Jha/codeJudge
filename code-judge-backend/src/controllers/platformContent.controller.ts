// Owner-only pricing-page content authoring.
import type { Request, Response } from "express";
import { getClientIp } from "../utils/getClientIp.ts";
import { catalogAdminRepository } from "../repositories/catalogAdmin.repository.ts";
import { writeSubscriptionAudit } from "../services/subscriptionAudit.service.ts";
import type { ActorContext } from "../services/plan.service.ts";

function actorFromRequest(req: Request): ActorContext {
  return {
    actorId: req.user?.userId ? Number(req.user.userId) : null,
    actorRole: "platform_admin",
    ip: getClientIp(req),
  };
}

export const listPageContentHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const content = await catalogAdminRepository.listPageContent();
    res.status(200).json({ success: true, data: { content } });
  } catch (error) {
    console.error("Platform content: list", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const savePageContentDraftHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = actorFromRequest(req);
    const content = req.body.content as Record<string, string>;
    await catalogAdminRepository.saveContentDrafts(content, actor.actorId);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "settings.content_draft_save",
      entityType: "settings",
      entityId: "pricing_page_content",
      after: content,
      ip: actor.ip,
    });
    const rows = await catalogAdminRepository.listPageContent();
    res.status(200).json({ success: true, message: "Content draft saved.", data: { content: rows } });
  } catch (error) {
    console.error("Platform content: save draft", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const publishPageContentHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = actorFromRequest(req);
    const keys = req.body.keys as string[];
    const changed = await catalogAdminRepository.publishContent(keys, actor.actorId);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "settings.content_publish",
      entityType: "settings",
      entityId: "pricing_page_content",
      after: { changed },
      ip: actor.ip,
    });
    const rows = await catalogAdminRepository.listPageContent();
    res.status(200).json({ success: true, message: "Content published.", data: { content: rows } });
  } catch (error) {
    console.error("Platform content: publish", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getPageContentVersionsHandler = async (req: Request, res: Response): Promise<void> => {
  const key = String(req.params.key ?? "").trim();
  try {
    const versions = (await catalogAdminRepository.listVersions("settings", "pricing_page_content", 100)).filter((version) => {
      const after = version.after as Record<string, unknown> | null;
      if (after && typeof after[key] === "string") return true;
      const changed = after?.changed;
      return Array.isArray(changed) && changed.some((entry) => {
        return entry && typeof entry === "object" && (entry as Record<string, unknown>).key === key;
      });
    });
    res.status(200).json({ success: true, data: { versions } });
  } catch (error) {
    console.error("Platform content: versions", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
