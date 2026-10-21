import type { DocumentBlock, DocumentSettings } from "./types";
import { pageDimensions } from "./types";

/**
 * The branding layer is deliberately NOT part of ExamDocument. It lives in
 * this frozen module, is rendered by ProtectedBranding, and is re-created from
 * the same trusted definition by the export service. There is no editable copy
 * for a user to locate, remove or corrupt.
 */
export const BRANDING = Object.freeze({
  name: "QuizSupport",
  tagline: "Practice. Compete. Excel.",
  system: true as const,
  locked: true as const,
  opacity: 1,
  safeArea: Object.freeze({
    widthMm: 46,
    heightMm: 13,
    rightMm: 8,
    bottomMm: 6,
  }),
});

export const BRANDING_ATTRIBUTE = "data-qs-protected-branding";
export const BRANDING_SELECTOR = `[${BRANDING_ATTRIBUTE}="true"]`;

export function brandingName(): string {
  return BRANDING.name;
}

export function brandingRect(settings: DocumentSettings): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} {
  const page = pageDimensions(settings);
  const width = BRANDING.safeArea.widthMm;
  const height = BRANDING.safeArea.heightMm;
  const right = page.width - BRANDING.safeArea.rightMm;
  const bottom = page.height - BRANDING.safeArea.bottomMm;
  return {
    left: right - width,
    top: bottom - height,
    right,
    bottom,
    width,
    height,
  };
}

export function touchesBrandingZone(
  block: Pick<DocumentBlock, "x" | "y" | "width" | "height" | "placement">,
  settings: DocumentSettings
): boolean {
  if (block.placement !== "free") return false;
  const zone = brandingRect(settings);
  const x = block.x ?? 0;
  const y = block.y ?? 0;
  const width = block.width ?? 48;
  const height = block.height ?? 16;
  return x < zone.right && x + width > zone.left && y < zone.bottom && y + height > zone.top;
}

export function clampFreeBlockToPage(
  block: Pick<DocumentBlock, "x" | "y" | "width" | "height" | "rotation">,
  settings: DocumentSettings,
  paddingMm = 0
): { x: number; y: number; width: number; height: number; rotation: number } {
  const page = pageDimensions(settings);
  const zone = brandingRect(settings);
  const width = Math.max(8, Math.min(block.width ?? 48, page.width - paddingMm * 2));
  const height = Math.max(6, Math.min(block.height ?? 16, page.height - paddingMm * 2));
  const x = Math.max(paddingMm, Math.min(block.x ?? 0, page.width - width - paddingMm));
  let y = Math.max(paddingMm, Math.min(block.y ?? 0, page.height - height - paddingMm));

  const overlapsZone = x < zone.right && x + width > zone.left && y < zone.bottom && y + height > zone.top;
  if (overlapsZone) {
    if (y + height > zone.top && y < zone.bottom) {
      if (y + height / 2 < zone.top + zone.height / 2) {
        y = Math.max(paddingMm, zone.top - height - 0.8);
      } else {
        y = Math.min(page.height - height - paddingMm, zone.bottom + 0.8);
      }
    }
  }

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
    rotation: block.rotation ?? 0,
  };
}

export function stripBrandingText(value: string): string {
  return value
    .replace(/quiz\s*support/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function containsBrandingText(value: string): boolean {
  return /quiz\s*support/i.test(value);
}

/** Returns true when a DOM node (or one of its ancestors) is protected. */
export function isProtectedBrandingNode(node: Node | null): boolean {
  if (!node) return false;
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === 1) {
      const element = current as HTMLElement;
      if (element.getAttribute(BRANDING_ATTRIBUTE) === "true") return true;
      if (element.dataset?.system === "true" && element.dataset?.locked === "true") return true;
    }
    current = current.parentNode;
  }
  return false;
}

/**
 * Defence-in-depth for the editor. Branding is not inside any contentEditable
 * so browsers cannot mutate it, but a malicious paste/extension can inject
 * markup. Remove any attempt to create a fake or replace the real layer.
 */
export function removeFakeBrandingNodes(root: ParentNode): void {
  root.querySelectorAll(BRANDING_SELECTOR).forEach((node) => {
    if (!node.closest("[data-qs-editor-root]")) return;
    node.remove();
  });
  root.querySelectorAll<HTMLElement>("[data-qs-branding-spoof]").forEach((node) => node.remove());
}

export function canDeleteTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object" || !("nodeType" in target)) return true;
  return !isProtectedBrandingNode(target as Node);
}

/**
 * Server-export-safe statement of the lock. The backend uses the same checks
 * against the trusted layer and refuses to export if any invariant is broken.
 */
export function brandingInvariants(input: {
  locked: boolean;
  system: boolean;
  opacity: number;
  visible: boolean;
  topMost: boolean;
  covered: boolean;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.locked) errors.push("branding must be locked");
  if (!input.system) errors.push("branding must be a system layer");
  if (input.opacity !== 1) errors.push("branding opacity must be 100%");
  if (!input.visible) errors.push("branding must be visible");
  if (!input.topMost) errors.push("branding must be above editable content");
  if (input.covered) errors.push("branding must not be covered");
  return { ok: errors.length === 0, errors };
}
