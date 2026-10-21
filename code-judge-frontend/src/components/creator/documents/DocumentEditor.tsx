"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileText,
  History,
  Keyboard,
  Loader2,
  Lock,
  MoreHorizontal,
  Save,
  Share2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import type {
  DocumentBlock,
  EditorTool,
  FindOptions,
  ListKind,
  ShareSettings,
} from "@/lib/documentEditor/types";
import { mmToPx, pageDimensions } from "@/lib/documentEditor/types";
import { clampFreeBlockToPage } from "@/lib/documentEditor/branding";
import {
  computeTotals,
  createBlock,
  createSetVariant,
  plainTextFromHtml,
} from "@/lib/documentEditor/model";
import { useExamDocument } from "@/lib/documentEditor/useExamDocument";
import { replaceInHtml } from "@/lib/documentEditor/findReplace";
import { importPdfFile, type PdfImportProgress } from "@/lib/documentEditor/importPdf";
import { exportDocument, getDocumentExportError } from "@/lib/documentEditor/exports";
import { EditorRibbon, type RibbonTab } from "./EditorRibbon";
import { LazyPage, PageCanvas } from "./PageCanvas";
import { PageThumbnails } from "./PageThumbnails";
import {
  ChangesPanel,
  ChromePanel,
  CommentsPanel,
  ExportDialog,
  FindReplacePanel,
  ShareDialog,
  ShortcutLegend,
  UnsavedBadge,
  VersionsPanel,
  type ExportFormat,
} from "./EditorPanels";

type SidePanel = "find" | "comments" | "changes" | "versions" | "chrome" | null;

const FONT_SIZE_COMMAND = "7";

function findEditable(): HTMLElement | null {
  const active = window.document.activeElement;
  if (active instanceof HTMLElement && active.isContentEditable) return active;
  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  if (!anchor) return null;
  const element = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
  return element?.closest<HTMLElement>('[contenteditable="true"]') ?? null;
}

function notEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function tableCell(): HTMLTableCellElement | null {
  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  if (!anchor) return null;
  const element = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
  return element?.closest<HTMLTableCellElement>("td, th") ?? null;
}

