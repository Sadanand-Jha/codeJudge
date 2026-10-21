"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Baseline,
  Bold,
  Check,
  Code2,
  Columns,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  FilePlus2,
  GalleryVerticalEnd,
  Grid3X3,
  Highlighter,
  Image,
  IndentDecrease,
  IndentIncrease,
  Italic,
  LayoutTemplate,
  List,
  ListOrdered,
  Lock,
  Maximize,
  MessageSquare,
  Minus,
  MousePointer2,
  PanelBottom,
  PanelLeft,
  PenLine,
  Redo2,
  RemoveFormatting,
  Rows,
  Ruler,
  Search,
  Shapes,
  Sigma,
  Square,
  StickyNote,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TextCursorInput,
  Trash2,
  Type,
  Underline,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import type {
  DocumentBlock,
  DocumentSettings,
  ExamDocument,
  ListKind,
} from "@/lib/documentEditor/types";
import { cn } from "@/lib/helpers";

export type RibbonTab = "home" | "insert" | "layout" | "review" | "view";

const TABS: Array<{ id: RibbonTab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "insert", label: "Insert" },
  { id: "layout", label: "Layout" },
  { id: "review", label: "Review" },
  { id: "view", label: "View" },
];

const FONT_FAMILIES = [
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Arial",
  "Helvetica",
  "Calibri",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Noto Sans",
  "Noto Sans Devanagari",
];

const FONT_SIZES = [8, 9, 9.5, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-stretch gap-1 border-r border-[var(--qs-line)] px-2 last:border-r-0">
      <div className="flex flex-col justify-between gap-0.5">
        <div className="flex items-center gap-0.5">{children}</div>
        <span className="pl-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#9a94b8]">{label}</span>
      </div>
    </div>
  );
}

