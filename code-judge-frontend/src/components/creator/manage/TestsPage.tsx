"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Download, FileText, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { getSavedTests, getSavedTestsServerSnapshot, removeSavedTest, subscribeSavedTests, type SavedTestRecord } from "@/utils/savedTests";
import { downloadPaperPdf } from "@/utils/questionSetExport";

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export function TestsPage() {
  const toast = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const tests = useSyncExternalStore(subscribeSavedTests, getSavedTests, getSavedTestsServerSnapshot);

  const handleDelete = useCallback(
    (id: string) => {
      removeSavedTest(id);
      toast.success({ title: "Test removed" });
    },
    [toast]
  );

  const handleDownload = useCallback(
    async (test: SavedTestRecord) => {
      if (!test.paper) {
        toast.error({
          title: "Paper not available",
          description: "This draft was saved before questions were generated.",
        });
        return;
      }
      setDownloadingId(test.id);
      try {
        await downloadPaperPdf({
          paper: test.paper,
          header: { ...test.meta, heading: test.meta.heading || test.title },
        });
        toast.success({ title: "PDF downloaded", description: `"${test.title}" saved as a print-ready paper.` });
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
    <div className="w-full space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-3xl">Tests</h1>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">
            Every generated test is saved here with its paper header and question paper.
          </p>
        </div>
        <Link href="/creator/tests/create" className="b b-pri gap-1.5">
          <Plus className="h-4 w-4" />
          Create test
        </Link>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
            <ClipboardList className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-[var(--qs-ink)]">No tests yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--qs-muted)]">
            Create a test and generate its paper. It will appear here automatically, ready to download as a PDF.
          </p>
          <Link href="/creator/tests/create" className="b b-pri mx-auto mt-5 gap-1.5">
            <Plus className="h-4 w-4" />
            Create your first test
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((test) => (
            <article
              key={test.id}
              className="flex flex-col gap-4 rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[4px_4px_0_var(--qs-sun)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-[var(--qs-ink)]">{test.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-[var(--qs-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatCreatedAt(test.createdAt)}
                    </span>
                    {test.meta.instituteName.trim() && (
                      <>
                        <span>·</span>
                        <span>{test.meta.instituteName.trim()}</span>
                      </>
                    )}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
                  {test.mode === "free" ? "Free" : `₹${test.price}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-[var(--qs-muted)] sm:grid-cols-3">
                <span><strong className="font-extrabold text-[var(--qs-ink)]">Subject:</strong> {test.meta.subject.trim() || test.subjects.join(", ") || "—"}</span>
                <span><strong className="font-extrabold text-[var(--qs-ink)]">Class:</strong> {test.meta.className.trim() || "—"}</span>
                <span><strong className="font-extrabold text-[var(--qs-ink)]">Date:</strong> {test.meta.date.trim() || "—"}</span>
                <span><strong className="font-extrabold text-[var(--qs-ink)]">Time:</strong> {test.meta.timeAllowed.trim() || `${test.duration} min`}</span>
                <span><strong className="font-extrabold text-[var(--qs-ink)]">Questions:</strong> {test.totalQuestions}</span>
                <span><strong className="font-extrabold text-[var(--qs-ink)]">Marks:</strong> {test.totalMarks}</span>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(test)}
                  disabled={!test.paper || downloadingId === test.id}
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
                  onClick={() => handleDelete(test.id)}
                  className="b b-icon sm text-[var(--qs-bad)]"
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
