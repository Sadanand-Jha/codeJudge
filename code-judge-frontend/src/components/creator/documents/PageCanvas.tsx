"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { GripHorizontal, Move, RotateCw } from "lucide-react";
import type {
  DocumentBlock,
  DocumentPage,
  ExamDocument,
  EditorTool,
} from "@/lib/documentEditor/types";
import { mmToPx, pageDimensions } from "@/lib/documentEditor/types";
import {
  brandingRect,
  clampFreeBlockToPage,
  touchesBrandingZone,
} from "@/lib/documentEditor/branding";
import { computeTotals, questionBlocks } from "@/lib/documentEditor/model";
import { cn } from "@/lib/helpers";
import { BlockRenderer } from "./BlockRenderer";
import { ProtectedBranding } from "./ProtectedBranding";

export interface PageCanvasProps {
  document: ExamDocument;
  page: DocumentPage;
  pageIndex: number;
  pageCount: number;
  zoom: number;
  selected: boolean;
  selectedBlockId: string | null;
  tool: EditorTool;
  showSafeZone: boolean;
  showMarginGuides: boolean;
  editable?: boolean;
  onSelectPage: () => void;
  onSelectBlock: (blockId: string) => void;
  onChangeHtml: (pageId: string, blockId: string, html: string) => void;
  onPatchBlock: (pageId: string, blockId: string, patch: Partial<DocumentBlock>, history?: boolean) => void;
  onTrackChange: (pageId: string, blockId: string, before: string, after: string) => void;
  onStrokeStart: (pageId: string, stroke: { id: string; tool: "pen" | "highlighter"; color: string; width: number; opacity: number; points: Array<{ x: number; y: number }> }) => void;
  onErase: (pageId: string, point: { x: number; y: number }) => void;
  onBlockingWarning: () => void;
}

type DragMode = "move" | "resize" | "rotate";

interface DragState {
  mode: DragMode;
  pageId: string;
  blockId: string;
  startX: number;
  startY: number;
  original: { x: number; y: number; width: number; height: number; rotation: number };
}

const FREE_BLOCK_MIN_WIDTH = 18;
const FREE_BLOCK_MIN_HEIGHT = 6;

