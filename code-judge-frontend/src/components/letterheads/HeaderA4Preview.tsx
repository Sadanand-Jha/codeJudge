"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useHeaderPlacement } from "@/hooks/useHeaderPlacement";
import { A4, MARGIN, mmToXPercent, mmToYPercent } from "@/utils/letterheadLayout";
import type { HeaderConfig } from "@/types/letterhead";

interface HeaderA4PreviewProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  config: HeaderConfig;
  compact?: boolean;
}

const CONTENT_WIDTH_PCT = ((A4.w - 2 * MARGIN) / A4.w) * 100;
const CONTENT_LEFT_PCT = mmToXPercent(MARGIN);

export function HeaderA4Preview({
  imageUrl,
  imageWidth,
  imageHeight,
  config,
  compact = false,
}: HeaderA4PreviewProps) {
  const { placement, loading, error, retry } = useHeaderPlacement(
    { pngUrl: imageUrl, width: imageWidth, height: imageHeight },
    config
  );

  const contentTop = placement ? placement.rect.bottom + (placement.gapMm ?? 8) : MARGIN + 8;

  return (
    <div
      className={`relative mx-auto w-full overflow-hidden rounded-[10px] border-2 border-[var(--qs-ink)] bg-white shadow-[4px_4px_0_var(--qs-sun)] ${
        compact ? "max-w-[250px]" : "max-w-[320px]"
      }`}
      style={{ aspectRatio: `${A4.w} / ${A4.h}` }}
      aria-label="A4 header placement preview"
    >
      {placement ? (
        <img
          src={placement.dataUrl}
          alt=""
          className="absolute object-fill"
          style={{
            left: `${mmToXPercent(placement.rect.x)}%`,
            top: `${mmToYPercent(placement.rect.y)}%`,
            width: `${(placement.rect.w / A4.w) * 100}%`,
            height: `${(placement.rect.h / A4.h) * 100}%`,
          }}
        />
      ) : null}

      <div
        className="absolute text-[#1a1240]"
        style={{
          left: `${CONTENT_LEFT_PCT}%`,
          width: `${CONTENT_WIDTH_PCT}%`,
          top: `${mmToYPercent(Math.max(MARGIN, contentTop))}%`,
        }}
      >
        <p className="text-center text-[max(6px,0.65em)] font-extrabold uppercase tracking-[0.12em]">
          Sample Question Paper
        </p>
        <div className="mt-2 space-y-1.5">
          {[92, 84, 96, 76, 88].map((width, index) => (
            <div
              key={`${width}-${index}`}
              className="h-[3px] rounded-full bg-[#1a1240]/15"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>

      <div
        className="absolute text-center text-[max(5px,0.45em)] font-semibold text-[#1a1240]/35"
        style={{
          left: `${CONTENT_LEFT_PCT}%`,
          width: `${CONTENT_WIDTH_PCT}%`,
          bottom: "6%",
        }}
      >
        Page 1 of 1 · QuizSupport
      </div>

      {loading && (
        <span className="absolute inset-0 grid place-items-center bg-white/55">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--qs-brand)]" />
        </span>
      )}
      {error && (
        <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-lg bg-[var(--qs-bad)] px-2 py-1 text-[9px] font-bold text-white">
          {error}
          <button type="button" onClick={retry} aria-label="Retry header preview">
            <RefreshCw className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}
