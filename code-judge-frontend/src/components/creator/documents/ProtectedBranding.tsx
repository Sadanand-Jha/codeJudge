"use client";

import { Lock } from "lucide-react";
import {
  BRANDING,
  BRANDING_ATTRIBUTE,
  brandingRect,
} from "@/lib/documentEditor/branding";
import type { DocumentSettings } from "@/lib/documentEditor/types";

/**
 * This component is the only place the brand exists in the editor. It is
 * intentionally rendered outside every contentEditable, cannot be focused,
 * selected, dragged or deleted, and sits at the maximum z-index.
 */
export function ProtectedBranding({ settings }: { settings: DocumentSettings }) {
  const zone = brandingRect(settings);
  return (
    <div
      {...{ [BRANDING_ATTRIBUTE]: "true" }}
      data-qs-branding-spoof="false"
      data-locked="true"
      data-system="true"
      contentEditable={false}
      suppressContentEditableWarning
      aria-label={`${BRANDING.name} — protected branding`}
      className="qs-protected-branding pointer-events-none absolute select-none"
      style={{
        left: `${zone.left}mm`,
        top: `${zone.top}mm`,
        width: `${zone.width}mm`,
        height: `${zone.height}mm`,
        zIndex: 2147483647,
        opacity: 1,
      }}
    >
      <div className="flex h-full w-full items-center justify-end gap-[2.2mm]">
        <span
          className="grid shrink-0 place-items-center rounded-[1.4mm] bg-[#1a1240] text-white"
          style={{ width: "7.5mm", height: "7.5mm" }}
          aria-hidden="true"
        >
          <span className="font-black leading-none" style={{ fontSize: "3.1mm", letterSpacing: "-0.04em" }}>
            QS
          </span>
        </span>
        <span className="min-w-0 leading-none">
          <span className="block font-extrabold tracking-tight text-[#1a1240]" style={{ fontSize: "3.2mm" }}>
            QuizSupport
          </span>
          <span className="mt-[0.6mm] block font-semibold uppercase tracking-[0.16em] text-[#5c5679]" style={{ fontSize: "1.35mm" }}>
            {BRANDING.tagline}
          </span>
        </span>
        <span
          className="pointer-events-auto ml-[0.4mm] grid shrink-0 cursor-help place-items-center rounded-full border border-[#d8d2ef] bg-white text-[#5c5679]"
          style={{ width: "4.2mm", height: "4.2mm" }}
          title="Branding is protected."
          aria-label="Branding is protected."
        >
          <Lock style={{ width: "2.25mm", height: "2.25mm" }} strokeWidth={2.6} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
