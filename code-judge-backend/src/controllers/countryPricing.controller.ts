import type { Request, Response } from "express";
import * as countryPricingRepository from "../repositories/countryPricing.repository.ts";
import { getCurrencyMinorUnitExponent } from "../services/countryPricing.service.ts";

function respondError(error: unknown, res: Response, action: string): void {
  if (error instanceof RangeError) {
    res.status(400).json({ success: false, message: "Currency code is not supported." });
    return;
  }
  console.error(`Country pricing: ${action} failed`, error);
  res.status(500).json({ success: false, message: "Could not update country pricing." });
}

export const listCountryPricingHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await countryPricingRepository.listAdminPricing();
    res.status(200).json({ success: true, data });
  } catch (error) {
    respondError(error, res, "list");
  }
};

async function savePricingVersion(
  req: Request,
  res: Response,
  countryCode: string | null,
  isFallback: boolean
): Promise<void> {
  try {
    const { currency, amountMajor, isActive } = req.body as {
      currency: string;
      amountMajor: number;
      isActive: boolean;
    };
    const minorUnitExponent = getCurrencyMinorUnitExponent(currency);
    const scaledAmount = amountMajor * 10 ** minorUnitExponent;
    const amountMinor = Math.round(scaledAmount);
    if (Math.abs(scaledAmount - amountMinor) > 1e-8) {
      res.status(400).json({
        success: false,
        message: `Price supports at most ${minorUnitExponent} decimal places for ${currency}.`,
      });
      return;
    }
    if (!Number.isSafeInteger(amountMinor)) {
      res.status(400).json({ success: false, message: "Price is outside the supported range." });
      return;
    }
    const price = await countryPricingRepository.createPricingVersion({
      countryCode,
      currency,
      amountMajor: amountMinor / 10 ** minorUnitExponent,
      amountMinor,
      minorUnitExponent,
      isFallback,
      isActive,
      actorId: req.user?.userId ? Number(req.user.userId) : null,
    });
    res.status(200).json({ success: true, message: "Country price saved.", data: { price } });
  } catch (error) {
    respondError(error, res, "save");
  }
}

export const updateCountryPricingHandler = async (req: Request, res: Response): Promise<void> => {
  const countryCode = String(req.params.countryCode ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    res.status(400).json({ success: false, message: "Invalid ISO country code." });
    return;
  }
  await savePricingVersion(req, res, countryCode, false);
};

export const updateFallbackPricingHandler = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { isActive?: unknown };
  if (body.isActive !== true) {
    res.status(400).json({
      success: false,
      message: "Fallback pricing must remain active.",
    });
    return;
  }
  await savePricingVersion(req, res, null, true);
};
