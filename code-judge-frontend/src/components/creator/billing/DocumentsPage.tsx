"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, FolderOpen, Download, Eye, FilePlus2, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useBillingData } from "./hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  SegmentedControl,
  BillButton,
  IconButton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  StatusBadge,
  formatINR,
} from "./ui";
import { DOCUMENTS } from "./mockData";
import type { FinancialDocument } from "./types";

const TAB_OPTIONS = [
  { id: "all", label: "All" },
  { id: "invoice", label: "Invoices" },
  { id: "statement", label: "Statements" },
  { id: "tax", label: "Tax Documents" },
] as const;

export function DocumentsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const { state, retry } = useBillingData(() => DOCUMENTS as FinancialDocument[], { demoState });
  const [tab, setTab] = useState<"all" | "invoice" | "statement" | "tax">("all");
  const [docs, setDocs] = useState<FinancialDocument[]>(DOCUMENTS);
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState("2026-07");
  const [generating, setGenerating] = useState(false);

  const filtered = useMemo(
    () => docs.filter((d) => tab === "all" || d.type === tab),
    [docs, tab]
  );

  const download = (name: string, format: string) =>
    toast.info({ title: `Downloading ${name}`, description: `${format.toUpperCase()} export is being prepared.` });

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenOpen(false);
      const [y, m] = genMonth.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" });
      const doc: FinancialDocument = {
        id: `doc_gen_${Date.now()}`,
        name: `Monthly Statement — ${label}`,
        period: genMonth,
        generatedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        amount: 64280,
        type: "statement",
        formats: ["pdf", "excel"],
      };
      setDocs((prev) => [doc, ...prev]);
      toast.success({ title: "Statement generated", description: `Statement for ${label} is ready.` });
    }, 1400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Statements"
        subtitle="Download invoices, statements and tax documents for your records."
        badge={<MockDataTag />}
        actions={
          <BillButton icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setGenOpen(true)}>
            Generate Statement
          </BillButton>
        }
      />

      {state === "loading" && <TableSkeleton rows={6} cols={7} />}
      {state === "error" && <ErrorState onRetry={retry} />}
      {state === "empty" && (
        <EmptyState
          title="No documents yet"
          description="Statements and invoices will be generated here as your earnings grow."
        />
      )}

      {state === "ready" && (
        <Panel noPadding>
          <div className="p-4">
            <SegmentedControl value={tab} onChange={(t) => setTab(t)} options={TAB_OPTIONS} size="md" />
          </div>

          <div className="hidden overflow-x-auto px-4 pb-4 md:block">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-3">Document</th>
                  <th className="px-3 py-3">Period</th>
                  <th className="px-3 py-3">Generated</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="max-w-[260px] truncate font-semibold text-text-primary">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-text-secondary">{doc.period}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-text-muted">{doc.generatedAt}</td>
                    <td className="px-3 py-3.5 text-right font-bold text-text-primary tabular-nums">{formatINR(doc.amount)}</td>
                    <td className="px-3 py-3.5">
                      <StatusBadge label={doc.type === "tax" ? "Tax" : doc.type === "invoice" ? "Invoice" : "Statement"} tone={doc.type === "tax" ? "violet" : doc.type === "invoice" ? "sky" : "emerald"} />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => download(doc.name, "view")}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        {doc.formats.includes("pdf") && (
                          <button
                            type="button"
                            onClick={() => download(doc.name, "pdf")}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        )}
                        {doc.formats.includes("csv") && (
                          <button
                            type="button"
                            onClick={() => download(doc.name, "csv")}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                          >
                            <Download className="h-3.5 w-3.5" />
                            CSV
                          </button>
                        )}
                        {doc.formats.includes("excel") && (
                          <button
                            type="button"
                            onClick={() => download(doc.name, "excel")}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Excel
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {filtered.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{doc.name}</p>
                      <p className="text-[11px] text-text-muted">
                        {doc.period} · {doc.generatedAt}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-text-primary tabular-nums">{formatINRCompact(doc.amount)}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  {doc.formats.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => download(doc.name, f)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Generate statement modal */}
      <AnimatePresence>
        {genOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setGenOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-bold text-text-primary">Generate Statement</p>
                  <p className="mt-0.5 text-xs text-text-secondary">Choose a month to generate.</p>
                </div>
                <IconButton label="Close" onClick={() => setGenOpen(false)}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <label className="mb-1.5 mt-5 block text-xs font-medium text-text-secondary">Month</label>
              <input
                type="month"
                value={genMonth}
                max="2026-08"
                onChange={(e) => setGenMonth(e.target.value)}
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-text-primary outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)]"
              />
              <div className="mt-5 flex items-center justify-end gap-3">
                <BillButton variant="ghost" onClick={() => setGenOpen(false)} disabled={generating}>
                  Cancel
                </BillButton>
                <BillButton onClick={generate} loading={generating} icon={generating ? undefined : <FilePlus2 className="h-4 w-4" />}>
                  {generating ? "Generating..." : "Generate"}
                </BillButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatINRCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (abs >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  if (abs >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}