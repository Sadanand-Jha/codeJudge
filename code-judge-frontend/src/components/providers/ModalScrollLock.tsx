"use client";

import { useEffect } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

const MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"], [data-modal]';
const FIXED_SELECTOR = '.fixed, [style*="position: fixed"], [style*="position:fixed"]';
const MODAL_MIN_Z_INDEX = 40;
const GUARD_MIN_Z_INDEX = 50;

function parseAlphaValue(raw: string): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 1;
  return raw.trim().endsWith("%") ? value / 100 : value;
}

function parseAlpha(color: string): number {
  if (!color || color === "transparent") return 0;

  const open = color.indexOf("(");
  const close = color.lastIndexOf(")");
  if (open === -1 || close === -1) return 1;

  const body = color.slice(open + 1, close).trim();
  const slash = body.lastIndexOf("/");
  if (slash !== -1) {
    return parseAlphaValue(body.slice(slash + 1));
  }

  if (color.startsWith("rgba") || color.startsWith("hsla")) {
    const parts = body.split(",").map((part) => part.trim());
    if (parts.length >= 4) return parseAlphaValue(parts[3]);
  }

  return 1;
}

function isVisible(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;

  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (style.pointerEvents === "none") return false;

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function zIndex(el: HTMLElement): number {
  const value = Number.parseInt(window.getComputedStyle(el).zIndex, 10);
  return Number.isFinite(value) ? value : 0;
}

function coversViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.width >= window.innerWidth * 0.9 &&
    rect.height >= window.innerHeight * 0.75
  );
}

function isFullScreenFixed(el: HTMLElement): boolean {
  if (!isVisible(el)) return false;
  if (window.getComputedStyle(el).position !== "fixed") return false;
  return coversViewport(el);
}

function hasTranslucentBackground(el: HTMLElement): boolean {
  const alpha = parseAlpha(window.getComputedStyle(el).backgroundColor);
  return alpha > 0.05 && alpha < 0.99;
}

function hasBackdropChild(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();

  for (const child of Array.from(el.children)) {
    if (!(child instanceof HTMLElement)) continue;

    const style = window.getComputedStyle(child);
    if (style.position !== "absolute" && style.position !== "fixed") continue;
    if (style.pointerEvents === "none") continue;

    const childRect = child.getBoundingClientRect();
    if (childRect.width < rect.width * 0.9 || childRect.height < rect.height * 0.9) {
      continue;
    }

    const alpha = parseAlpha(style.backgroundColor);
    if (alpha > 0.05 && alpha < 0.99) return true;
  }

  return false;
}

function isSemanticModal(el: HTMLElement): boolean {
  return isVisible(el) && el.matches(MODAL_SELECTOR);
}

function shouldLockPage(el: HTMLElement): boolean {
  if (isSemanticModal(el)) return true;
  if (!isFullScreenFixed(el)) return false;

  const z = zIndex(el);
  if (z < MODAL_MIN_Z_INDEX) return false;

  // High-z full-screen fixed containers are dialog surfaces even when their
  // backdrop is rendered by a sibling or their own background is transparent.
  return z >= GUARD_MIN_Z_INDEX || hasTranslucentBackground(el) || hasBackdropChild(el);
}

function isOverlayRoot(el: HTMLElement): boolean {
  if (isSemanticModal(el)) return true;
  if (!isFullScreenFixed(el)) return false;

  const z = zIndex(el);
  if (z < MODAL_MIN_Z_INDEX) return false;
  return hasTranslucentBackground(el) || hasBackdropChild(el) || z >= GUARD_MIN_Z_INDEX;
}

function findOverlayRoot(target: EventTarget | null): HTMLElement | null {
  let el = target instanceof Element ? target : null;

  while (el && el !== document.body) {
    if (el instanceof HTMLElement && isOverlayRoot(el)) return el;
    el = el.parentElement;
  }

  return null;
}

function canScrollInside(
  target: EventTarget | null,
  root: HTMLElement,
  deltaY: number
): boolean {
  let el = target instanceof Element ? target : null;

  while (el) {
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const scrollable =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        el.scrollHeight > el.clientHeight + 1;

      if (scrollable) {
        if (deltaY < 0 && el.scrollTop > 0) return true;
        if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) {
          return true;
        }
      }
    }

    if (el === root) break;
    el = el.parentElement;
  }

  return false;
}

function hasOpenModal(): boolean {
  for (const el of Array.from(document.querySelectorAll(FIXED_SELECTOR))) {
    if (el instanceof HTMLElement && shouldLockPage(el)) return true;
  }

  for (const el of Array.from(document.querySelectorAll(MODAL_SELECTOR))) {
    if (el instanceof HTMLElement && isSemanticModal(el)) return true;
  }

  return false;
}

/**
 * App-wide safety net for modal overlays that don't use a shared dialog
 * primitive: locks page scroll while any modal is mounted and prevents wheel /
 * touch scrolling from chaining to the page behind the overlay.
 */
export default function ModalScrollLock() {
  useEffect(() => {
    let locked = false;
    let frame = 0;
    let touchStartY = 0;
    let disposed = false;

    const sync = () => {
      frame = 0;
      if (disposed) return;

      const next = hasOpenModal();
      if (next === locked) return;

      locked = next;
      if (next) lockBodyScroll();
      else unlockBodyScroll();
    };

    const scheduleSync = () => {
      if (disposed || frame !== 0) return;
      frame = window.requestAnimationFrame(sync);
    };

    const onWheel = (event: WheelEvent) => {
      const root = findOverlayRoot(event.target);
      if (!root) return;
      if (!canScrollInside(event.target, root, event.deltaY)) {
        event.preventDefault();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      const root = findOverlayRoot(event.target);
      if (!root) return;

      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined) return;

      const deltaY = touchStartY - currentY;
      if (!canScrollInside(event.target, root, deltaY)) {
        event.preventDefault();
      }
    };

    scheduleSync();

    const isModalNode = (node: Node): boolean => {
      if (!(node instanceof Element)) return false;
      return (
        node.matches(FIXED_SELECTOR) ||
        node.matches(MODAL_SELECTOR) ||
        node.querySelector(`${FIXED_SELECTOR}, ${MODAL_SELECTOR}`) !== null
      );
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const target = mutation.target;
          if (
            target instanceof Element &&
            (target.matches(FIXED_SELECTOR) ||
              target.matches(MODAL_SELECTOR) ||
              target.closest(FIXED_SELECTOR) ||
              target.closest(MODAL_SELECTOR) ||
              target.querySelector(`${FIXED_SELECTOR}, ${MODAL_SELECTOR}`) !== null)
          ) {
            scheduleSync();
            return;
          }
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (isModalNode(node)) {
            scheduleSync();
            return;
          }
        }

        for (const node of mutation.removedNodes) {
          if (isModalNode(node)) {
            scheduleSync();
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden", "aria-modal", "role", "data-modal"],
    });

    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    window.addEventListener("resize", scheduleSync);
    document.addEventListener("click", scheduleSync, true);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("resize", scheduleSync);
      document.removeEventListener("click", scheduleSync, true);
      if (frame) window.cancelAnimationFrame(frame);
      if (locked) unlockBodyScroll();
    };
  }, []);

  return null;
}