export function PageCanvas(props: PageCanvasProps) {
  const {
    document: doc,
    page,
    pageIndex,
    pageCount,
    zoom,
    selected,
    selectedBlockId,
    tool,
    showSafeZone,
    showMarginGuides,
    editable = true,
    onSelectPage,
    onSelectBlock,
    onChangeHtml,
    onPatchBlock,
    onTrackChange,
    onStrokeStart,
    onErase,
    onBlockingWarning,
  } = props;

  const settings = doc.settings;
  const dimensions = pageDimensions(settings);
  const scale = zoom / 100;
  const widthPx = mmToPx(dimensions.width) * scale;
  const heightPx = mmToPx(dimensions.height);
  const zone = brandingRect(settings);
  const totals = useMemo(() => computeTotals(doc), [doc]);
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    questionBlocks(doc).forEach(({ block }, index) => map.set(block.id, block.questionNumber ?? index + 1));
    return map;
  }, [doc]);
  const commentCounts = useMemo(() => {
    const map = new Map<string, number>();
    doc.comments
      .filter((comment) => !comment.resolved)
      .forEach((comment) => map.set(comment.blockId, (map.get(comment.blockId) ?? 0) + 1));
    return map;
  }, [doc.comments]);

  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draftStroke, setDraftStroke] = useState<{
    tool: "pen" | "highlighter";
    color: string;
    width: number;
    opacity: number;
    points: Array<{ x: number; y: number }>;
  } | null>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const check = () => setOverflowing(content.scrollHeight > content.clientHeight + 2);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(content);
    return () => observer.disconnect();
  }, [doc, page, zoom]);

  const toMm = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = pageRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: ((clientX - rect.left) / rect.width) * dimensions.width,
        y: ((clientY - rect.top) / rect.height) * dimensions.height,
      };
    },
    [dimensions.height, dimensions.width]
  );

  useEffect(() => {
    if (!dragState) return;
    const onMove = (event: PointerEvent) => {
      const dx = (event.clientX - dragState.startX) / (mmToPx(1) * scale);
      const dy = (event.clientY - dragState.startY) / (mmToPx(1) * scale);
      const original = dragState.original;
      if (dragState.mode === "move") {
        onPatchBlock(
          dragState.pageId,
          dragState.blockId,
          {
            x: Math.round((original.x + dx) * 10) / 10,
            y: Math.round((original.y + dy) * 10) / 10,
          },
          false
        );
      } else if (dragState.mode === "resize") {
        onPatchBlock(
          dragState.pageId,
          dragState.blockId,
          {
            width: Math.max(FREE_BLOCK_MIN_WIDTH, Math.round((original.width + dx) * 10) / 10),
            height: Math.max(FREE_BLOCK_MIN_HEIGHT, Math.round((original.height + dy) * 10) / 10),
          },
          false
        );
      } else {
        const centerX = original.x + original.width / 2;
        const centerY = original.y + original.height / 2;
        const point = toMm(event.clientX, event.clientY);
        const angle = (Math.atan2(point.y - centerY, point.x - centerX) * 180) / Math.PI + 90;
        onPatchBlock(dragState.pageId, dragState.blockId, { rotation: Math.round(angle) }, false);
      }
    };
    const onUp = () => {
      const block = page.blocks.find((item) => item.id === dragState.blockId);
      if (block) {
        if (dragState.mode === "rotate") {
          onPatchBlock(dragState.pageId, dragState.blockId, { rotation: ((Math.round(block.rotation ?? 0) % 360) + 360) % 360 }, false);
        } else {
          const clamped = clampFreeBlockToPage(block, settings, 2);
          const wasBlocked = touchesBrandingZone(block, settings) || clamped.x !== block.x || clamped.y !== block.y;
          onPatchBlock(dragState.pageId, dragState.blockId, clamped, false);
          if (wasBlocked && block.y !== clamped.y) onBlockingWarning();
        }
      }
      setDragState(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragState, onBlockingWarning, onPatchBlock, page.blocks, scale, settings, toMm]);

  const startDrag = (event: ReactPointerEvent, block: DocumentBlock, mode: DragMode) => {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectBlock(block.id);
    onPatchBlock(page.id, block.id, {}, true);
    setDragState({
      mode,
      pageId: page.id,
      blockId: block.id,
      startX: event.clientX,
      startY: event.clientY,
      original: {
        x: block.x ?? 10,
        y: block.y ?? 10,
        width: block.width ?? 60,
        height: block.height ?? 20,
        rotation: block.rotation ?? 0,
      },
    });
  };

  const beginStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool !== "pen" && tool !== "highlighter" && tool !== "eraser") return;
    const point = toMm(event.clientX, event.clientY);
    if (point.x >= zone.left && point.x <= zone.right && point.y >= zone.top && point.y <= zone.bottom) {
      onBlockingWarning();
      return;
    }
    if (tool === "eraser") {
      onErase(page.id, point);
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      return;
    }
    const color = tool === "highlighter" ? "#ffd23f" : "#1a1240";
    setDraftStroke({
      tool,
      color,
      width: tool === "highlighter" ? 3.2 : 0.45,
      opacity: tool === "highlighter" ? 0.36 : 1,
      points: [point],
    });
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  };

  const continueStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = toMm(event.clientX, event.clientY);
    if (tool === "eraser") {
      if (event.buttons === 1) onErase(page.id, point);
      return;
    }
    if (!draftStroke) return;
    if (point.x >= zone.left && point.x <= zone.right && point.y >= zone.top && point.y <= zone.bottom) return;
    setDraftStroke((stroke) => (stroke ? { ...stroke, points: [...stroke.points, point] } : stroke));
  };

  const endStroke = () => {
    if (!draftStroke || draftStroke.points.length < 2) {
      setDraftStroke(null);
      return;
    }
    onStrokeStart(page.id, {
      id: `stroke_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      ...draftStroke,
    });
    setDraftStroke(null);
  };

  const pageStyle: CSSProperties = {
    width: `${mmToPx(dimensions.width)}px`,
    height: `${heightPx}px`,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    fontFamily: `'${settings.defaultFontFamily}', 'Times New Roman', serif`,
    fontSize: `${settings.defaultFontSize}pt`,
  };

  const chrome = page.chrome && page.kind === "flow";
  const contentTop = chrome ? settings.margins.top : 0;
  const contentBottom = chrome ? Math.max(settings.margins.bottom, 24) : 0;

  return (
    <div className="flex flex-col items-center gap-2" data-page-index={pageIndex}>
      <div
        className="relative"
        style={{ width: `${widthPx}px`, height: `${heightPx * scale}px` }}
      >
        <div
          ref={pageRef}
          data-qs-page={pageIndex + 1}
          data-page-id={page.id}
          role="group"
          aria-label={`Page ${pageIndex + 1} of ${pageCount}`}
          className={cn(
            "paper-page absolute left-0 top-0 overflow-hidden bg-white text-[#111] shadow-[0_10px_35px_rgba(26,18,64,0.18)] ring-1 ring-[#d9d3ef]",
            selected && "ring-2 ring-[var(--qs-brand)]"
          )}
          style={pageStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onSelectPage();
          }}
        >
          {page.background && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.background}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
            />
          )}

          {chrome && doc.chrome.showHeader && (pageIndex > 0 || doc.chrome.showOnFirstPage) && (
            <div
              className="absolute left-0 right-0"
              style={{
                top: `${Math.max(5, settings.margins.top - 7)}mm`,
                left: `${settings.margins.left}mm`,
                right: `${settings.margins.right + zone.width + 4}mm`,
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: doc.chrome.headerHtml }} />
              <div className="mt-[1mm] h-px bg-[#d8d2ef]" />
            </div>
          )}

          <div
            ref={contentRef}
            data-qs-page-content
            className={cn(
              "paper-page-content absolute overflow-hidden",
              settings.columns === 2 && "column-gap-[8mm]"
            )}
            style={{
              top: `${contentTop}mm`,
              left: `${settings.margins.left}mm`,
              right: `${settings.margins.right}mm`,
              bottom: `${contentBottom}mm`,
              columnCount: settings.columns,
              fontSize: `${settings.defaultFontSize}pt`,
              lineHeight: settings.lineHeight,
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                onSelectPage();
              }
            }}
          >
            <div className="flex flex-col gap-[3.2mm]">
              {page.blocks
                .filter((block) => block.placement === "flow")
                .map((block) => {
                  const isSelected = selectedBlockId === block.id;
                  return (
                    <div
                      key={block.id}
                      data-block-id={block.id}
                      className={cn(
                        "relative rounded-[0.8mm] transition-shadow",
                        isSelected && "ring-[1.2pt] ring-[var(--qs-brand)] ring-offset-[1.5mm]"
                      )}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        onSelectBlock(block.id);
                      }}
                    >
                      <BlockRenderer
                        block={block}
                        editable={editable}
                        questionNumber={numbers.get(block.id) ?? 0}
                        sectionMarks={totals.bySection[block.id] ?? block.marks ?? 0}
                        commentCount={commentCounts.get(block.id) ?? 0}
                        onChangeHtml={(html) => onChangeHtml(page.id, block.id, html)}
                        onPatch={(patch) => onPatchBlock(page.id, block.id, patch, false)}
                        onFocus={() => onSelectBlock(block.id)}
                        onBlur={(before, after) => onTrackChange(page.id, block.id, before, after)}
                        onSelect={() => onSelectBlock(block.id)}
                      />
                      {isSelected && editable && (
                        <div className="absolute -right-[7mm] top-0 hidden flex-col gap-[1mm] sm:flex">
                          <button
                            type="button"
                            className="grid h-[5mm] w-[5mm] place-items-center rounded-[1mm] border border-[#d8d2ef] bg-white text-[#5c5679] shadow-sm hover:border-[var(--qs-brand)]"
                            title="Move up"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={() => onPatchBlock(page.id, block.id, {})}
                            aria-label="Block selected"
                          >
                            <GripHorizontal className="h-[3mm] w-[3mm]" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {page.blocks
            .filter((block) => block.placement === "free")
            .sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10))
            .map((block) => {
              const isSelected = selectedBlockId === block.id;
              return (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  className={cn(
                    "doc-free-block absolute",
                    isSelected && editable && "ring-[1.2pt] ring-[var(--qs-brand)]"
                  )}
                  style={{
                    left: `${block.x ?? 10}mm`,
                    top: `${block.y ?? 10}mm`,
                    width: `${block.width ?? 60}mm`,
                    height: `${block.height ?? 20}mm`,
                    transform: `rotate(${block.rotation ?? 0}deg)`,
                    zIndex: block.zIndex ?? 10,
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    onSelectBlock(block.id);
                  }}
                >
                  <BlockRenderer
                    block={block}
                    editable={editable}
                    questionNumber={numbers.get(block.id) ?? 0}
                    sectionMarks={totals.bySection[block.id] ?? block.marks ?? 0}
                    commentCount={commentCounts.get(block.id) ?? 0}
                    onChangeHtml={(html) => onChangeHtml(page.id, block.id, html)}
                    onPatch={(patch) => onPatchBlock(page.id, block.id, patch, false)}
                    onFocus={() => onSelectBlock(block.id)}
                    onBlur={(before, after) => onTrackChange(page.id, block.id, before, after)}
                    onSelect={() => onSelectBlock(block.id)}
                  />
                  {isSelected && editable && (
                    <>
                      <button
                        type="button"
                        className="absolute -left-[4mm] -top-[4mm] grid h-[6mm] w-[6mm] cursor-grab place-items-center rounded-full border-[1.2pt] border-[var(--qs-brand)] bg-white text-[var(--qs-brand)] shadow active:cursor-grabbing"
                        title="Drag block"
                        aria-label="Drag block"
                        onPointerDown={(event) => startDrag(event, block, "move")}
                      >
                        <Move className="h-[3mm] w-[3mm]" />
                      </button>
                      <button
                        type="button"
                        className="absolute -top-[6mm] left-1/2 grid h-[5.5mm] w-[5.5mm] -translate-x-1/2 cursor-grab place-items-center rounded-full border-[1.2pt] border-[var(--qs-brand)] bg-white text-[var(--qs-brand)] shadow active:cursor-grabbing"
                        title="Rotate block"
                        aria-label="Rotate block"
                        onPointerDown={(event) => startDrag(event, block, "rotate")}
                      >
                        <RotateCw className="h-[2.7mm] w-[2.7mm]" />
                      </button>
                      <button
                        type="button"
                        className="absolute -bottom-[2.2mm] -right-[2.2mm] h-[5mm] w-[5mm] cursor-nwse-resize rounded-[0.8mm] border-[1.2pt] border-[var(--qs-brand)] bg-white shadow"
                        title="Resize block"
                        aria-label="Resize block"
                        onPointerDown={(event) => startDrag(event, block, "resize")}
                      />
                    </>
                  )}
                </div>
              );
            })}

          {page.drawings.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
              preserveAspectRatio="none"
              style={{ zIndex: 40 }}
              aria-hidden="true"
            >
              {page.drawings.map((stroke) =>
                stroke.points.length > 1 ? (
                  <polyline
                    key={stroke.id}
                    points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeOpacity={stroke.opacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null
              )}
            </svg>
          )}

          {(tool === "pen" || tool === "highlighter" || tool === "eraser") && (
            <svg
              className={cn(
                "absolute inset-0 h-full w-full touch-none",
                tool === "eraser" ? "cursor-cell" : "cursor-crosshair"
              )}
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
              preserveAspectRatio="none"
              style={{ zIndex: 60 }}
              onPointerDown={beginStroke}
              onPointerMove={continueStroke}
              onPointerUp={endStroke}
              onPointerCancel={() => setDraftStroke(null)}
              aria-label={tool === "eraser" ? "Eraser drawing layer" : "Drawing layer"}
            >
              {draftStroke && draftStroke.points.length > 1 && (
                <polyline
                  points={draftStroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke={draftStroke.color}
                  strokeWidth={draftStroke.width}
                  strokeOpacity={draftStroke.opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          )}

          {chrome && doc.chrome.showFooter && (
            <div
              className="absolute flex items-center gap-[3mm] border-t border-[#d8d2ef] pt-[1.8mm] text-[8.5pt] text-[#5c5679]"
              style={{
                left: `${settings.margins.left}mm`,
                right: `${settings.margins.right}mm`,
                bottom: "5.5mm",
                height: "8mm",
              }}
            >
              <div
                className="min-w-0 flex-1 truncate"
                dangerouslySetInnerHTML={{ __html: doc.chrome.footerLeftHtml }}
              />
              {doc.chrome.showPageNumbers && (
                <span className="shrink-0 tabular-nums">
                  Page {pageIndex + 1} of {pageCount}
                </span>
              )}
              <span className="shrink-0" style={{ width: `${zone.width + 3}mm` }} aria-hidden="true" />
            </div>
          )}

          {overflowing && chrome && (
            <div className="absolute bottom-[21mm] right-[6mm] z-[70] rounded-full border border-[#f0b7bb] bg-[#fff1f2] px-[2.5mm] py-[1mm] text-[6.5pt] font-bold text-[#b4232e]">
              Content crosses the footer safe zone
            </div>
          )}

          {showMarginGuides && (
            <div className="pointer-events-none absolute inset-0" style={{ zIndex: 80 }} aria-hidden="true">
              <div
                className="absolute border border-dashed border-[#b9b1dc]"
                style={{
                  top: `${settings.margins.top}mm`,
                  left: `${settings.margins.left}mm`,
                  right: `${settings.margins.right}mm`,
                  bottom: `${Math.max(settings.margins.bottom, 24)}mm`,
                }}
              />
            </div>
          )}

          {showSafeZone && (
            <div
              className="pointer-events-none absolute rounded-[1mm] border border-dashed border-[#b4232e]/60 bg-[#fff1f2]/20"
              style={{
                left: `${zone.left}mm`,
                top: `${zone.top}mm`,
                width: `${zone.width}mm`,
                height: `${zone.height}mm`,
                zIndex: 2147483000,
              }}
              aria-hidden="true"
            />
          )}

          <ProtectedBranding settings={settings} />
        </div>
      </div>
      <p className="text-[11px] font-semibold text-[var(--qs-muted)]" aria-hidden="true">
        Page {pageIndex + 1}
        <span className="ml-2 font-normal">{overflowing ? "· content overflow" : ""}</span>
      </p>
    </div>
  );
}

export function LazyPage({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled || visible) return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1200px 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, visible]);

  return <div ref={ref}>{visible ? children : <div className="h-[1123px] w-[794px] max-w-full animate-pulse rounded-sm bg-white/70" />}</div>;
}