function makeTable(rows = 3, columns = 3): string {
  const body = Array.from({ length: rows }, (_, row) =>
    `<tr>${Array.from({ length: columns }, (_, column) =>
      `<td style="border:1pt solid #1a1240;padding:2mm;vertical-align:top">${row === 0 && column === 0 ? "Header" : "Cell"}</td>`
    ).join("")}</tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:9.5pt"><tbody>${body}</tbody></table>`;
}

export function DocumentEditor() {
  const toast = useToast();
  const editor = useExamDocument();
  const doc = editor.document;

  const [tab, setTab] = useState<RibbonTab>("home");
  const [selectedPageId, setSelectedPageId] = useState<string>(() => doc.pages[0]?.id ?? "");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [showMarginGuides, setShowMarginGuides] = useState(false);
  const [zoom, setZoomState] = useState(100);
  const [fitMode, setFitMode] = useState<"manual" | "width" | "page">("manual");
  const [tool, setTool] = useState<EditorTool>("select");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [setMenuOpen, setSetMenuOpen] = useState(false);
  const [role] = useState<ShareSettings["role"]>(() => {
    if (typeof window === "undefined") return "owner";
    const requested = new URLSearchParams(window.location.search).get("role");
    return requested === "viewer" || requested === "commenter" || requested === "editor" ? requested : "owner";
  });
  const [importProgress, setImportProgress] = useState<PdfImportProgress | null>(null);
  const [importing, setImporting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const canEdit = role === "owner" || role === "editor";
  const canComment = canEdit || role === "commenter";

  const currentPage = doc.pages.find((page) => page.id === selectedPageId) ?? doc.pages[0];
  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    for (const page of doc.pages) {
      const block = page.blocks.find((item) => item.id === selectedBlockId);
      if (block) return block;
    }
    return null;
  }, [doc.pages, selectedBlockId]);

  const totals = useMemo(() => computeTotals(doc), [doc]);
  const wordCount = useMemo(
    () =>
      doc.pages.reduce(
        (sum, page) =>
          sum +
          page.blocks.reduce((pageSum, block) => {
            const text = plainTextFromHtml(block.html);
            return pageSum + (text ? text.split(/\s+/).filter(Boolean).length : 0);
          }, 0),
        0
      ),
    [doc.pages]
  );
  const pendingChanges = doc.changes.filter((change) => change.status === "pending").length;
  const openComments = doc.comments.filter((comment) => !comment.resolved).length;

  useEffect(() => {
    if (!editor.hydrated) return;
    if (selectedPageId && editor.document.pages.some((page) => page.id === selectedPageId)) return;
    const firstPage = editor.document.pages[0]?.id;
    if (!firstPage) return;
    const timer = setTimeout(() => {
      setSelectedPageId(firstPage);
      setSelectedBlockId(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [editor.hydrated, editor.document.pages, selectedPageId]);

  const requireEdit = useCallback((): boolean => {
    if (canEdit) return true;
    toast.warning({ title: "Read-only link", description: "This link does not allow editing the paper." });
    return false;
  }, [canEdit, toast]);

  const scrollToBlock = useCallback((pageId: string, blockId: string) => {
    setSelectedPageId(pageId);
    setSelectedBlockId(blockId);
    window.setTimeout(() => {
      const element = window.document.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 70);
  }, []);

  const handleSelectBlock = useCallback((pageId: string, blockId: string) => {
    setSelectedPageId(pageId);
    setSelectedBlockId(blockId);
  }, []);

  const handleSelectPage = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    setSelectedBlockId(null);
  }, []);

  const setZoom = useCallback((next: number) => {
    setFitMode("manual");
    setZoomState(Math.max(25, Math.min(300, Math.round(next))));
  }, []);

  useEffect(() => {
    if (fitMode === "manual") return;
    const container = scrollRef.current;
    if (!container) return;
    const compute = () => {
      const dims = pageDimensions(doc.settings);
      const width = mmToPx(dims.width);
      const height = mmToPx(dims.height);
      const availableWidth = Math.max(320, container.clientWidth - 96);
      const availableHeight = Math.max(320, container.clientHeight - 70);
      const next =
        fitMode === "width"
          ? (availableWidth / width) * 100
          : Math.min(availableWidth / width, availableHeight / height) * 100;
      setZoomState(Math.max(25, Math.min(300, Math.round(next))));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    return () => observer.disconnect();
  }, [doc.settings, fitMode, showThumbnails, sidePanel]);

  const exec = useCallback(
    (command: string, value?: string) => {
      if (!requireEdit()) return;
      const editable = findEditable();
      if (!editable) {
        toast.info({ title: "Place your cursor in the paper", description: "Click into editable text first." });
        return;
      }
      window.document.execCommand("styleWithCSS", false, "true");
      window.document.execCommand(command, false, value);
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [requireEdit, toast]
  );

  const applyFontFamily = useCallback(
    (family: string) => {
      if (!requireEdit()) return;
      const editable = findEditable();
      if (editable) {
        window.document.execCommand("styleWithCSS", false, "true");
        window.document.execCommand("fontName", false, family);
        editable.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (selectedBlock) {
        editor.updateBlock(selectedPageId, selectedBlock.id, { fontFamily: family }, true);
      }
    },
    [editor, requireEdit, selectedBlock, selectedPageId]
  );

  const applyFontSize = useCallback(
    (size: number) => {
      if (!requireEdit()) return;
      const editable = findEditable();
      if (!editable) {
        if (selectedBlock) editor.updateBlock(selectedPageId, selectedBlock.id, { fontSize: size }, true);
        return;
      }
      window.document.execCommand("styleWithCSS", false, "false");
      window.document.execCommand("fontSize", false, FONT_SIZE_COMMAND);
      editable.querySelectorAll<HTMLElement>('font[size="7"]').forEach((font) => {
        const span = window.document.createElement("span");
        span.style.fontSize = `${size}pt`;
        span.innerHTML = font.innerHTML;
        font.replaceWith(span);
      });
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [editor, requireEdit, selectedBlock, selectedPageId]
  );

  const applyList = useCallback(
    (kind: ListKind) => {
      if (!requireEdit()) return;
      const editable = findEditable();
      if (!editable) {
        toast.info({ title: "Place your cursor in the paper", description: "Click into a question or paragraph first." });
        return;
      }
      window.document.execCommand(kind === "bullet" ? "insertUnorderedList" : "insertOrderedList");
      editable.querySelectorAll<HTMLOListElement>("ol, ul").forEach((list) => {
        list.classList.remove("qs-list-alpha", "qs-list-roman", "qs-list-upper-alpha", "qs-list-upper-roman");
        if (kind === "lower-alpha") list.classList.add("qs-list-alpha");
        else if (kind === "upper-alpha") list.classList.add("qs-list-upper-alpha");
        else if (kind === "lower-roman") list.classList.add("qs-list-roman");
        else if (kind === "upper-roman") list.classList.add("qs-list-upper-roman");
        else if (kind === "bullet") list.style.listStyleType = "disc";
        else list.style.listStyleType = "decimal";
      });
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [requireEdit, toast]
  );

  const addFlowBlock = useCallback(
    (block: DocumentBlock) => {
      if (!requireEdit()) return;
      const pageId = currentPage?.id ?? doc.pages[0]?.id;
      if (!pageId) return;
      const after = selectedBlock && currentPage?.blocks.some((item) => item.id === selectedBlock.id) ? selectedBlock.id : undefined;
      const id = editor.addBlock(pageId, block, after);
      setSelectedPageId(pageId);
      setSelectedBlockId(id);
    },
    [currentPage, doc.pages, editor, requireEdit, selectedBlock]
  );

  const addFreeBlock = useCallback(
    (block: DocumentBlock, position = { x: 22, y: 32, width: 82, height: 24 }) => {
      if (!requireEdit()) return;
      const pageId = currentPage?.id ?? doc.pages[0]?.id;
      if (!pageId) return;
      const next = clampFreeBlockToPage(
        {
          x: block.x ?? position.x,
          y: block.y ?? position.y,
          width: block.width ?? position.width,
          height: block.height ?? position.height,
          rotation: block.rotation ?? 0,
        },
        doc.settings,
        2
      );
      const id = editor.addBlock(pageId, {
        ...block,
        placement: "free",
        x: next.x,
        y: next.y,
        width: next.width,
        height: next.height,
        rotation: next.rotation,
        zIndex: block.zIndex ?? 20,
      });
      setSelectedPageId(pageId);
      setSelectedBlockId(id);
    },
    [currentPage, doc.pages, doc.settings, editor, requireEdit]
  );

  const handleInsert = useCallback(
    async (kind: string) => {
      if (!requireEdit()) return;
      if (kind === "image") {
        imageInputRef.current?.click();
        return;
      }
      if (kind === "signature") {
        signatureInputRef.current?.click();
        return;
      }
      if (kind === "pagebreak") {
        const id = editor.addPageAfter(currentPage?.id);
        setSelectedPageId(id);
        setSelectedBlockId(null);
        return;
      }
      if (kind === "textbox") {
        addFreeBlock(createBlock("freeText", { html: "<p>Type here…</p>" }), { x: 24, y: 36, width: 88, height: 22 });
        return;
      }
      if (kind === "shape") {
        addFreeBlock(
          createBlock("shape", { shape: "rectangle", background: "transparent", borderColor: "#1a1240", borderWidth: 1.3 }),
          { x: 26, y: 40, width: 44, height: 28 }
        );
        return;
      }
      if (kind === "line") {
        addFreeBlock(
          createBlock("shape", { shape: "line", borderColor: "#1a1240", borderWidth: 1.2 }),
          { x: 26, y: 52, width: 110, height: 8 }
        );
        return;
      }
      if (kind === "table") {
        addFlowBlock(createBlock("table", { html: makeTable() }));
        setTab("insert");
        return;
      }
      if (kind === "equation") {
        addFlowBlock(createBlock("equation", { latex: "E = mc^2" }));
        return;
      }
      if (kind === "code") {
        const editable = findEditable();
        if (editable) {
          window.document.execCommand("insertHTML", false, "<code>code</code>");
          editable.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          addFlowBlock(createBlock("text", { html: '<p><code>code</code></p>' }));
        }
        return;
      }
      if (kind === "note") {
        addFlowBlock(createBlock("note", { html: "<p>Sticky note…</p>" }));
        return;
      }
      if (kind === "divider") {
        addFlowBlock(createBlock("divider"));
        return;
      }
      if (kind === "field") {
        addFlowBlock(createBlock("field", { fieldLabel: "Name", fieldValue: "" }));
        return;
      }
    },
    [addFlowBlock, addFreeBlock, currentPage?.id, editor, requireEdit]
  );

  const readImage = useCallback(
    (file: File, signature: boolean) => {
      if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
        toast.error({ title: "Unsupported image", description: "Use a PNG, JPEG or WebP image." });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const src = typeof reader.result === "string" ? reader.result : "";
        if (!src) return;
        addFreeBlock(
          createBlock(signature ? "signature" : "image", {
            src,
            alt: signature ? "Signature" : file.name,
          }),
          signature ? { x: 115, y: 235, width: 56, height: 22 } : { x: 35, y: 70, width: 100, height: 58 }
        );
      };
      reader.onerror = () => toast.error({ title: "Image could not be read", description: "Please choose another file." });
      reader.readAsDataURL(file);
    },
    [addFreeBlock, toast]
  );

  const handleTableAction = useCallback(
    (action: "add-row" | "add-col" | "delete-row" | "delete-col" | "merge" | "split" | "shade" | "border") => {
      if (!requireEdit() || !selectedBlock || selectedBlock.type !== "table" || !selectedPageId) return;
      const editable = window.document.querySelector<HTMLElement>(
        `[data-page-id="${CSS.escape(selectedPageId)}"] [data-block-id="${CSS.escape(selectedBlock.id)}"] [contenteditable="true"]`
      );
      const table = editable?.querySelector("table");
      if (!table) return;
      const cell = tableCell();
      const row = cell?.closest("tr") ?? table.querySelector("tr");
      if (!row) return;

      if (action === "add-row") {
        const clone = row.cloneNode(true) as HTMLTableRowElement;
        clone.querySelectorAll("td, th").forEach((item) => {
          item.innerHTML = "&nbsp;";
          item.removeAttribute("colspan");
          item.removeAttribute("rowspan");
        });
        row.parentElement?.appendChild(clone);
      } else if (action === "add-col") {
        table.querySelectorAll("tr").forEach((item) => {
          const target = item.querySelector("td, th");
          if (!target) return;
          const clone = target.cloneNode(true) as HTMLTableCellElement;
          clone.innerHTML = "&nbsp;";
          clone.removeAttribute("colspan");
          item.appendChild(clone);
        });
      } else if (action === "delete-row") {
        if (table.querySelectorAll("tr").length > 1) row.remove();
      } else if (action === "delete-col") {
        const index = cell?.cellIndex ?? 0;
        table.querySelectorAll("tr").forEach((item) => {
          const target = item.children[index];
          if (target && item.children.length > 1) target.remove();
        });
      } else if (action === "merge") {
        if (!cell) return;
        const next = cell.nextElementSibling as HTMLTableCellElement | null;
        if (!next) {
          toast.info({ title: "No next cell", description: "Click a cell that has another cell to its right." });
          return;
        }
        cell.colSpan = (cell.colSpan || 1) + (next.colSpan || 1);
        cell.innerHTML = `${cell.innerHTML}<br/>${next.innerHTML}`;
        next.remove();
      } else if (action === "split") {
        if (!cell || cell.colSpan <= 1) {
          toast.info({ title: "Nothing to split", description: "Select a merged cell first." });
          return;
        }
        cell.colSpan -= 1;
        const clone = cell.cloneNode(false) as HTMLTableCellElement;
        clone.innerHTML = "&nbsp;";
        clone.colSpan = 1;
        cell.after(clone);
      } else if (action === "shade") {
        if (cell) cell.style.backgroundColor = "#f2eeff";
      } else if (action === "border") {
        if (cell) cell.style.border = "1.5pt solid #1a1240";
      }

      editor.updateBlock(selectedPageId, selectedBlock.id, { html: editable?.innerHTML ?? table.outerHTML }, true);
    },
    [editor, requireEdit, selectedBlock, selectedPageId, toast]
  );

  const handleReplaceOne = useCallback(
    (pageId: string, blockId: string, options: FindOptions): number => {
      if (!requireEdit()) return 0;
      const page = editor.document.pages.find((item) => item.id === pageId);
      const block = page?.blocks.find((item) => item.id === blockId);
      if (!block) return 0;
      const result = replaceInHtml(block.html, options, options.query, options.replacement);
      if (result.count > 0) editor.updateBlock(pageId, blockId, { html: result.html }, true);
      return result.count;
    },
    [editor, requireEdit]
  );

  const handleReplaceAll = useCallback(
    (options: FindOptions): number => {
      if (!requireEdit()) return 0;
      let count = 0;
      const pages = editor.document.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((block) => {
          if (!options.query) return block;
          const result = replaceInHtml(block.html, options, options.query, options.replacement);
          count += result.count;
          return result.count > 0 ? { ...block, html: result.html } : block;
        }),
      }));
      if (count > 0) {
        editor.setDocument({ ...editor.document, pages }, { history: true, persistImmediately: true });
      }
      return count;
    },
    [editor, requireEdit]
  );

  const handleAddComment = useCallback(
    (pageId: string, blockId: string, text: string) => {
      if (!canComment) {
        toast.warning({ title: "Comments are disabled", description: "This link only allows viewing." });
        return;
      }
      editor.addComment(pageId, blockId, text);
      toast.success({ title: "Comment added", description: "It is visible in the comments panel only." });
    },
    [canComment, editor, toast]
  );

  const handleCreateSet = useCallback(
    (label: string) => {
      if (!requireEdit()) return;
      const currentLabel = doc.meta.setLabel || "A";
      if (label === currentLabel) {
        setSetMenuOpen(false);
        return;
      }
      const variant = createSetVariant(doc, label, Date.now());
      editor.saveVersion(`Set ${currentLabel} — before creating Set ${label}`);
      editor.setDocument(variant, { history: true, persistImmediately: true });
      setSelectedPageId(variant.pages[0].id);
      setSelectedBlockId(null);
      setSetMenuOpen(false);
      toast.success({
        title: `Set ${label} created`,
        description: "Questions are shuffled within each section and renumbered automatically.",
      });
    },
    [doc, editor, requireEdit, toast]
  );

  const handleImportPdf = useCallback(
    async (file: File) => {
      if (!requireEdit()) return;
      if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
        toast.error({ title: "Choose a PDF", description: "Only PDF files can be imported." });
        return;
      }
      if (file.size > 24 * 1024 * 1024) {
        toast.error({ title: "PDF is too large", description: "Please use a file under 24 MB." });
        return;
      }
      setImporting(true);
      setImportProgress({ page: 0, total: 0, phase: "rendering" });
      try {
        const result = await importPdfFile(file, setImportProgress);
        editor.setDocument(result.document, { history: true, persistImmediately: true });
        setSelectedPageId(result.document.pages[0].id);
        setSelectedBlockId(null);
        toast.success({
          title: "PDF imported",
          description: `${result.pageCount} page${result.pageCount === 1 ? "" : "s"} · ${result.textBlocks} editable text blocks. Branding was moved to the protected layer.`,
        });
        if (result.scannedPages > 0) {
          toast.warning({
            title: `${result.scannedPages} scanned page${result.scannedPages === 1 ? "" : "s"}`,
            description: "The page image is editable as a backdrop. Connect the OCR worker for searchable text.",
          });
        }
      } catch (error) {
        toast.error({
          title: "Could not import this PDF",
          description: error instanceof Error ? error.message : "The file may be encrypted or damaged.",
        });
      } finally {
        setImporting(false);
        setImportProgress(null);
        if (pdfInputRef.current) pdfInputRef.current.value = "";
      }
    },
    [editor, requireEdit, toast]
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!doc.share.allowDownload && role !== "owner") {
        toast.warning({ title: "Downloads are disabled", description: "The owner disabled downloads for this link." });
        return;
      }
      setExportBusy(format);
      setExportError(null);
      try {
        const count = await exportDocument(doc, format);
        toast.success({
          title: format === "print" ? "Print view opened" : "Export ready",
          description:
            format === "png"
              ? `${count} page image${count === 1 ? "" : "s"} downloaded with protected branding.`
              : "QuizSupport branding was injected by the server.",
        });
        setExportOpen(false);
      } catch (error) {
        const message = await getDocumentExportError(error);
        setExportError(message);
        toast.error({ title: "Export failed", description: message });
      } finally {
        setExportBusy(null);
      }
    },
    [doc, role, toast]
  );

  const handleSaveVersion = useCallback(() => {
    if (!requireEdit()) return;
    const saved = editor.saveVersion();
    if (saved) {
      toast.success({ title: "Version saved", description: "You can restore it from Version history." });
    } else {
      toast.error({ title: "Could not save version", description: "Browser storage may be full." });
    }
  }, [editor, requireEdit, toast]);

  const handleAcceptAll = useCallback(() => {
    if (!requireEdit()) return;
    const pending = editor.document.changes.filter((change) => change.status === "pending");
    if (!pending.length) return;
    editor.setDocument(
      {
        ...editor.document,
        changes: editor.document.changes.map((change) =>
          change.status === "pending" ? { ...change, status: "accepted" as const } : change
        ),
      },
      { history: true, persistImmediately: true }
    );
    toast.success({ title: "Changes accepted", description: `${pending.length} tracked edit${pending.length === 1 ? "" : "s"} accepted.` });
  }, [editor, requireEdit, toast]);

  const handleRejectAll = useCallback(() => {
    if (!requireEdit()) return;
    const pending = editor.document.changes.filter((change) => change.status === "pending");
    if (!pending.length) return;
    const restore = new Map<string, string>();
    pending.forEach((change) => {
      if (!restore.has(change.blockId)) restore.set(change.blockId, change.before);
    });
    editor.setDocument(
      {
        ...editor.document,
        changes: editor.document.changes.map((change) =>
          change.status === "pending" ? { ...change, status: "rejected" as const } : change
        ),
        pages: editor.document.pages.map((page) => ({
          ...page,
          blocks: page.blocks.map((block) =>
            restore.has(block.id) ? { ...block, html: restore.get(block.id) ?? block.html } : block
          ),
        })),
      },
      { history: true, persistImmediately: true }
    );
    toast.success({ title: "Changes rejected", description: `${pending.length} tracked edit${pending.length === 1 ? "" : "s"} reverted.` });
  }, [editor, requireEdit, toast]);

  const handleShareUpdate = useCallback(
    (patch: Partial<ShareSettings>) => {
      if (role !== "owner") return;
      editor.setDocument(
        { ...editor.document, share: { ...editor.document.share, ...patch } },
        { history: true, persistImmediately: true }
      );
    },
    [editor, role]
  );

  const handleCopyShareLink = useCallback(
    (linkRole: ShareSettings["linkRole"]) => {
      const url = `${window.location.origin}/creator/tests/editor?role=${linkRole}&doc=${doc.id}`;
      void navigator.clipboard
        .writeText(url)
        .then(() => toast.success({ title: "Link copied", description: `${linkRole} access link copied to clipboard.` }))
        .catch(() => toast.error({ title: "Could not copy link", description: "Copy the URL from the address bar instead." }));
    },
    [doc.id, toast]
  );

  const handleToolChange = useCallback((next: "select" | "pen" | "highlighter" | "eraser") => {
    setTool(next);
    if (next === "select") setSelectedBlockId(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "s") {
        event.preventDefault();
        handleSaveVersion();
        return;
      }
      if (mod && key === "p") {
        event.preventDefault();
        void handleExport("print");
        return;
      }
      if (mod && key === "f") {
        event.preventDefault();
        setSidePanel("find");
        return;
      }
      if (mod && key === "z") {
        if (!canEdit || notEditableTarget(event.target)) return;
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (mod && key === "y") {
        if (!canEdit || notEditableTarget(event.target)) return;
        event.preventDefault();
        editor.redo();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && !notEditableTarget(event.target) && selectedBlockId) {
        event.preventDefault();
        if (!canEdit) return;
        const page = doc.pages.find((item) => item.blocks.some((block) => block.id === selectedBlockId));
        if (page) {
          editor.removeBlock(page.id, selectedBlockId);
          setSelectedBlockId(null);
        }
        return;
      }
      if (event.key === "Escape") {
        setSidePanel(null);
        setSelectedBlockId(null);
        setSetMenuOpen(false);
        setShortcutsOpen(false);
        setShareOpen(false);
        setExportOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit, doc.pages, editor, handleExport, handleSaveVersion, selectedBlockId]);

  if (!editor.hydrated) {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-[#f2effc]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--qs-brand)]" />
          <p className="text-sm font-bold text-[var(--qs-ink)]">Opening Paper Studio…</p>
        </div>
      </div>
    );
  }

  const panelProps = {
    document: doc,
    onClose: () => setSidePanel(null),
  };

  return (
    <div
      data-qs-editor-root
      className="fixed inset-0 z-[75] flex flex-col bg-[#efecfb] text-[var(--qs-ink)]"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif, system-ui)" }}
    >
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImportPdf(file);
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) readImage(file, false);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={signatureInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) readImage(file, true);
          event.currentTarget.value = "";
        }}
      />

      <header className="flex h-[58px] shrink-0 items-center gap-3 border-b-2 border-[var(--qs-ink)] bg-white px-3 sm:px-4">
        <Link
          href="/creator/tests"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]"
          aria-label="Back to tests"
          title="Back to tests"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
            <FileText className="h-4 w-4" />
          </span>
          <div className="hidden min-w-0 sm:block">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-muted)]">Paper Studio</p>
              <span className="rounded-full border border-[var(--qs-line)] bg-[#faf9ff] px-1.5 py-px text-[8px] font-black uppercase tracking-wide text-[var(--qs-muted)]">
                Doc editor
              </span>
            </div>
            <input
              value={doc.title}
              onChange={(event) => {
                if (!canEdit) return;
                editor.updateMeta({ title: event.target.value });
              }}
              readOnly={!canEdit}
              className="block w-[min(36vw,420px)] truncate border-0 bg-transparent p-0 text-sm font-extrabold text-[var(--qs-ink)] outline-none focus:bg-[#faf9ff]"
              aria-label="Document title"
            />
          </div>
        </div>
        <div className="hidden items-center gap-1.5 md:flex">
          <UnsavedBadge status={editor.saveStatus} />
          <span className="rounded-full border border-[#c9e8dc] bg-[#effbf6] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#13795b]">
            <Lock className="mr-1 inline h-2.5 w-2.5" />
            Branding locked
          </span>
        </div>
        <div className="min-w-0 flex-1" />
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-[10px] font-bold text-[var(--qs-muted)]">{totals.questionCount} Qs</span>
          <span className="h-3 w-px bg-[var(--qs-line)]" />
          <span className="text-[10px] font-bold text-[var(--qs-muted)]">{totals.total} marks</span>
          <span className="h-3 w-px bg-[var(--qs-line)]" />
          <div className="relative">
            <button type="button" onClick={() => setSetMenuOpen((open) => !open)} className="b sm gap-1" aria-haspopup="menu" aria-expanded={setMenuOpen}>
              Set {doc.meta.setLabel || "—"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {setMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-[10px] border-2 border-[var(--qs-line)] bg-white p-1 shadow-[4px_4px_0_var(--qs-sun)]" role="menu">
                <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">Create shuffled set</p>
                {["B", "C"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    onClick={() => handleCreateSet(label)}
                    className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[11px] font-bold text-[var(--qs-ink)] hover:bg-[#f6f2ff]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                    Generate Set {label}
                  </button>
                ))}
                <p className="px-2 pb-1 pt-2 text-[9px] leading-snug text-[var(--qs-muted)]">
                  Shuffles questions inside each section and renumbers. Branding never moves.
                </p>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => pdfInputRef.current?.click()}
          disabled={!canEdit || importing}
          className="b sm hidden gap-1.5 sm:inline-flex"
          title="Import a PDF"
        >
          {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 rotate-180" />}
          Import
        </button>
        <button type="button" onClick={() => setSidePanel("versions")} className="b b-icon sm" title="Version history" aria-label="Version history">
          <History className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={handleSaveVersion} disabled={!canEdit} className="b b-icon sm" title="Save version (Ctrl+S)" aria-label="Save version">
          <Save className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setShareOpen(true)} className="b sm gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>
        <button type="button" onClick={() => setExportOpen(true)} className="b b-pri sm gap-1.5">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button type="button" onClick={() => setShortcutsOpen(true)} className="b b-icon sm" title="Keyboard shortcuts" aria-label="Keyboard shortcuts">
          <Keyboard className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setSidePanel(sidePanel === "comments" ? null : "comments")} className="b b-icon sm relative" title="Comments" aria-label="Comments">
          <MoreHorizontal className="h-3.5 w-3.5" />
          {openComments > 0 && <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[#ffd23f] px-0.5 text-[7px] font-black text-[#1a1240]">{openComments}</span>}
        </button>
      </header>

      {role !== "owner" && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-[#e7c94a] bg-[#fff8cc] px-3 py-1 text-[10px] font-bold text-[#6b5200]">
          {role === "viewer" ? "View-only link — editing is disabled." : role === "commenter" ? "Comment-only link — comments are enabled, edits are disabled." : "Editor link — all changes autosave."}
        </div>
      )}

      <EditorRibbon
        tab={tab}
        onTabChange={setTab}
        document={doc}
        currentPageId={currentPage?.id ?? ""}
        selectedBlock={selectedBlock}
        activeTool={tool}
        canUndo={canEdit && editor.canUndo}
        canRedo={canEdit && editor.canRedo}
        zoom={zoom}
        showThumbnails={showThumbnails}
        showSafeZone={showSafeZone}
        showMarginGuides={showMarginGuides}
        trackChanges={editor.trackChanges}
        pendingChanges={pendingChanges}
        commentsCount={openComments}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onExec={exec}
        onFontFamily={applyFontFamily}
        onFontSize={applyFontSize}
        onList={applyList}
        onPatchBlock={(patch) => {
          if (!canEdit || !selectedBlock) return;
          editor.updateBlock(selectedPageId, selectedBlock.id, patch, true);
        }}
        onInsert={handleInsert}
        onInsertSymbol={(symbol) => exec("insertText", symbol)}
        onOpenChrome={() => setSidePanel("chrome")}
        onImportPdf={() => pdfInputRef.current?.click()}
        onAddPage={() => {
          if (!requireEdit()) return;
          const id = editor.addPageAfter(currentPage?.id);
          setSelectedPageId(id);
          setSelectedBlockId(null);
        }}
        onDuplicatePage={() => {
          if (!requireEdit() || !currentPage) return;
          editor.duplicatePage(currentPage.id);
        }}
        onDeletePage={() => {
          if (!requireEdit() || !currentPage) return;
          editor.deletePage(currentPage.id);
        }}
        onMovePage={(direction) => {
          if (!requireEdit() || !currentPage) return;
          const index = doc.pages.findIndex((page) => page.id === currentPage.id);
          editor.reorderPages(index, index + direction);
        }}
        onUpdateSettings={(patch) => {
          if (!requireEdit()) return;
          editor.updateSettings(patch);
        }}
        onFind={() => setSidePanel("find")}
        onToggleComments={() => setSidePanel(sidePanel === "comments" ? null : "comments")}
        onToggleTrackChanges={() => {
          if (!requireEdit()) return;
          editor.setTrackChanges((value) => !value);
        }}
        onAcceptAll={handleAcceptAll}
        onRejectAll={handleRejectAll}
        onAutoRenumber={() => {
          if (!requireEdit()) return;
          editor.autoRenumber();
          toast.success({ title: "Questions renumbered", description: "Every question now runs Q1, Q2, Q3… in document order." });
        }}
        onZoom={setZoom}
        onFitWidth={() => setFitMode("width")}
        onFitPage={() => setFitMode("page")}
        onToggleThumbnails={() => setShowThumbnails((value) => !value)}
        onToggleSafeZone={() => setShowSafeZone((value) => !value)}
        onToggleMarginGuides={() => setShowMarginGuides((value) => !value)}
        onFullscreen={() => {
          if (window.document.fullscreenElement) void window.document.exitFullscreen();
          else void window.document.documentElement.requestFullscreen().catch(() => {});
        }}
        onTableAction={handleTableAction}
        onToolChange={handleToolChange}
        canEdit={canEdit}
      />

      <div className="flex min-h-0 flex-1">
        {showThumbnails && (
          <div className="hidden md:block">
            <PageThumbnails
              document={doc}
              currentPageId={currentPage?.id ?? ""}
              onSelect={handleSelectPage}
              onAdd={() => {
                if (!requireEdit()) return;
                const id = editor.addPageAfter(currentPage?.id);
                setSelectedPageId(id);
                setSelectedBlockId(null);
              }}
              onDuplicate={(pageId) => {
                if (!requireEdit()) return;
                editor.duplicatePage(pageId);
              }}
              onDelete={(pageId) => {
                if (!requireEdit()) return;
                editor.deletePage(pageId);
              }}
              onReorder={(from, to) => {
                if (!requireEdit()) return;
                editor.reorderPages(from, to);
              }}
            />
          </div>
        )}

        <div ref={scrollRef} className="min-h-0 min-w-0 flex-1 overflow-auto bg-[#e8e4f7] px-4 py-6 sm:px-8">
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-8">
            {doc.pages.map((page, index) => (
              <div key={page.id} id={`page-${page.id}`}>
                <LazyPage enabled={doc.pages.length > 18}>
                  <PageCanvas
                    document={doc}
                    page={page}
                    pageIndex={index}
                    pageCount={doc.pages.length}
                    zoom={zoom}
                    selected={currentPage?.id === page.id}
                    selectedBlockId={selectedBlockId}
                    tool={tool}
                    showSafeZone={showSafeZone}
                    showMarginGuides={showMarginGuides}
                    editable={canEdit}
                    onSelectPage={() => handleSelectPage(page.id)}
                    onSelectBlock={(blockId) => handleSelectBlock(page.id, blockId)}
                    onChangeHtml={(pageId, blockId, html) => {
                      if (!canEdit) return;
                      editor.replaceBlockHtml(pageId, blockId, html);
                    }}
                    onPatchBlock={(pageId, blockId, patch, history) => {
                      if (!canEdit) return;
                      editor.updateBlock(pageId, blockId, patch, history ?? false);
                    }}
                    onTrackChange={(pageId, blockId, before, after) => {
                      if (!canEdit) return;
                      editor.recordChange(pageId, blockId, before, after);
                    }}
                    onStrokeStart={(pageId, stroke) => {
                      if (!canEdit) return;
                      editor.addStroke(pageId, stroke);
                    }}
                    onErase={(pageId, point) => {
                      if (!canEdit) return;
                      editor.eraseStrokeAt(pageId, point);
                    }}
                    onBlockingWarning={() =>
                      toast.warning({
                        title: "Footer safe zone is reserved",
                        description: "Nothing can be placed over the QuizSupport branding.",
                      })
                    }
                  />
                </LazyPage>
              </div>
            ))}
          </div>
        </div>

        {sidePanel === "find" && (
          <FindReplacePanel
            {...panelProps}
            onReplace={handleReplaceOne}
            onReplaceAll={handleReplaceAll}
            onJump={scrollToBlock}
          />
        )}
        {sidePanel === "comments" && (
          <CommentsPanel
            {...panelProps}
            selectedBlockId={selectedBlockId}
            onAdd={handleAddComment}
            onToggle={(commentId) => {
              if (!canComment) return;
              editor.toggleComment(commentId);
            }}
            onRemove={(commentId) => {
              if (!canComment) return;
              editor.removeComment(commentId);
            }}
            onJump={scrollToBlock}
          />
        )}
        {sidePanel === "changes" && (
          <ChangesPanel {...panelProps} onResolve={editor.resolveChange} onJump={scrollToBlock} />
        )}
        {sidePanel === "versions" && (
          <VersionsPanel
            versions={editor.versions}
            onClose={() => setSidePanel(null)}
            onSave={handleSaveVersion}
            onRestore={(id) => {
              if (!requireEdit()) return;
              editor.restoreVersion(id);
              toast.success({ title: "Version restored", description: "The document was rolled back and autosaved." });
            }}
            onDelete={(id) => {
              if (!requireEdit()) return;
              editor.deleteVersion(id);
            }}
          />
        )}
        {sidePanel === "chrome" && (
          <ChromePanel
            {...panelProps}
            onUpdate={(patch) => {
              if (!requireEdit()) return;
              editor.updateChrome(patch);
            }}
          />
        )}
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-3 border-t-2 border-[var(--qs-line)] bg-white px-3 text-[9px] font-semibold text-[var(--qs-muted)]">
        <span>{doc.pages.length} page{doc.pages.length === 1 ? "" : "s"}</span>
        <span>{wordCount} words</span>
        <span>{totals.questionCount} questions</span>
        <span>{totals.total} / {doc.meta.maxMarks || totals.total} marks</span>
        <span className="flex-1" />
        <button type="button" onClick={() => setSidePanel("changes")} className={cn("rounded px-1.5 py-0.5 hover:bg-[#f6f2ff]", pendingChanges > 0 && "text-[var(--qs-warn)]")}>
          {pendingChanges} tracked
        </button>
        <span className="hidden sm:inline">Page {Math.max(1, doc.pages.findIndex((page) => page.id === currentPage?.id) + 1)} of {doc.pages.length}</span>
        <span className="hidden items-center gap-1 sm:inline-flex">
          <Lock className="h-2.5 w-2.5" /> Branding protected
        </span>
        <span className="tabular-nums">{zoom}%</span>
      </footer>

      <ShareDialog
        open={shareOpen}
        document={doc}
        onClose={() => setShareOpen(false)}
        onUpdate={handleShareUpdate}
        onCopy={handleCopyShareLink}
      />
      <ExportDialog
        open={exportOpen}
        busy={exportBusy}
        error={exportError}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
      />
      {shortcutsOpen && <ShortcutLegend onClose={() => setShortcutsOpen(false)} />}

      {importProgress && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-[rgba(26,18,64,0.55)] p-6" role="dialog" aria-modal="true" aria-label="Importing PDF">
          <div className="w-full max-w-sm rounded-[16px] border-2 border-[var(--qs-ink)] bg-white p-6 text-center shadow-[6px_6px_0_var(--qs-sun)]">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </span>
            <p className="mt-4 text-sm font-extrabold text-[var(--qs-ink)]">Reading your PDF…</p>
            <p className="mt-1 text-[11px] text-[var(--qs-muted)]">
              {importProgress.total > 0
                ? `Page ${importProgress.page} of ${importProgress.total} · ${importProgress.phase}`
                : "Opening document…"}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--qs-poly-1)]">
              <div
                className="h-full rounded-full bg-[var(--qs-brand)] transition-all"
                style={{ width: `${importProgress.total ? Math.round((importProgress.page / importProgress.total) * 100) : 12}%` }}
              />
            </div>
            <p className="mt-3 text-[9px] font-semibold text-[var(--qs-muted)]">Text, fonts and positions are converted into editable blocks.</p>
          </div>
        </div>
      )}
    </div>
  );
}
