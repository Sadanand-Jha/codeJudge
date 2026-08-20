"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, ShieldCheck, FileText, Download, MapPin, Landmark, IdCard, FileWarning } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useBillingData } from "./hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  StatusBadge,
  BillButton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  formatINR,
} from "./ui";
import { TAX_PROFILE, DOCUMENTS } from "./mockData";
import type { TaxProfile, FinancialDocument } from "./types";

const TAX_DOC_SLOTS = [
  { key: "monthly", label: "Monthly statement", description: "Auto-generated each month" },
  { key: "quarterly", label: "Quarterly statement", description: "Auto-generated each quarter" },
  { key: "annual", label: "Annual statement", description: "Generated at financial year end" },
  { key: "invoice", label: "Tax invoice", description: "GST-compliant invoice" },
];

export function TaxPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const { state, retry } = useBillingData(() => TAX_PROFILE as TaxProfile, { demoState });
  const [profile] = useState<TaxProfile | null>(TAX_PROFILE);

  const taxDocs = DOCUMENTS.filter((d) => d.type === "tax" || d.type === "invoice");

  const download = (label: string) =>
    toast.info({ title: `Downloading ${label}`, description: "File download will be wired to the backend." });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax & Compliance"
        subtitle="Your business information and tax documents for the platform."
        badge={<MockDataTag />}
        actions={<BillButton variant="ghost" href="/creator/billing/documents">All documents</BillButton>}
      />

      {state === "loading" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TableSkeleton rows={5} cols={2} />
          <TableSkeleton rows={4} cols={2} />
        </div>
      )}
      {state === "error" && <ErrorState onRetry={retry} />}
      {state === "empty" && (
        <EmptyState
          title="No compliance data yet"
          description="Your tax profile and documents will appear once you have earnings to report."
        />
      )}

      {state === "ready" && profile && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Creator information */}
            <Panel title="Creator Information" subtitle="Verified business details used for tax reporting">
              <div className="space-y-0">
                {[
                  { icon: IdCard, label: "Legal name", value: profile.legalName, badge: "Verified" },
                  { icon: Landmark, label: "Business name", value: profile.businessName, badge: "Verified" },
                  { icon: MapPin, label: "Address", value: profile.address, badge: null },
                  { icon: MapPin, label: "Country", value: profile.country, badge: null },
                  { icon: IdCard, label: "PAN", value: profile.pan, badge: "Verified" },
                  {
                    icon: FileWarning,
                    label: "GST status",
                    value: profile.gstStatus,
                    badge: profile.gstStatus === "Registered" ? "Active" : "Not registered",
                  },
                  ...(profile.gstin ? [{ icon: FileText, label: "GSTIN", value: profile.gstin, badge: "Valid" }] : []),
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={
                      "flex items-center justify-between gap-4 py-3.5" +
                      (i < arr.length - 1 ? " border-b border-border/60" : "")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-text-secondary">
                        <row.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-text-muted">{row.label}</p>
                        <p className="text-sm font-medium text-text-primary">{row.value}</p>
                      </div>
                    </div>
                    {row.badge && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                        <BadgeCheck className="h-3 w-3" />
                        {row.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            {/* Verification + compliance note */}
            <div className="space-y-6">
              <Panel title="Verification Status">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Identity verified</p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Your PAN and bank details are verified. KYC is up to date.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-text-muted">
                  Tax is calculated and remitted by the platform where applicable. The numbers shown here reflect
                  statements generated by the platform — they do not substitute professional tax advice. Consult your
                  CA for filing.
                </p>
              </Panel>

              <Panel title="Recent Tax Documents">
                <div className="space-y-2.5">
                  {taxDocs.slice(0, 3).map((doc) => (
                    <DocRow key={doc.id} doc={doc} onDownload={download} />
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          {/* Tax document slots */}
          <Panel title="Tax Documents" subtitle="Generate or download your financial statements">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TAX_DOC_SLOTS.map((slot) => (
                <motion.div
                  key={slot.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card-hover p-4 transition-all hover:border-border-hover"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{slot.label}</p>
                      <p className="text-[11px] text-text-muted">{slot.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => download(`${slot.label} (PDF)`)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => download(`${slot.label} (CSV)`)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                    >
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function DocRow({
  doc,
  onDownload,
}: {
  doc: FinancialDocument;
  onDownload: (label: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card-hover p-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-text-primary">{doc.name}</p>
        <p className="mt-0.5 text-[11px] text-text-muted">
          {doc.period} · {formatINR(doc.amount)}
        </p>
      </div>
      <StatusBadge label={doc.type} tone={doc.type === "tax" ? "violet" : "sky"} />
      <button
        type="button"
        onClick={() => onDownload(doc.name)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </button>
    </div>
  );
}