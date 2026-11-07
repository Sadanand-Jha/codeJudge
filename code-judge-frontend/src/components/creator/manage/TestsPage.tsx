"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserTimeZone } from "@/lib/timezone";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Download, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  cacheSavedTestPreview,
  getSavedTest,
  getSavedTests,
  migrateLegacySavedTests,
  removeSavedTest,
  type SavedTestSummary,
} from "@/utils/savedTests";
import { createPaperPreviewDataUrl, downloadPaperPdf } from "@/utils/questionSetExport";
import { useLetterheadChoice } from "@/hooks/useLetterheadChoice";
import { SavedTestEditDialog } from "./SavedTestEditDialog";

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { timeZone: getUserTimeZone(), day: "2-digit", month: "short", year: "numeric" });
};

function SavedPaperPreview({
  test,
  onDownload,
  onEdit,
  onDelete,
  downloading,
  deleting,
}: {
  test: SavedTestSummary;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
  downloading: boolean;
  deleting: boolean;
}) {
  const [preview, setPreview] = useState(test.previewDataUrl);
  const [loading, setLoading] = useState(!test.previewDataUrl);

  useEffect(() => {
    let active = true;
    if (test.previewDataUrl) return () => { active = false; };

    void (async () => {
      try {
        const saved = await getSavedTest(test.id);
        if (!saved.paper) throw new Error("This saved paper has no question content.");
        const previewDataUrl = await createPaperPreviewDataUrl({
          paper: saved.paper,
          header: { ...saved.meta, heading: saved.meta.heading || saved.title },
        });
        if (active) setPreview(previewDataUrl);
        await cacheSavedTestPreview(test.id, previewDataUrl);
      } catch (error) {
        console.error(`Could not prepare or cache the preview for saved paper ${test.id}.`, error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [test.id, test.previewDataUrl, test.updatedAt]);

  return (
    <div className="group relative aspect-[210/297] w-full overflow-hidden rounded-[12px] border-2 border-[var(--qs-ink)] bg-white shadow-[3px_3px_0_var(--qs-sun)]">
      {preview ? (
        <Image
          src={preview}
          alt={`First page preview of ${test.title}`}
          fill
          sizes="(max-width: 640px) 100vw, 220px"
          unoptimized
          className="absolute inset-0 h-full w-full object-contain object-top"
        />
      ) : loading ? (
        <div className="absolute inset-0 animate-pulse bg-white p-[8%]" aria-label="Generating paper preview">
          <div className="mx-auto mt-[3%] h-[3%] w-[42%] rounded-full bg-[#d9d4eb]" />
          <div className="mt-[5%] h-[8%] rounded-sm border border-[#d9d4eb] bg-[#f7f6fb]" />
          <div className="mt-[4%] h-[2%] w-[80%] rounded-full bg-[#e5e2ef]" />
          <div className="mt-[2%] h-[2%] w-[90%] rounded-full bg-[#e5e2ef]" />
          <div className="mt-[5%] h-[3%] w-[52%] rounded-sm bg-[#d9d4eb]" />
          <div className="mt-[3%] space-y-[2%]">
            {[86, 74, 91, 62, 82, 70, 88, 55].map((width, index) => (
              <div key={index} className="h-[2%] rounded-full bg-[#e5e2ef]" style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-white p-[8%]" title="Paper preview could not be generated">
          <div className="mx-auto mt-[3%] h-[3%] w-[42%] rounded-full bg-[#d9d4eb]" />
          <div className="mt-[5%] h-[8%] border border-[#d9d4eb] bg-[#f7f6fb] p-[2%]">
            <div className="space-y-[10%]">
              <div className="h-1 rounded-full bg-[#e5e2ef]" />
              <div className="h-1 w-[82%] rounded-full bg-[#e5e2ef]" />
            </div>
          </div>
          <div className="mt-[4%] space-y-[3%]">
            {[92, 82, 88, 66, 94, 72, 85, 58].map((width, index) => (
              <div key={index} className="h-1 rounded-full bg-[#e5e2ef]" style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>
      )}
      <span className="absolute right-2 top-2 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
        Saved
      </span>
      <div className="absolute inset-x-0 bottom-0 flex translate-y-2 flex-col items-center gap-2 bg-gradient-to-t from-[#1a1240]/90 via-[#1a1240]/65 to-transparent px-3 pb-3 pt-12 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <p className="w-full truncate text-center text-xs font-extrabold text-white" title={test.title}>
          {test.title}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="b b-pri sm gap-1.5 disabled:cursor-not-allowed"
          >
            {downloading ? <FileText className="h-3.5 w-3.5 animate-pulse" /> : <Download className="h-3.5 w-3.5" />}
            {downloading ? "Preparing…" : "PDF"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="b b-icon sm bg-white"
            aria-label={`Edit details for ${test.title}`}
            title="Edit details"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="b b-icon sm bg-white text-[var(--qs-bad)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Delete ${test.title}`}
            title="Delete paper"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTestCard() {
  return (
    <Link
      href="/creator/tests/create"
      className="flex aspect-[210/297] w-full flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[var(--qs-brand)]/70 text-[var(--qs-brand)] transition-colors hover:bg-[var(--qs-poly-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--qs-brand)]"
    >
      <Plus className="h-7 w-7" />
      <span className="text-sm font-extrabold">New test</span>
    </Link>
  );
}

export function TestsPage() {
  const toast = useToast();
  const [tests, setTests] = useState<SavedTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingTest, setEditingTest] = useState<SavedTestSummary | null>(null);
  const { chooseHeader, dialog: headerChoiceDialog } = useLetterheadChoice();

  const loadTests = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setTests(await getSavedTests());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load your saved papers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await migrateLegacySavedTests().catch(() => {});
      try {
        const saved = await getSavedTests();
        if (active) setTests(saved);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load your saved papers.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = useCallback(
    async (test: SavedTestSummary) => {
      setDeletingId(test.id);
      try {
        await removeSavedTest(test.id);
        setTests((current) => current.filter((item) => item.id !== test.id));
        toast.success({ title: "Paper removed", description: `"${test.title}" was deleted from your account.` });
      } catch (error) {
        toast.error({
          title: "Could not remove paper",
          description: error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setDeletingId(null);
      }
    },
    [toast]
  );

  const handleSaved = useCallback((updated: SavedTestSummary) => {
    setTests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const handleDownload = useCallback(
    async (test: SavedTestSummary) => {
      setDownloadingId(test.id);
      try {
        const saved = await getSavedTest(test.id);
        if (!saved.paper) {
          toast.error({ title: "Paper not available", description: "This saved record has no question paper." });
          return;
        }
        const choice = await chooseHeader();
        if (choice.status === "cancelled") return;
        await downloadPaperPdf({
          paper: saved.paper,
          header: { ...saved.meta, heading: saved.meta.heading || saved.title },
          letterhead: choice.placement,
        });
        toast.success({ title: "PDF downloaded", description: `"${saved.title}" saved as a print-ready paper.` });
      } catch (error) {
        toast.error({
          title: "Download failed",
          description: error instanceof Error ? error.message : "Could not prepare the paper.",
        });
      } finally {
        setDownloadingId(null);
      }
    },
    [toast, chooseHeader]
  );

  return (
    <div className="w-full min-w-0 space-y-5 pb-10">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-3xl">Tests</h1>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">Generate a question paper and it is saved to your account automatically.</p>
        </div>
      </div>

      {loading ? (
        <div
          className="grid min-w-0 justify-start gap-x-5 gap-y-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 220px))" }}
          aria-label="Loading saved papers"
        >
          <NewTestCard />
          {[0, 1].map((item) => (
            <div
              key={item}
              className="aspect-[210/297] w-full animate-pulse rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="space-y-5">
          <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-8 text-center">
            <h2 className="text-lg font-extrabold text-[var(--qs-ink)]">Could not load your papers</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--qs-muted)]">{loadError}</p>
            <button type="button" onClick={() => void loadTests()} className="b b-pri mx-auto mt-5">
              Try again
            </button>
          </div>
          <div
            className="grid min-w-0 justify-start gap-x-5 gap-y-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 220px))" }}
          >
            <NewTestCard />
          </div>
        </div>
      ) : tests.length === 0 ? (
        <div
          className="grid min-w-0 justify-start gap-x-5 gap-y-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 220px))" }}
        >
          <NewTestCard />
        </div>
      ) : (
        <div
          className="grid min-w-0 justify-start gap-x-5 gap-y-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 220px))" }}
        >
          <NewTestCard />
          {tests.map((test) => (
            <article
              key={`${test.id}-${test.updatedAt}`}
              className="flex min-w-0 max-w-[220px] flex-col gap-2"
            >
              <SavedPaperPreview
                test={test}
                onDownload={() => void handleDownload(test)}
                onEdit={() => setEditingTest(test)}
                onDelete={() => void handleDelete(test)}
                downloading={downloadingId === test.id}
                deleting={deletingId === test.id}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold leading-5 text-[var(--qs-ink)]" title={test.title}>
                  {test.title}
                </p>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] font-semibold text-[var(--qs-muted)]">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <span className="truncate">{formatCreatedAt(test.createdAt)}</span>
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--qs-muted)]">
                  {test.totalQuestions} Qs · {test.totalMarks} marks · {test.duration} min
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingTest && (
        <SavedTestEditDialog
          key={editingTest.id}
          test={editingTest}
          onClose={() => setEditingTest(null)}
          onSaved={handleSaved}
        />
      )}

      {headerChoiceDialog}
    </div>
  );
}
