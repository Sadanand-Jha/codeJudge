"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Download,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  downloadInvoicePdf,
  emailInvoice,
  getInvoice,
  type InvoiceData,
} from "@/services/billing";

const FONT_STACK = "var(--font-onest), system-ui, -apple-system, 'Segoe UI', sans-serif";

function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function InvoicePaper({ data }: { data: InvoiceData }) {
  return (
    <article
      aria-label="Invoice"
      className="relative overflow-hidden rounded-[28px] border-2 border-[#1b1340] bg-white px-5 pb-6 pt-7 text-[#1b1340] shadow-[8px_8px_0_#ffd23f] sm:px-9 sm:pb-8 sm:pt-9"
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <img
            src="/logos/name.png"
            alt="QuizSupport"
            className="h-9 w-auto sm:h-10"
          />
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-[#1b1340] bg-[#ffd23f] px-3.5 py-1.5 text-[11px] font-extrabold tracking-[0.06em]">
            <Zap className="h-3.5 w-3.5 fill-current" />
            {data.kindLabel}
          </span>
        </div>
        <div className="sm:text-right">
          <h2 className="text-[28px] font-extrabold leading-none tracking-[-0.05em] sm:text-[34px]">
            {data.documentTitle}
          </h2>
          <span className="mt-2 block text-[13px] font-bold tabular-nums text-[#5d5878]">
            No. {data.invoiceNo}
          </span>
          <span className="mt-3 inline-block rotate-[-6deg] rounded-[10px] border-[3px] border-[#12805c] bg-[#e5f8ef]/70 px-3.5 py-0.5 text-[16px] font-extrabold tracking-[0.14em] text-[#12805c]">
            {data.statusLabel.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-y-2 border-[#ddd6fe] py-5 sm:grid-cols-3 sm:gap-6">
        <div>
          <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#5d5878]">
            Billed to
          </h4>
          <p className="text-[13.5px] font-medium leading-6">
            <b className="font-extrabold">{data.billedTo.name}</b>
            <br />
            {data.billedTo.email}
          </p>
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#5d5878]">
            From
          </h4>
          <p className="text-[13.5px] font-medium leading-6">
            <b className="font-extrabold">{data.seller.name}</b>
            {data.seller.lines.map((line) => (
              <span key={line}>
                <br />
                {line}
              </span>
            ))}
            {data.seller.gstin ? (
              <>
                <br />
                {data.seller.gstin}
              </>
            ) : null}
          </p>
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#5d5878]">
            Invoice details
          </h4>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt className="font-semibold text-[#5d5878]">Invoice date</dt>
            <dd className="text-right font-bold">{formatDate(data.invoiceDate)}</dd>
            <dt className="font-semibold text-[#5d5878]">Order ID</dt>
            <dd className="break-all text-right font-bold">{data.orderNo}</dd>
            <dt className="font-semibold text-[#5d5878]">Payment</dt>
            <dd className="text-right font-bold uppercase">
              {data.paymentMethod ?? "—"}
            </dd>
            <dt className="font-semibold text-[#5d5878]">Transaction</dt>
            <dd className="break-all text-right font-bold">
              {data.transactionId ?? "—"}
            </dd>
            <dt className="font-semibold text-[#5d5878]">Status</dt>
            <dd className="text-right font-bold">{data.statusLabel}</dd>
          </dl>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[18px] border-2 border-[#1b1340]">
        <div className="hidden grid-cols-[1fr_60px_110px_120px] gap-3 bg-[#f1edff] px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5d5878] sm:grid">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">{data.gstRegistered ? "Rate" : "Price"}</span>
          <span className="text-right">Amount</span>
        </div>
        {data.items.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-[14px] tabular-nums sm:grid-cols-[1fr_60px_110px_120px] ${
              index > 0 ? "border-t-2 border-[#ddd6fe]" : ""
            }`}
          >
            <div className="min-w-0">
              <b className="block text-[14.5px] font-extrabold leading-snug">{item.name}</b>
              <small className="mt-0.5 block text-[12px] leading-snug text-[#5d5878]">
                {item.description}
              </small>
              <span className="mt-1 block text-[12px] text-[#5d5878] sm:hidden">
                Qty {item.quantity} × {formatInr(item.unitPaise)}
              </span>
            </div>
            <span className="hidden text-right sm:block">{item.quantity}</span>
            <span className="hidden text-right sm:block">{formatInr(item.unitPaise)}</span>
            <span className="text-right font-bold">{formatInr(item.amountPaise)}</span>
          </div>
        ))}
        {data.discountPaise > 0 && (
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t-2 border-[#ddd6fe] px-4 py-3.5 text-[14px] font-bold tabular-nums text-[#12805c] sm:grid-cols-[1fr_60px_110px_120px]">
            <div>
              <b className="block text-[14.5px]">{data.discountLabel ?? "Discount"}</b>
              <small className="mt-0.5 block text-[12px] font-medium text-[#12805c]/80">
                Applied to this order
              </small>
            </div>
            <span className="hidden sm:block" />
            <span className="hidden sm:block" />
            <span className="text-right">−{formatInr(data.discountPaise)}</span>
          </div>
        )}
      </div>

      <div className="mt-6 grid items-start gap-6 sm:grid-cols-[1fr_340px]">
        <div className="flex items-center gap-4 rounded-[20px] border-2 border-[#1b1340] bg-[#231f45] px-5 py-4 text-[#ffffff]">
          <span className="grid h-13 w-13 shrink-0 place-items-center rounded-[15px] border-2 border-[#1b1340] bg-[#ffd23f] p-3 text-[#1b1340]">
            {data.kind === "credit_pack" ? (
              <Zap className="h-7 w-7 fill-current" />
            ) : (
              <Sparkles className="h-7 w-7" />
            )}
          </span>
          <div>
            <h3 className="text-[17px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[19px]">
              {data.grant.title}
            </h3>
            <p className="mt-1 text-[12.5px] leading-5 text-[#bdb6e6]">
              {data.grant.description}
            </p>
          </div>
        </div>

        <div className="text-[14px] tabular-nums">
          <div className="flex justify-between px-0.5 py-1.5">
            <span className="font-semibold text-[#5d5878]">Subtotal</span>
            <span>{formatInr(data.subtotalPaise)}</span>
          </div>
          {data.discountPaise > 0 && (
            <div className="flex justify-between px-0.5 py-1.5 font-bold text-[#12805c]">
              <span>Discount</span>
              <span>−{formatInr(data.discountPaise)}</span>
            </div>
          )}
          {data.gstRegistered ? (
            <>
              <div className="flex justify-between px-0.5 py-1.5">
                <span className="font-semibold text-[#5d5878]">Taxable value</span>
                <span>{formatInr(data.taxablePaise)}</span>
              </div>
              <div className="flex justify-between px-0.5 py-1.5">
                <span className="font-semibold text-[#5d5878]">
                  CGST ({data.gstRatePercent / 2}%)
                </span>
                <span>{formatInr(data.cgstPaise)}</span>
              </div>
              <div className="flex justify-between px-0.5 py-1.5">
                <span className="font-semibold text-[#5d5878]">
                  SGST ({data.gstRatePercent / 2}%)
                </span>
                <span>{formatInr(data.sgstPaise)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between px-0.5 py-1.5">
              <span className="font-semibold text-[#5d5878]">GST</span>
              <span>Not applicable</span>
            </div>
          )}
          <div className="mt-2.5 flex items-center justify-between rounded-[16px] border-2 border-[#1b1340] bg-[#6b3fef] px-4 py-3.5 font-extrabold text-[#ffffff] shadow-[5px_5px_0_#ffd23f]">
            <span className="text-[13px] tracking-[0.02em]">TOTAL PAID</span>
            <span className="text-[24px] tracking-[-0.04em] sm:text-[28px]">
              {formatInr(data.totalPaise)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap justify-between gap-4 border-t-2 border-dashed border-[#ddd6fe] pt-5 text-[12px] leading-6 text-[#5d5878]">
        <div>
          <b className="text-[#1b1340]">Need help with this invoice?</b>
          <br />
          Write to {data.seller.email} and quote the invoice number.
        </div>
        <div className="flex items-center gap-2 text-[#12805c]">
          <ShieldCheck className="h-4 w-4" />
          Computer-generated invoice. No signature required.
        </div>
      </div>
    </article>
  );
}

export function InvoiceV2Dialog({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [invoice, setInvoice] = useState<{
    orderId: string;
    data: InvoiceData | null;
    error: string | null;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const current = invoice && invoice.orderId === orderId ? invoice : null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;
  const loading = Boolean(orderId) && !current;

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    getInvoice(orderId)
      .then((result) => {
        if (active) setInvoice({ orderId, data: result, error: null });
      })
      .catch((err: unknown) => {
        if (active) {
          setInvoice({
            orderId,
            data: null,
            error: getApiErrorMessage(err, "Invoice could not be loaded."),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [orderId, onClose]);

  if (!orderId) return null;

  const handleDownload = async () => {
    if (!data || downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadInvoicePdf(orderId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${data.invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success({ title: "Invoice downloaded", description: `Invoice ${data.invoiceNo}.` });
    } catch (err: unknown) {
      toast.error({
        title: "Download failed",
        description: getApiErrorMessage(err, "The invoice PDF could not be downloaded."),
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleEmail = async () => {
    if (!data || emailing) return;
    setEmailing(true);
    try {
      const result = await emailInvoice(orderId);
      toast.success({
        title: "Invoice emailed",
        description: `Sent to ${result.email}.`,
      });
    } catch (err: unknown) {
      toast.error({
        title: "Email failed",
        description: getApiErrorMessage(err, "The invoice email could not be sent."),
      });
    } finally {
      setEmailing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[110] flex overflow-y-auto bg-[#1A1240]/60 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      style={{ fontFamily: FONT_STACK }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.2, 0.75, 0.25, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="Invoice"
        onClick={(event) => event.stopPropagation()}
        className="qs-ui relative m-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[980px] overflow-y-auto overscroll-contain rounded-[22px] border-2 border-[#1b1340] bg-[#f6f4ff] shadow-[8px_8px_0_#ffd23f]"
      >
        <div className="relative overflow-hidden bg-[#2d2260] px-5 pb-8 pt-7 text-[#ffffff] sm:px-9 sm:pb-10 sm:pt-9">
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-full w-[46%] bg-[#4a3f5e]"
            style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-full w-[40%] bg-[#3d3181]"
            style={{ clipPath: "polygon(35% 0, 100% 0, 100% 100%)" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-full w-[34%] bg-[#5b4bb8]"
            style={{ clipPath: "polygon(100% 22%, 100% 100%, 0 100%)" }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice"
            className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-[11px] border-2 border-white/30 bg-white/10 text-[#ffffff] transition-colors hover:border-[#ffd23f] hover:bg-white/15"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] border-2 border-white bg-[#12805c] shadow-[5px_5px_0_#ffd23f]">
                <Check className="h-8 w-8" strokeWidth={3.4} />
              </span>
              <div>
                <span className="inline-block rounded-full border-2 border-[#1b1340] bg-[#ffd23f] px-3 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[#1b1340]">
                  PAYMENT SUCCESSFUL
                </span>
                <h2 className="mt-2 text-[26px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[38px]">
                  Thank you{data ? `, ${data.billedTo.name}` : ""}!
                </h2>
              </div>
            </div>
            {data ? (
              <p className="mt-3 max-w-2xl text-[13.5px] leading-6 text-[#cfc8ff] sm:text-[15px]">
                We&apos;ve received <b className="text-[#ffffff]">{formatInr(data.totalPaise)}</b>. A
                copy of this invoice was sent to{" "}
                <b className="text-[#ffffff]">{data.billedTo.email}</b>.
              </p>
            ) : (
              <p className="mt-3 text-[13.5px] leading-6 text-[#cfc8ff]">
                Fetching your invoice details…
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={!data || downloading}
                className="inline-flex h-11 items-center gap-2 rounded-[13px] border-2 border-[#1b1340] bg-[#ffd23f] px-4 text-[13px] font-extrabold text-[#1b1340] shadow-[0_4px_0_rgba(0,0,0,0.28)] transition-transform hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download invoice (PDF)
              </button>
              <button
                type="button"
                onClick={() => void handleEmail()}
                disabled={!data || emailing}
                className="inline-flex h-11 items-center gap-2 rounded-[13px] border-2 border-white/60 bg-transparent px-4 text-[13px] font-extrabold text-[#ffffff] transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Email me a copy
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-7">
          {loading ? (
            <div className="grid place-items-center rounded-[24px] border-2 border-[#1b1340] bg-white py-24">
              <Loader2 className="h-8 w-8 animate-spin text-[#6b3fef]" />
              <p className="mt-3 text-sm font-bold text-[#1b1340]">Loading invoice…</p>
            </div>
          ) : error ? (
            <div className="grid place-items-center rounded-[24px] border-2 border-[#1b1340] bg-white px-6 py-20 text-center">
              <p className="text-sm font-bold text-[#1b1340]">Invoice could not be loaded</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-[#5d5878]">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-[12px] border-2 border-[#1b1340] bg-[#6b3fef] px-4 py-2 text-[13px] font-extrabold text-[#ffffff]"
              >
                Close
              </button>
            </div>
          ) : data ? (
            <InvoicePaper data={data} />
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
