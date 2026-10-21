"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Download, FilePenLine, FileText, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { getSavedTest, getSavedTests, migrateLegacySavedTests, removeSavedTest, type SavedTestSummary } from "@/utils/savedTests";
import { downloadPaperPdf } from "@/utils/questionSetExport";

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export function TestsPage() {
  const toast = useToast();
  const [tests, setTests] = useState<SavedTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const handleDownload = useCallback(
    async (test: SavedTestSummary) => {
      setDownloadingId(test.id);
      try {
        const saved = await getSavedTest(test.id);
        if (!saved.paper) {
          toast.error({ title: "Paper not available", description: "This saved record has no question paper." });
          return;
        }
        await downloadPaperPdf({
          paper: saved.paper,
          header: { ...saved.meta, heading: saved.meta.heading || saved.title },
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
    [toast]
  );

  return (
    <div className="w-full min-w-0 space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-3xl">Tests</h1>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">
            Generate a question paper and it is saved to your account automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/creator/tests/editor" className="b gap-1.5">
            <FilePenLine className="h-4 w-4" />
            Open Paper Studio
          </Link>
          <Link href="/creator/tests/create" className="b b-pri gap-1.5">
            <Plus className="h-4 w-4" />
            Create test
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2" aria-label="Loading saved papers">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-12 text-center">
          <h2 className="text-lg font-extrabold text-[var(--qs-ink)]">Could not load your papers</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--qs-muted)]">{loadError}</p>
          <button type="button" onClick={() => void loadTests()} className="b b-pri mx-auto mt-5">
            Try again
          </button>
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
            <ClipboardList className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-[var(--qs-ink)]">No saved papers yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--qs-muted)]">
            Build a test and generate its question paper. It will appear here automatically, ready to download as a PDF.
          </p>
          <Link href="/creator/tests/create" className="b b-pri mx-auto mt-5 gap-1.5">
            <Plus className="h-4 w-4" />
            Create your first paper
          </Link>
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {tests.map((test) => (
            <article
              key={test.id}
              className="flex min-w-0 max-w-full flex-col gap-4 overflow-hidden rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[4px_4px_0_var(--qs-sun)]"
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 basis-[12rem]">
                  <p className="truncate text-base font-extrabold text-[var(--qs-ink)]">{test.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-[var(--qs-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatCreatedAt(test.createdAt)}
                    </span>
                    {test.meta.instituteName.trim() && (
                      <>
                        <span>·</span>
                        <span className="min-w-0 break-words">{test.meta.instituteName.trim()}</span>
                      </>
                    )}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
                  Saved
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-[var(--qs-muted)] sm:grid-cols-3">
                <span className="min-w-0 break-words"><strong className="font-extrabold text-[var(--qs-ink)]">Subject:</strong> {test.meta.subject.trim() || test.subjects.join(", ") || "—"}</span>
                <span className="min-w-0 break-words"><strong className="font-extrabold text-[var(--qs-ink)]">Class:</strong> {test.meta.className.trim() || "—"}</span>
                <span className="min-w-0 break-words"><strong className="font-extrabold text-[var(--qs-ink)]">Date:</strong> {test.meta.date.trim() || "—"}</span>
                <span className="min-w-0 break-words"><strong className="font-extrabold text-[var(--qs-ink)]">Time:</strong> {test.meta.timeAllowed.trim() || `${test.duration} min`}</span>
                <span className="min-w-0 break-words"><strong className="font-extrabold text-[var(--qs-ink)]">Questions:</strong> {test.totalQuestions}</span>
                <span className="min-w-0 break-words"><strong className="font-extrabold text-[var(--qs-ink)]">Marks:</strong> {test.totalMarks}</span>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(test)}
                  disabled={downloadingId === test.id}
                  className="b b-pri sm gap-1.5 disabled:cursor-not-allowed"
                >
                  {downloadingId === test.id ? (
                    <FileText className="h-3.5 w-3.5 animate-pulse" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {downloadingId === test.id ? "Preparing…" : "Download PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(test)}
                  disabled={deletingId === test.id}
                  className="b b-icon sm text-[var(--qs-bad)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${test.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
