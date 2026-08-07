/**
 * useAvatarHover — hover state controller for the animated participant crowd.
 *
 * Coordinates between the `<AnimatedCrowd />` (which fires raw hover callbacks
 * as the cursor moves over avatars) and the `<AvatarHoverPreview />` card
 * (which keeps itself open while the cursor is over it).
 *
 * Returned callbacks:
 *   - show(p):         open the preview for `p` immediately (cancel pending hide)
 *   - armHide():       schedule a delayed hide (called when the cursor leaves
 *                      every avatar / card)
 *   - cancelHide():    cancel the pending hide (called when the cursor re-enters
 *                      the preview card)
 *   - hideNow():       force an immediate hide (e.g. window blur)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveParticipant } from "@/types/liveAssessment";

/** Delay before the preview card hides once armed (ms). */
const HIDE_DELAY_MS = 250;

export function useAvatarHover() {
  const [hovered, setHovered] = useState<LiveParticipant | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Open the preview for a participant right away and drop any pending hide.
  const show = useCallback(
    (participant: LiveParticipant) => {
      clearHideTimer();
      setHovered(participant);
    },
    [clearHideTimer]
  );

  // Schedule the delayed hide (cursor left every avatar and the card).
  const armHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setHovered(null);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer]);

  // Cancel a scheduled hide (cursor re-entered the card).
  const cancelHide = useCallback(() => {
    clearHideTimer();
  }, [clearHideTimer]);

  // Hide immediately (window blur etc.).
  const hideNow = useCallback(() => {
    clearHideTimer();
    setHovered(null);
  }, [clearHideTimer]);

  // Always clear any pending timer on unmount.
  useEffect(() => clearHideTimer, [clearHideTimer]);

  return { hovered, show, armHide, cancelHide, hideNow };
}

export default useAvatarHover;
