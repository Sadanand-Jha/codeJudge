// Redis-backed cooldown between PDF downloads. Paid monthly subscribers export
// without a cooldown; free users wait 1 minute. The key is written before
// rendering (atomic SET NX) and removed again when the request fails, so a
// failed export never costs the user their cooldown.
import type { NextFunction, Request, Response } from "express";
import redisClient from "../config/redis.ts";
import { getEntitlements } from "../services/entitlement.service.ts";

const FREE_COOLDOWN_SECONDS = 60;
const KEY_PREFIX = "pdf_download_cooldown";

export async function pdfDownloadCooldown(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  // The shared exporter also produces DOCX/HTML/PNG; only PDF downloads count.
  const format = (req.body as { format?: unknown } | undefined)?.format;
  if (typeof format === "string" && format !== "pdf") {
    next();
    return;
  }

  let isPaid = false;
  try {
    const entitlements = await getEntitlements(userId);
    isPaid = entitlements.isPaid;
  } catch (error) {
    console.warn("pdfDownloadCooldown entitlement lookup failed (fail-open):", error);
    next();
    return;
  }

  // Monthly subscribers get unlimited PDF exports; only free users are throttled.
  if (isPaid) {
    res.setHeader("X-Pdf-Cooldown-Seconds", "0");
    next();
    return;
  }

  const cooldownSeconds = FREE_COOLDOWN_SECONDS;
  const key = `${KEY_PREFIX}:${userId}`;

  let acquired: string | null = null;
  try {
    acquired = await redisClient.set(key, "1", { NX: true, EX: cooldownSeconds });
  } catch (error) {
    console.warn("pdfDownloadCooldown set failed (fail-open):", error);
    next();
    return;
  }

  if (!acquired) {
    let retryAfter = cooldownSeconds;
    try {
      const ttl = await redisClient.ttl(key);
      if (ttl > 0) retryAfter = ttl;
    } catch {
      // Use the default cooldown when the TTL lookup fails.
    }

    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      success: false,
      code: "PDF_COOLDOWN",
      message: `Please wait ${retryAfter} second${retryAfter === 1 ? "" : "s"} before downloading another PDF.`,
      statusCode: 429,
      retryAfter,
    });
    return;
  }

  // A failed render should not lock the user out for the full cooldown.
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      void redisClient.del(key).catch(() => {});
    }
  });

  res.setHeader("X-Pdf-Cooldown-Seconds", String(cooldownSeconds));
  next();
}

export default pdfDownloadCooldown;
