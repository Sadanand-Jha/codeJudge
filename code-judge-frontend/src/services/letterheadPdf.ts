import { canUseCustomHeader } from "@/lib/planAccess";
import { getDefaultLetterhead } from "@/services/letterheads";
import { getMySubscription } from "@/services/user";
import { prepareHeaderPlacement } from "@/utils/letterheadLayout";
import type { HeaderPlacement } from "@/types/letterhead";

/**
 * Saved-paper downloads do not have a placement panel, so they use the
 * teacher's current default header. Any failure falls back to a standard PDF.
 */
export async function resolveDefaultHeaderPlacement(): Promise<HeaderPlacement | null> {
  try {
    const subscription = await getMySubscription();
    if (!canUseCustomHeader(subscription)) return null;
    const letterhead = await getDefaultLetterhead();
    if (!letterhead) return null;
    return await prepareHeaderPlacement(letterhead.cloudinary, letterhead.headerConfig);
  } catch {
    return null;
  }
}
