"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  layoutQuestionPaper,
  footerDateTime,
  type QuizPdfMeta,
  type PaperInput,
  type PdfPageEl,
} from "@/utils/quizPdf";
import type { CreatorQuestion } from "@/components/quiz/creator/types";
import { cn } from "@/lib/helpers";

/**
 * Preview coordinate system: 96dpi CSS pixels.
 *
 * The document is laid out in mm internally (both for the PDF and the shared
 * page model). We render it at its true document sizes in px@96dpi and then
 * apply ONE uniform transform — so the whole page, including every glyph,
 * shrinks/grows together exactly like zooming real paper.
 *
 *   1mm               = PPM (3.78) 96dpi px
 *   1pt of text       = 96/72 px    (browser default pt→px)
 *
 * Keeping both in the same user space is what makes typography proportional
 * to the page.
 */
const PPM = 96 / 25.4; // px per mm @96dpi
const PT_TO_PX = 96 / 72; // px per pt @96dpi

function drawPage(canvas: HTMLCanvasElement, model: { width: number; height: number; els: PdfPageEl[] }, fit: number) {
  const dpr = window.devicePixelRatio || 1;
  const pw = model.width * PPM; // page width in doc px
  const ph = model.height * PPM; // page height in doc px

  canvas.width = Math.max(1, Math.round(pw * fit * dpr));
  canvas.height = Math.max(1, Math.round(ph * fit * dpr));
  canvas.style.width = `${(pw * fit).toFixed(1)}px`;
  canvas.style.height = `${(ph * fit).toFixed(1)}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(fit * dpr, 0, 0, fit * dpr, 0, 0);
  ctx.clearRect(0, 0, pw, ph);

  // Paper surface
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pw, ph);

  const docX = (mm: number) => mm * PPM;
  const docY = (mm: number) => mm * PPM;

  for (const el of model.els) {
    if (el.kind === "text") {
      ctx.fillStyle = "#111111";
      const weight = el.style === "bold" ? "bold" : "normal";
      const slant = el.style === "italic" ? "italic" : "normal";
      ctx.font = `${slant} ${weight} ${(el.sizePt * PT_TO_PX).toFixed(1)}px ${el.css}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(el.text, docX(el.x), docY(el.y));
    } else if (el.kind === "line") {
      ctx.strokeStyle = "#3a3a3a";
      ctx.lineWidth = el.widthMm * PPM;
      ctx.beginPath();
      ctx.moveTo(docX(el.x1), docY(el.y1));
      ctx.lineTo(docX(el.x2), docY(el.y2));
      ctx.stroke();
    } else {
      const img = new Image();
      img.onload = () => {
        const c = canvas.getContext("2d");
        if (!c) return;
        c.save();
        c.setTransform(fit * dpr, 0, 0, fit * dpr, 0, 0);
        c.drawImage(img, docX(el.x), docY(el.y), docX(el.w), docY(el.h));
        c.restore();
      };
      img.src = el.dataUrl;
    }
  }
}

/** Live question-paper preview: a real A4 page, scaled uniformly, with pagination. */
export default function PdfPreview({
  config,
  meta,
  questions,
  student,
}: {
  config: PaperInput["config"];
  meta: QuizPdfMeta;
  questions: CreatorQuestion[];
  student: PaperInput["student"];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [stage, setStage] = useState({ w: 640, h: 540 });

  const models = useMemo(() => {
    const { date, time } = footerDateTime();
    return layoutQuestionPaper({ config, meta, questions, student }, date, time);
  }, [config, meta, questions, student]);

  const total = models.length;
  const current = Math.min(page, Math.max(0, total - 1));

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = models[current];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !model) return;
    const pad = 32;
    const scale = Math.min(
      1,
      (stage.w - pad) / (model.width * PPM),
      (stage.h - pad) / (model.height * PPM)
    );
    drawPage(canvas, model, Math.max(0.01, scale));
  }, [model, stage, page]);

  const dims = model ? `${model.width} × ${model.height} mm` : "";

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Preview strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[13px] font-bold uppercase tracking-wide text-text-muted">
          Live PDF Preview
        </h4>
        {model && (
          <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-semibold text-text-muted">
            {config.page.size === "a4" ? "A4" : "Letter"} •{" "}
            {config.page.orientation === "portrait" ? "Portrait" : "Landscape"} • {dims}
          </span>
        )}
      </div>

      {/* Page stage */}
      <div
        ref={stageRef}
        className="relative flex items-center justify-center overflow-hidden rounded-xl border border-border bg-card-hover/40 p-4"
        style={{ height: 640 }}
      >
        <div className="relative rounded-[3px] bg-white shadow-[0_15px_40px_-12px_rgba(0,0,0,0.5)] ring-1 ring-black/10">
          <canvas ref={canvasRef} style={{ display: "block", maxWidth: "none" }} />
        </div>
        {!model && (
          <p className="text-xs text-text-muted">No page to preview.</p>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={current <= 0}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover",
            current <= 0 && "cursor-not-allowed opacity-40 hover:border-border"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </button>
        <span className="min-w-[92px] text-center text-xs font-semibold text-text-secondary">
          Page {current + 1} of {Math.max(1, total)}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
          disabled={current >= total - 1}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover",
            current >= total - 1 && "cursor-not-allowed opacity-40 hover:border-border"
          )}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}