function RB({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-[5px] text-[#3d355f] transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-35",
        active && "bg-[#ede7ff] text-[var(--qs-brand)] shadow-sm",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function Select({
  value,
  onChange,
  ariaLabel,
  width = "w-[118px]",
  children,
  title,
}: {
  value: string | number;
  onChange: (value: string) => void;
  ariaLabel: string;
  width?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      title={title}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-1 text-[11px] font-semibold text-[#3d355f] outline-none focus:border-[var(--qs-brand)]",
        width
      )}
    >
      {children}
    </select>
  );
}

export interface EditorRibbonProps {
  tab: RibbonTab;
  onTabChange: (tab: RibbonTab) => void;
  document: ExamDocument;
  currentPageId: string;
  selectedBlock: DocumentBlock | null;
  activeTool: string;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  showThumbnails: boolean;
  showSafeZone: boolean;
  showMarginGuides: boolean;
  trackChanges: boolean;
  pendingChanges: number;
  commentsCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onExec: (command: string, value?: string) => void;
  onFontFamily: (family: string) => void;
  onFontSize: (size: number) => void;
  onList: (kind: ListKind) => void;
  onPatchBlock: (patch: Partial<DocumentBlock>) => void;
  onInsert: (kind: "textbox" | "image" | "shape" | "line" | "table" | "equation" | "code" | "signature" | "field" | "note" | "divider" | "pagebreak" | "symbol") => void;
  onInsertSymbol: (symbol: string) => void;
  onOpenChrome: () => void;
  onImportPdf: () => void;
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
  onMovePage: (direction: -1 | 1) => void;
  onUpdateSettings: (patch: Partial<DocumentSettings>) => void;
  onFind: () => void;
  onToggleComments: () => void;
  onToggleTrackChanges: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAutoRenumber: () => void;
  onZoom: (zoom: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onToggleThumbnails: () => void;
  onToggleSafeZone: () => void;
  onToggleMarginGuides: () => void;
  onFullscreen: () => void;
  onTableAction: (action: "add-row" | "add-col" | "delete-row" | "delete-col" | "merge" | "split" | "shade" | "border") => void;
  onToolChange: (tool: "select" | "pen" | "highlighter" | "eraser") => void;
  canEdit: boolean;
}

export function EditorRibbon(props: EditorRibbonProps) {
  const {
    tab,
    onTabChange,
    document: doc,
    selectedBlock,
    canUndo,
    canRedo,
    zoom,
    showThumbnails,
    showSafeZone,
    showMarginGuides,
    trackChanges,
    pendingChanges,
    commentsCount,
  } = props;

  return (
    <div className="shrink-0 border-b-2 border-[var(--qs-line)] bg-[#f7f5ff]">
      <div className="flex items-center gap-1 px-3 pt-1" role="tablist" aria-label="Editor ribbon">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "relative rounded-t-md px-3 py-1.5 text-[11px] font-bold transition",
              tab === item.id
                ? "bg-white text-[var(--qs-brand)] shadow-[0_-1px_0_var(--qs-line),1px_0_0_var(--qs-line),-1px_0_0_var(--qs-line)]"
                : "text-[var(--qs-muted)] hover:bg-white/60 hover:text-[var(--qs-ink)]"
            )}
          >
            {item.label}
            {item.id === "review" && pendingChanges > 0 && (
              <span className="ml-1 rounded-full bg-[#ffd23f] px-1 text-[8px] font-black text-[#1a1240]">{pendingChanges}</span>
            )}
            {item.id === "review" && commentsCount > 0 && pendingChanges === 0 && (
              <span className="ml-1 rounded-full bg-[#ede7ff] px-1 text-[8px] font-black text-[var(--qs-brand)]">{commentsCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex min-h-[72px] items-center overflow-x-auto bg-white px-1 py-1.5">
        {tab === "home" && (
          <>
            <RibbonGroup label="History">
              <RB icon={Undo2} label="Undo (Ctrl+Z)" onClick={props.onUndo} disabled={!canUndo || !props.canEdit} />
              <RB icon={Redo2} label="Redo (Ctrl+Y)" onClick={props.onRedo} disabled={!canRedo || !props.canEdit} />
            </RibbonGroup>
            <RibbonGroup label="Font">
              <Select
                value={selectedBlock?.fontFamily || doc.settings.defaultFontFamily}
                onChange={props.onFontFamily}
                ariaLabel="Font family"
                width="w-[132px]"
                title="Font family"
              >
                {FONT_FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </Select>
              <Select
                value={selectedBlock?.fontSize || doc.settings.defaultFontSize}
                onChange={(value) => props.onFontSize(Number(value))}
                ariaLabel="Font size"
                width="w-[54px]"
                title="Font size (pt)"
              >
                {FONT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
              <RB icon={Bold} label="Bold (Ctrl+B)" onClick={() => props.onExec("bold")} />
              <RB icon={Italic} label="Italic (Ctrl+I)" onClick={() => props.onExec("italic")} />
              <RB icon={Underline} label="Underline (Ctrl+U)" onClick={() => props.onExec("underline")} />
              <RB icon={Strikethrough} label="Strikethrough" onClick={() => props.onExec("strikeThrough")} />
              <RB icon={Subscript} label="Subscript" onClick={() => props.onExec("subscript")} />
              <RB icon={Superscript} label="Superscript" onClick={() => props.onExec("superscript")} />
            </RibbonGroup>
            <RibbonGroup label="Colour & effects">
              <label className="grid h-7 w-7 cursor-pointer place-items-center rounded-[5px] hover:bg-white" title="Text colour">
                <Baseline className="h-3.5 w-3.5 text-[#3d355f]" />
                <input
                  type="color"
                  defaultValue="#1a1240"
                  className="sr-only"
                  aria-label="Text colour"
                  onChange={(event) => props.onExec("foreColor", event.target.value)}
                />
              </label>
              <label className="grid h-7 w-7 cursor-pointer place-items-center rounded-[5px] hover:bg-white" title="Highlight colour">
                <Highlighter className="h-3.5 w-3.5 text-[#3d355f]" />
                <input
                  type="color"
                  defaultValue="#ffd23f"
                  className="sr-only"
                  aria-label="Highlight colour"
                  onChange={(event) => props.onExec("hiliteColor", event.target.value)}
                />
              </label>
              <RB icon={RemoveFormatting} label="Clear formatting" onClick={() => props.onExec("removeFormat")} />
              <RB icon={Code2} label="Inline code" onClick={() => props.onExec("insertHTML", "<code>code</code>")} />
            </RibbonGroup>
            <RibbonGroup label="Paragraph">
              <RB icon={AlignLeft} label="Align left" onClick={() => props.onExec("justifyLeft")} />
              <RB icon={AlignCenter} label="Align centre" onClick={() => props.onExec("justifyCenter")} />
              <RB icon={AlignRight} label="Align right" onClick={() => props.onExec("justifyRight")} />
              <RB icon={AlignJustify} label="Justify" onClick={() => props.onExec("justifyFull")} />
              <RB icon={IndentIncrease} label="Increase indent" onClick={() => props.onExec("indent")} />
              <RB icon={IndentDecrease} label="Decrease indent" onClick={() => props.onExec("outdent")} />
            </RibbonGroup>
            <RibbonGroup label="Lists">
              <RB icon={List} label="Bulleted list" onClick={() => props.onList("bullet")} />
              <RB icon={ListOrdered} label="Numbered list" onClick={() => props.onList("decimal")} />
              <Select
                value={selectedBlock?.listKind ?? "lower-alpha"}
                onChange={(value) => props.onList(value as ListKind)}
                ariaLabel="Exam list style"
                width="w-[92px]"
                title="Exam-style subparts"
              >
                <option value="lower-alpha">(a), (b)</option>
                <option value="upper-alpha">(A), (B)</option>
                <option value="lower-roman">(i), (ii)</option>
                <option value="upper-roman">(I), (II)</option>
                <option value="decimal">1., 2.</option>
              </Select>
            </RibbonGroup>
            <RibbonGroup label="Spacing">
              <Select
                value={selectedBlock?.lineHeight ?? doc.settings.lineHeight}
                onChange={(value) => props.onPatchBlock({ lineHeight: Number(value) })}
                ariaLabel="Line spacing"
                width="w-[70px]"
                title="Line spacing"
              >
                <option value={1}>1.0</option>
                <option value={1.15}>1.15</option>
                <option value={1.3}>1.3</option>
                <option value={1.45}>1.45</option>
                <option value={1.5}>1.5</option>
                <option value={2}>2.0</option>
              </Select>
              <Select
                value={selectedBlock?.paragraphSpacing ?? doc.settings.paragraphSpacing}
                onChange={(value) => props.onPatchBlock({ paragraphSpacing: Number(value) })}
                ariaLabel="Paragraph spacing"
                width="w-[66px]"
                title="Space after paragraph (pt)"
              >
                <option value={0}>0 pt</option>
                <option value={3}>3 pt</option>
                <option value={6}>6 pt</option>
                <option value={9}>9 pt</option>
                <option value={12}>12 pt</option>
              </Select>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => props.onPatchBlock({ tabStops: [...(selectedBlock?.tabStops ?? []), 12.7] })}
                className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-2 text-[10px] font-bold text-[#3d355f] hover:border-[var(--qs-brand)]"
                title="Add a 12.7 mm tab stop to this block"
              >
                Tab stop
              </button>
            </RibbonGroup>
          </>
        )}

        {tab === "insert" && (
          <>
            <RibbonGroup label="Import">
              <RB icon={Upload} label="Open / import PDF" onClick={props.onImportPdf} />
              <RB icon={FilePlus2} label="New page" onClick={props.onAddPage} />
            </RibbonGroup>
            <RibbonGroup label="Objects">
              <RB icon={TextCursorInput} label="Text box" onClick={() => props.onInsert("textbox")} />
              <RB icon={Image} label="Image" onClick={() => props.onInsert("image")} />
              <RB icon={Shapes} label="Shape" onClick={() => props.onInsert("shape")} />
              <RB icon={Minus} label="Line" onClick={() => props.onInsert("line")} />
              <RB icon={Table} label="Table" onClick={() => props.onInsert("table")} />
              <RB icon={StickyNote} label="Sticky note" onClick={() => props.onInsert("note")} />
              <RB icon={GalleryVerticalEnd} label="Divider" onClick={() => props.onInsert("divider")} />
            </RibbonGroup>
            <RibbonGroup label="Exam">
              <RB icon={Type} label="Name / Roll No. field" onClick={() => props.onInsert("field")} />
              <RB icon={PenLine} label="Signature" onClick={() => props.onInsert("signature")} />
              <RB icon={Sigma} label="Equation" onClick={() => props.onInsert("equation")} />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => props.onInsert("code")}
                className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-2 font-mono text-[10px] font-bold text-[#3d355f] hover:border-[var(--qs-brand)]"
                title="Insert monospace code"
              >
                {"</>"}
              </button>
            </RibbonGroup>
            <RibbonGroup label="Symbols">
              <Select value="" onChange={props.onInsertSymbol} ariaLabel="Insert symbol" width="w-[96px]" title="Insert symbol">
                <option value="" disabled>
                  Symbol…
                </option>
                {["→", "←", "↑", "↓", "−", "×", "÷", "≤", "≥", "≠", "≈", "π", "Σ", "√", "∞", "°", "α", "β", "λ", "θ"].map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => props.onInsert("pagebreak")}
                className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-2 text-[10px] font-bold text-[#3d355f] hover:border-[var(--qs-brand)]"
                title="Page break (new page)"
              >
                Page break
              </button>
            </RibbonGroup>
            <RibbonGroup label="Header & footer">
              <RB icon={LayoutTemplate} label="Edit header and footer" onClick={props.onOpenChrome} />
              <RB icon={PanelBottom} label="Toggle page numbers" onClick={() => props.onOpenChrome()} />
            </RibbonGroup>
            {selectedBlock?.type === "table" && (
              <RibbonGroup label="Table">
                <TableTools onAction={props.onTableAction} />
              </RibbonGroup>
            )}
          </>
        )}

        {tab === "layout" && (
          <>
            <RibbonGroup label="Page setup">
              <Select
                value={doc.settings.pageSize}
                onChange={(value) => props.onUpdateSettings({ pageSize: value as DocumentSettings["pageSize"] })}
                ariaLabel="Page size"
                width="w-[86px]"
                title="Page size"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </Select>
              <button
                type="button"
                onClick={() =>
                  props.onUpdateSettings({
                    orientation: doc.settings.orientation === "portrait" ? "landscape" : "portrait",
                  })
                }
                className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-2 text-[10px] font-bold capitalize text-[#3d355f] hover:border-[var(--qs-brand)]"
                title="Toggle orientation"
                aria-label={`Orientation: ${doc.settings.orientation}`}
              >
                {doc.settings.orientation}
              </button>
              <Select
                value={doc.settings.columns}
                onChange={(value) => props.onUpdateSettings({ columns: Number(value) as 1 | 2 })}
                ariaLabel="Columns"
                width="w-[82px]"
                title="Columns"
              >
                <option value={1}>1 column</option>
                <option value={2}>2 columns</option>
              </Select>
            </RibbonGroup>
            <RibbonGroup label="Margins (mm)">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <label key={side} className="flex flex-col items-center gap-0.5">
                  <span className="text-[8px] font-bold uppercase text-[#9a94b8]">{side.slice(0, 1)}</span>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={doc.settings.margins[side]}
                    onChange={(event) =>
                      props.onUpdateSettings({
                        margins: { ...doc.settings.margins, [side]: Number(event.target.value) || 0 },
                      })
                    }
                    className="h-5 w-9 rounded border border-[var(--qs-line)] bg-white px-0.5 text-center text-[9px] font-semibold text-[#3d355f] outline-none focus:border-[var(--qs-brand)]"
                    aria-label={`${side} margin in millimetres`}
                  />
                </label>
              ))}
            </RibbonGroup>
            <RibbonGroup label="Pages">
              <RB icon={FilePlus2} label="Add page" onClick={props.onAddPage} />
              <RB icon={Copy} label="Duplicate current page" onClick={props.onDuplicatePage} />
              <RB icon={Trash2} label="Delete current page" onClick={props.onDeletePage} />
              <RB icon={ArrowUp} label="Move page up" onClick={() => props.onMovePage(-1)} />
              <RB icon={ArrowDown} label="Move page down" onClick={() => props.onMovePage(1)} />
            </RibbonGroup>
            <RibbonGroup label="Document styles">
              <Select
                value={doc.settings.defaultFontFamily}
                onChange={(value) => props.onUpdateSettings({ defaultFontFamily: value })}
                ariaLabel="Default font"
                width="w-[130px]"
                title="Default document font"
              >
                {FONT_FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </Select>
              <Select
                value={doc.settings.lineHeight}
                onChange={(value) => props.onUpdateSettings({ lineHeight: Number(value) })}
                ariaLabel="Default line height"
                width="w-[72px]"
                title="Default line height"
              >
                <option value={1.15}>1.15</option>
                <option value={1.3}>1.3</option>
                <option value={1.45}>1.45</option>
                <option value={1.5}>1.5</option>
                <option value={2}>2.0</option>
              </Select>
            </RibbonGroup>
          </>
        )}

        {tab === "review" && (
          <>
            <RibbonGroup label="Proofing">
              <RB icon={Search} label="Find and replace (Ctrl+F)" onClick={props.onFind} />
              <RB icon={MessageSquare} label="Comments" onClick={props.onToggleComments} />
              <RB icon={Baseline} label="Check spelling" onClick={() => props.onExec("insertText", "")} disabled />
            </RibbonGroup>
            <RibbonGroup label="Track changes">
              <button
                type="button"
                onClick={props.onToggleTrackChanges}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-[5px] border px-2 text-[10px] font-bold",
                  trackChanges
                    ? "border-[var(--qs-brand)] bg-[#ede7ff] text-[var(--qs-brand)]"
                    : "border-[var(--qs-line)] bg-white text-[#3d355f]"
                )}
                aria-pressed={trackChanges}
                title="Track changes"
              >
                <PenLine className="h-3.5 w-3.5" />
                {trackChanges ? "Tracking on" : "Track changes"}
              </button>
              <RB icon={Check} label="Accept all changes" onClick={props.onAcceptAll} disabled={pendingChanges === 0} />
              <RB icon={X} label="Reject all changes" onClick={props.onRejectAll} disabled={pendingChanges === 0} />
            </RibbonGroup>
            <RibbonGroup label="Marks">
              <button
                type="button"
                onClick={props.onAutoRenumber}
                className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-2 text-[10px] font-bold text-[#3d355f] hover:border-[var(--qs-brand)]"
                title="Renumber every question Q1, Q2, Q3…"
              >
                Renumber Qs
              </button>
              <span className="flex h-7 items-center rounded-[5px] border border-[#ffd23f] bg-[#fff8cc] px-2 text-[10px] font-bold text-[#6b5200]">
                Total {doc.pages.reduce((sum, page) => sum + page.blocks.filter((b) => b.type === "question").reduce((s, b) => s + (b.marks ?? 0), 0), 0)} marks
              </span>
            </RibbonGroup>
            <RibbonGroup label="Notes">
              <RB icon={Highlighter} label="Highlight selection" onClick={() => props.onExec("hiliteColor", "#ffd23f")} />
              <RB icon={StickyNote} label="Insert sticky note" onClick={() => props.onInsert("note")} />
            </RibbonGroup>
          </>
        )}

        {tab === "view" && (
          <>
            <RibbonGroup label="Zoom">
              <RB icon={ZoomOut} label="Zoom out" onClick={() => props.onZoom(Math.max(25, zoom - 10))} />
              <span className="w-10 text-center text-[10px] font-bold tabular-nums text-[#3d355f]">{zoom}%</span>
              <RB icon={ZoomIn} label="Zoom in" onClick={() => props.onZoom(Math.min(300, zoom + 10))} />
              <button type="button" onClick={props.onFitWidth} className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-2 text-[10px] font-bold text-[#3d355f] hover:border-[var(--qs-brand)]" title="Fit width">
                Fit width
              </button>
              <button type="button" onClick={props.onFitPage} className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-2 text-[10px] font-bold text-[#3d355f] hover:border-[var(--qs-brand)]" title="Fit page">
                Fit page
              </button>
            </RibbonGroup>
            <RibbonGroup label="Panels">
              <RB icon={PanelLeft} label="Page thumbnails" active={showThumbnails} onClick={props.onToggleThumbnails} />
              <RB icon={Ruler} label="Margin guides" active={showMarginGuides} onClick={props.onToggleMarginGuides} />
              <RB icon={showSafeZone ? EyeOff : Eye} label="Show branding safe zone" active={showSafeZone} onClick={props.onToggleSafeZone} />
              <RB icon={Maximize} label="Full screen" onClick={props.onFullscreen} />
            </RibbonGroup>
            <RibbonGroup label="Tools">
              <RB icon={MousePointer2} label="Select" active={props.activeTool === "select"} onClick={() => props.onToolChange("select")} />
              <RB icon={PenLine} label="Pen" active={props.activeTool === "pen"} onClick={() => props.onToolChange("pen")} />
              <RB icon={Highlighter} label="Highlighter" active={props.activeTool === "highlighter"} onClick={() => props.onToolChange("highlighter")} />
              <RB icon={Eraser} label="Eraser" active={props.activeTool === "eraser"} onClick={() => props.onToolChange("eraser")} />
            </RibbonGroup>
            <RibbonGroup label="Protection">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[#c9e8dc] bg-[#effbf6] px-2 text-[10px] font-bold text-[#13795b]">
                <Lock className="h-3.5 w-3.5" />
                Branding locked
              </span>
            </RibbonGroup>
          </>
        )}
      </div>
    </div>
  );
}

function TableTools({ onAction }: { onAction: EditorRibbonProps["onTableAction"] }) {
  return (
    <>
      <RB icon={Rows} label="Add row" onClick={() => onAction("add-row")} />
      <RB icon={Columns} label="Add column" onClick={() => onAction("add-col")} />
      <RB icon={Grid3X3} label="Merge selected cell with next" onClick={() => onAction("merge")} />
      <RB icon={Square} label="Shade selected cell" onClick={() => onAction("shade")} />
      <RB icon={Table} label="Border selected cell" onClick={() => onAction("border")} />
      <button
        type="button"
        onClick={() => onAction("delete-row")}
        className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-1.5 text-[9px] font-bold text-[#c2303a] hover:border-[#c2303a]"
        title="Delete row"
      >
        − Row
      </button>
      <button
        type="button"
        onClick={() => onAction("delete-col")}
        className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-1.5 text-[9px] font-bold text-[#c2303a] hover:border-[#c2303a]"
        title="Delete column"
      >
        − Col
      </button>
      <button
        type="button"
        onClick={() => onAction("split")}
        className="h-7 rounded-[5px] border border-[var(--qs-line)] bg-white px-1.5 text-[9px] font-bold text-[#3d355f] hover:border-[var(--qs-brand)]"
        title="Split merged cell"
      >
        Split
      </button>
    </>
  );
}
