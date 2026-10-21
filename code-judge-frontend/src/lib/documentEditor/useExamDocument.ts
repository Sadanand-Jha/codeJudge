"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DocumentBlock,
  DocumentComment,
  DocumentPage,
  DocumentSettings,
  DocumentVersion,
  DrawingStroke,
  ExamDocument,
} from "./types";
import {
  DOCUMENT_STORAGE_KEY,
  VERSIONS_STORAGE_KEY,
  addPage,
  cloneDocument,
  computeTotals,
  createSeedDocument,
  deletePage as deletePageFromDoc,
  duplicatePage as duplicatePageInDoc,
  newId,
  renumberQuestions,
  reorderPages as reorderPagesInDoc,
  touch,
} from "./model";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const MAX_HISTORY = 240;
const MAX_VERSIONS = 12;
const AUTOSAVE_MS = 900;

function isExamDocument(value: unknown): value is ExamDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ExamDocument>;
  return typeof candidate.id === "string" && Array.isArray(candidate.pages) && candidate.pages.length > 0;
}

function readDraft(): ExamDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DOCUMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isExamDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readVersions(): DocumentVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VERSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DocumentVersion[]) : [];
  } catch {
    return [];
  }
}

function writeVersions(versions: DocumentVersion[]): void {
  try {
    window.localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(versions.slice(0, MAX_VERSIONS)));
  } catch {
    // Version history is best-effort when the draft contains large PDF imports.
  }
}

