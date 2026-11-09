"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileSpreadsheet, FileText, FileDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { BillButton, IconButton } from "./ui";
import Select from "@/components/ui/Select";

const SCOPE_OPTIONS = [
  { id: "transactions", label: "Transactions" },
  { id: "sales", label: "Sales" },
  { id: "payouts", label: "Payouts" },
  { id: "refunds", label: "Refunds" },
  { id: "revenue", label: "Revenue" },
  { id: "tax", label: "Tax statements" },
];

const FORMAT_OPTIONS = [
  { id: "csv", label: "CSV", icon: FileSpreadsheet },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
  { id: "pdf", label: "PDF", icon: FileText },
];

const PRODUCT_FILTERS = ["All products"];
const STATUS_FILTERS = ["All statuses", "Completed", "Processing", "Pending", "Failed", "Refunded"];

type Scope = (typeof SCOPE_OPTIONS)[number]["id"];
type Format = (typeof FORMAT_OPTIONS)[number]["id"];

export function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [scope, setScope] = useState<Scope>("transactions");
  const [format, setFormat] = useState<Format>("csv");
  const [product, setProduct] = useState(PRODUCT_FILTERS[0]);
  const [status, setStatus] = useState(STATUS_FILTERS[0]);
  const [range, setRange] = useState("Last 10 days");
  const [progress, setProgress] = useState<number | null>(null);

  const handleExport = () => {
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = (p ?? 0) + 20;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setProgress(null);
            onClose();
            toast.success({
              title: "Export ready",
              description: `${scope} exported as ${format.toUpperCase()} (${range}).`,
            });
          }, 300);
          return 100;
        }
        return next;
      });
    }, 450);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card shadow-2xl sm:rounded-2xl sm:border"
            role="dialog"
            aria-modal="true"
            aria-label="Export center"
          >
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 sm:px-6 sm:py-4">
              <div>
                <p className="text-[13.5px] font-bold text-text-primary sm:text-[15px]">Export Center</p>
                <p className="mt-0.5 text-[10.5px] text-text-secondary sm:text-xs">Download your financial data.</p>
              </div>
              <IconButton label="Close" onClick={onClose}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-3.5 py-3 sm:px-6 sm:py-5">
              {/* Scope */}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">What to export</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-2.5 sm:gap-2 sm:grid-cols-3">
                {SCOPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setScope(opt.id)}
                    className={cn(
                      "rounded-[9px] border px-2 py-2 text-[10.5px] font-medium transition-all sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs sm:font-semibold",
                      scope === opt.id
                        ? "border-pink-500/40 bg-pink-500/[0.07] text-pink-600 dark:border-ai-accent/40 dark:bg-ai-accent-soft dark:text-ai-accent"
                        : "border-border bg-card-hover text-text-secondary hover:border-border-hover hover:text-text-primary"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Format */}
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:mt-5 sm:text-xs">Format</p>
              <div className="mt-1.5 flex items-center gap-1.5 sm:mt-2.5 sm:gap-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id)}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border px-2 py-2 text-[10.5px] font-medium transition-all sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs sm:font-semibold",
                      format === opt.id
                        ? "border-pink-500/40 bg-pink-500/[0.07] text-pink-600 dark:border-ai-accent/40 dark:bg-ai-accent-soft dark:text-ai-accent"
                        : "border-border bg-card-hover text-text-secondary hover:border-border-hover"
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Filters */}
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:mt-5 sm:text-xs">Filters</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:mt-2.5 sm:gap-3">
                <div>
                  <label className="mb-1 hidden text-[10px] font-medium text-text-muted sm:mb-1.5 sm:block sm:text-[11px]">Date range</label>
                  <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-full rounded-[8px] border border-input-border bg-input-bg px-2 py-1.5 text-[10.5px] text-text-primary outline-none focus:border-accent sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-xs">
                    {["Today", "Last 7 days", "Last 10 days", "Last 30 days", "This month", "Last month", "Custom range"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 hidden text-[10px] font-medium text-text-muted sm:mb-1.5 sm:block sm:text-[11px]">Product</label>
                  <Select value={product} onChange={(e) => setProduct(e.target.value)} className="w-full rounded-[8px] border border-input-border bg-input-bg px-2 py-1.5 text-[10.5px] text-text-primary outline-none focus:border-accent sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-xs">
                    {PRODUCT_FILTERS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 hidden text-[10px] font-medium text-text-muted sm:mb-1.5 sm:block sm:text-[11px]">Status</label>
                  <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-[8px] border border-input-border bg-input-bg px-2 py-1.5 text-[10.5px] text-text-primary outline-none focus:border-accent sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-xs">
                    {STATUS_FILTERS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Progress */}
              {progress !== null && (
                <div className="mt-3 sm:mt-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-secondary">
                      {progress < 100 ? "Preparing your export..." : "Done"}
                    </span>
                    <span className="font-bold text-text-primary tabular-nums">{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        progress === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-pink-500 to-violet-600"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-3.5 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
              <BillButton variant="ghost" onClick={onClose} disabled={progress !== null}>
                Cancel
              </BillButton>
              <BillButton onClick={handleExport} loading={progress !== null} icon={progress === 100 ? <CheckCircle2 className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}>
                {progress !== null ? "Exporting..." : "Export"}
              </BillButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}