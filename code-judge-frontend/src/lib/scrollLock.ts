type ScrollLockSnapshot = {
  bodyOverflow: string;
  htmlOverflow: string;
  bodyPaddingRight: string;
  bodyOverscrollBehavior: string;
  htmlOverscrollBehavior: string;
};

let lockCount = 0;
let snapshot: ScrollLockSnapshot | null = null;

function getScrollbarWidth(): number {
  if (typeof window === "undefined") return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

/**
 * Reference-counted page scroll lock. Multiple overlays can request the lock;
 * the page is only restored when the last one releases it.
 */
export function lockBodyScroll(): void {
  if (typeof window === "undefined") return;

  lockCount += 1;
  if (lockCount > 1) return;

  const body = document.body;
  const html = document.documentElement;
  const scrollbarWidth = getScrollbarWidth();
  const computedPaddingRight = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;

  snapshot = {
    bodyOverflow: body.style.overflow,
    htmlOverflow: html.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    bodyOverscrollBehavior: body.style.overscrollBehavior,
    htmlOverscrollBehavior: html.style.overscrollBehavior,
  };

  body.style.overflow = "hidden";
  html.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
  html.style.overscrollBehavior = "none";

  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
  }
}

export function unlockBodyScroll(): void {
  if (typeof window === "undefined") return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount > 0 || !snapshot) return;

  const body = document.body;
  const html = document.documentElement;

  body.style.overflow = snapshot.bodyOverflow;
  html.style.overflow = snapshot.htmlOverflow;
  body.style.paddingRight = snapshot.bodyPaddingRight;
  body.style.overscrollBehavior = snapshot.bodyOverscrollBehavior;
  html.style.overscrollBehavior = snapshot.htmlOverscrollBehavior;
  snapshot = null;
}