export function useExamDocument() {
  const [initialDraft] = useState<ExamDocument | null>(() => readDraft());
  const [document, setDocumentState] = useState<ExamDocument>(() => initialDraft ?? createSeedDocument());
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => initialDraft?.updatedAt ?? null);
  const [versions, setVersions] = useState<DocumentVersion[]>(() => readVersions());
  const [historyCounts, setHistoryCounts] = useState({ undo: false, redo: false });
  const [trackChanges, setTrackChanges] = useState(false);
  const past = useRef<ExamDocument[]>([]);
  const future = useRef<ExamDocument[]>([]);
  const documentRef = useRef(document);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHistoryAt = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const syncHistory = useCallback(() => {
    setHistoryCounts({ undo: past.current.length > 0, redo: future.current.length > 0 });
  }, []);

  const persist = useCallback((next: ExamDocument) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(next));
      setSaveStatus("saved");
      setLastSavedAt(next.updatedAt);
    } catch {
      setSaveStatus("error");
    }
  }, []);

  const schedulePersist = useCallback(
    (next: ExamDocument) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("dirty");
      saveTimer.current = setTimeout(() => persist(next), AUTOSAVE_MS);
    },
    [persist]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        persist(documentRef.current);
      }
    };
  }, [persist]);

  const commit = useCallback(
    (updater: (current: ExamDocument) => ExamDocument, options: { history?: boolean } = {}) => {
      const history = options.history ?? true;
      const current = documentRef.current;
      const next = updater(current);
      if (next === current) return;
      if (history) {
        const now = Date.now();
        const shouldCoalesce = now - lastHistoryAt.current < 500;
        if (!shouldCoalesce) {
          past.current = [...past.current.slice(-(MAX_HISTORY - 1)), current];
        }
        lastHistoryAt.current = now;
        future.current = [];
      }
      documentRef.current = next;
      setDocumentState(next);
      syncHistory();
      schedulePersist(next);
    },
    [schedulePersist, syncHistory]
  );

  const replaceDocument = useCallback(
    (next: ExamDocument, options: { history?: boolean; persistImmediately?: boolean } = {}) => {
      const current = documentRef.current;
      if (options.history !== false) {
        past.current = [...past.current.slice(-(MAX_HISTORY - 1)), current];
        future.current = [];
      }
      const updated = touch(next);
      documentRef.current = updated;
      setDocumentState(updated);
      syncHistory();
      if (options.persistImmediately) persist(updated);
      else schedulePersist(updated);
    },
    [persist, schedulePersist, syncHistory]
  );

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current = [documentRef.current, ...future.current].slice(0, MAX_HISTORY);
    documentRef.current = previous;
    setDocumentState(previous);
    syncHistory();
    schedulePersist(previous);
  }, [schedulePersist, syncHistory]);

  const redo = useCallback(() => {
    const next = future.current.shift();
    if (!next) return;
    past.current = [...past.current.slice(-(MAX_HISTORY - 1)), documentRef.current];
    documentRef.current = next;
    setDocumentState(next);
    syncHistory();
    schedulePersist(next);
  }, [schedulePersist, syncHistory]);

  const updateBlock = useCallback(
    (pageId: string, blockId: string, patch: Partial<DocumentBlock>, history = false) => {
      commit(
        (current) => ({
          ...current,
          pages: current.pages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  blocks: page.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
                }
              : page
          ),
        }),
        { history }
      );
    },
    [commit]
  );

  const replaceBlockHtml = useCallback(
    (pageId: string, blockId: string, html: string) => updateBlock(pageId, blockId, { html }, false),
    [updateBlock]
  );

  const addBlock = useCallback(
    (pageId: string, block: DocumentBlock, afterBlockId?: string) => {
      commit((current) => ({
        ...current,
        pages: current.pages.map((page) => {
          if (page.id !== pageId) return page;
          const index = afterBlockId ? page.blocks.findIndex((item) => item.id === afterBlockId) : -1;
          const blocks = [...page.blocks];
          blocks.splice(index === -1 ? blocks.length : index + 1, 0, block);
          return { ...page, blocks };
        }),
      }));
      return block.id;
    },
    [commit]
  );

  const removeBlock = useCallback(
    (pageId: string, blockId: string) => {
      commit((current) => ({
        ...current,
        comments: current.comments.filter((comment) => comment.blockId !== blockId),
        pages: current.pages.map((page) =>
          page.id === pageId ? { ...page, blocks: page.blocks.filter((block) => block.id !== blockId) } : page
        ),
      }));
    },
    [commit]
  );

  const moveBlock = useCallback(
    (pageId: string, blockId: string, direction: -1 | 1) => {
      commit((current) => ({
        ...current,
        pages: current.pages.map((page) => {
          if (page.id !== pageId) return page;
          const index = page.blocks.findIndex((block) => block.id === blockId);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= page.blocks.length) return page;
          const blocks = [...page.blocks];
          [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
          return { ...page, blocks };
        }),
      }));
    },
    [commit]
  );

  const updatePage = useCallback(
    (pageId: string, updater: (page: DocumentPage) => DocumentPage, history = true) => {
      commit(
        (current) => ({ ...current, pages: current.pages.map((page) => (page.id === pageId ? updater(page) : page)) }),
        { history }
      );
    },
    [commit]
  );

  const addPageAfter = useCallback(
    (pageId?: string): string => {
      const result = addPage(documentRef.current, pageId);
      replaceDocument(result.document);
      return result.pageId;
    },
    [replaceDocument]
  );

  const deletePage = useCallback(
    (pageId: string) => replaceDocument(deletePageFromDoc(documentRef.current, pageId)),
    [replaceDocument]
  );

  const duplicatePage = useCallback(
    (pageId: string) => replaceDocument(duplicatePageInDoc(documentRef.current, pageId)),
    [replaceDocument]
  );

  const reorderPages = useCallback(
    (from: number, to: number) => replaceDocument(reorderPagesInDoc(documentRef.current, from, to)),
    [replaceDocument]
  );

  const updateSettings = useCallback(
    (patch: Partial<DocumentSettings>) => {
      commit((current) => ({ ...current, settings: { ...current.settings, ...patch } }), { history: true });
    },
    [commit]
  );

  const updateChrome = useCallback(
    (patch: Partial<ExamDocument["chrome"]>) => {
      commit((current) => ({ ...current, chrome: { ...current.chrome, ...patch } }), { history: true });
    },
    [commit]
  );

  const updateMeta = useCallback(
    (patch: Partial<ExamDocument["meta"]>) => {
      commit(
        (current) => ({
          ...current,
          meta: { ...current.meta, ...patch },
          title: patch.title ?? current.title,
        }),
        { history: false }
      );
    },
    [commit]
  );

  const addComment = useCallback(
    (pageId: string, blockId: string, text: string) => {
      const comment: DocumentComment = {
        id: newId("comment"),
        pageId,
        blockId,
        author: "You",
        text: text.trim(),
        createdAt: new Date().toISOString(),
        resolved: false,
      };
      if (!comment.text) return;
      commit((current) => ({ ...current, comments: [...current.comments, comment] }));
    },
    [commit]
  );

  const toggleComment = useCallback(
    (commentId: string) => {
      commit((current) => ({
        ...current,
        comments: current.comments.map((comment) =>
          comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment
        ),
      }));
    },
    [commit]
  );

  const removeComment = useCallback(
    (commentId: string) => {
      commit((current) => ({ ...current, comments: current.comments.filter((comment) => comment.id !== commentId) }));
    },
    [commit]
  );

  const recordChange = useCallback(
    (pageId: string, blockId: string, before: string, after: string) => {
      if (!trackChanges || before === after) return;
      commit((current) => ({
        ...current,
        changes: [
          ...current.changes,
          {
            id: newId("change"),
            pageId,
            blockId,
            before,
            after,
            createdAt: new Date().toISOString(),
            status: "pending" as const,
          },
        ],
      }));
    },
    [commit, trackChanges]
  );

  const resolveChange = useCallback(
    (changeId: string, status: "accepted" | "rejected") => {
      commit((current) => {
        const change = current.changes.find((item) => item.id === changeId);
        if (!change) return current;
        return {
          ...current,
          changes: current.changes.map((item) => (item.id === changeId ? { ...item, status } : item)),
          pages:
            status === "rejected"
              ? current.pages.map((page) => ({
                  ...page,
                  blocks: page.blocks.map((block) =>
                    block.id === change.blockId ? { ...block, html: change.before } : block
                  ),
                }))
              : current.pages,
        };
      });
    },
    [commit]
  );

  const addStroke = useCallback(
    (pageId: string, stroke: Omit<DrawingStroke, "pageId">) => {
      updatePage(
        pageId,
        (page) => ({ ...page, drawings: [...page.drawings, { ...stroke, pageId }] }),
        false
      );
    },
    [updatePage]
  );

  const eraseStrokeAt = useCallback(
    (pageId: string, point: { x: number; y: number }) => {
      updatePage(
        pageId,
        (page) => {
          const index = [...page.drawings].reverse().findIndex((stroke) =>
            stroke.points.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < 2.6)
          );
          if (index === -1) return page;
          const actual = page.drawings.length - 1 - index;
          return { ...page, drawings: page.drawings.filter((_, strokeIndex) => strokeIndex !== actual) };
        },
        false
      );
    },
    [updatePage]
  );

  const clearDrawings = useCallback(
    (pageId: string) => updatePage(pageId, (page) => ({ ...page, drawings: [] })),
    [updatePage]
  );

  const autoRenumber = useCallback(() => {
    replaceDocument(renumberQuestions(documentRef.current));
  }, [replaceDocument]);

  const saveVersion = useCallback(
    (label?: string): boolean => {
      const snapshot: DocumentVersion = {
        id: newId("version"),
        label: label?.trim() || `Version ${versions.length + 1}`,
        createdAt: new Date().toISOString(),
        document: cloneDocument(documentRef.current),
      };
      const next = [snapshot, ...versions].slice(0, MAX_VERSIONS);
      try {
        writeVersions(next);
        setVersions(next);
        persist(touch(documentRef.current));
        return true;
      } catch {
        return false;
      }
    },
    [persist, versions]
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      const version = versions.find((item) => item.id === versionId);
      if (!version) return;
      replaceDocument(cloneDocument(version.document), { history: true, persistImmediately: true });
    },
    [replaceDocument, versions]
  );

  const deleteVersion = useCallback(
    (versionId: string) => {
      const next = versions.filter((item) => item.id !== versionId);
      writeVersions(next);
      setVersions(next);
    },
    [versions]
  );

  const resetToSample = useCallback(() => {
    replaceDocument(createSeedDocument(), { history: true, persistImmediately: true });
  }, [replaceDocument]);

  const totals = useMemo(() => computeTotals(document), [document]);

  return {
    document,
    setDocument: replaceDocument,
    hydrated,
    totals,
    saveStatus,
    lastSavedAt,
    versions,
    canUndo: historyCounts.undo,
    canRedo: historyCounts.redo,
    undo,
    redo,
    updateBlock,
    replaceBlockHtml,
    addBlock,
    removeBlock,
    moveBlock,
    updatePage,
    addPageAfter,
    deletePage,
    duplicatePage,
    reorderPages,
    updateSettings,
    updateChrome,
    updateMeta,
    addComment,
    toggleComment,
    removeComment,
    trackChanges,
    setTrackChanges,
    recordChange,
    resolveChange,
    addStroke,
    eraseStrokeAt,
    clearDrawings,
    autoRenumber,
    saveVersion,
    restoreVersion,
    deleteVersion,
    resetToSample,
  };
}

export type ExamDocumentController = ReturnType<typeof useExamDocument>;
