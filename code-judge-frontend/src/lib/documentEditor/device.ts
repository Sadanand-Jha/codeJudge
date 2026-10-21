export interface PaperStudioDeviceSignals {
  viewportWidth: number;
  userAgent: string;
  maxTouchPoints: number;
  coarsePointer: boolean;
}

/**
 * Paper Studio is intentionally desktop-only. Phones and tablets get a
 * clear hand-off screen instead of mounting the editor.
 */
export function shouldOpenPaperStudioOnDesktop(input: PaperStudioDeviceSignals): boolean {
  const mobileUserAgent = /android|iphone|ipad|ipod|iemobile|windows phone|mobile/i.test(input.userAgent);
  const tabletLikeTouch = input.maxTouchPoints > 1 && input.coarsePointer;
  return input.viewportWidth >= 1024 && !mobileUserAgent && !tabletLikeTouch;
}
