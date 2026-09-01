"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Calendar, CreditCard } from "lucide-react";
import { cn } from "@/lib/helpers";
import { usePurchasesStore } from "@/store/purchasesStore";
// import { usePurchasesStore } from "@/store/purchasesStore";
const USER_LABEL = "Student";
const USER_EMAIL = "student@byteclash.dev";

function InvoiceToolbar({ onPrint, onClose }: { onPrint: () => void; onClose: () => void }) {
  return (
    <div className="print:hidden flex items-center justify-end gap-2 border-b border-border p-4">
      <button
        onClick={onPrint}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)] hover:scale-95"
      >
        <Download className="h-3.5 w-3.5" /> Download / Print
      </button>
      <button
        onClick={onClose}
        className="rounded-lg p-1.5 text-text-secondary hover:bg-accent/5 hover:text-text-primary"
        aria-label="Close invoice"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function PurchaseInvoice() {
  const { orders, purchases, invoiceId, closeInvoice } = usePurchasesStore();
  const order = orders.find((o) => o.id === invoiceId);
  const items = order
    ? purchases.filter((p) => p.orderId === order.id)
    : [];

  const onPrint = () => {
    window.print();
  };

  if (!order) return null;

  const subtotal = order.items.reduce((s, i) => s + i.amount, 0);
  const tax = 0;
  const total = subtotal + tax;

  return (
    <AnimatePresence>
      {invoiceId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeInvoice}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="pointer-events-auto w-full max-w-4xl rounded-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <InvoiceToolbar onPrint={onPrint} onClose={closeInvoice} />

            {/* Invoice body */}
            <div className="px-8 py-10">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-sm font-black text-white">
                    BC
                  </div>
                  <div>
                    <div className="text-xl font-black text-text-primary">ByteClash</div>
                    <div className="text-xs text-text-secondary">Learning Platform</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Invoice
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight text-pink-400">
                    {order.id}
                  </div>
                </div>
              </div>

              {/* Bill to / meta */}
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Bill to
                  </div>
                  <div className="font-medium text-text-primary">{USER_LABEL}</div>
                  <div className="text-sm text-text-secondary">{USER_EMAIL}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-text-muted" />
                    <span className="text-xs text-text-secondary">Invoice date</span>
                    <span className="ml-auto text-sm font-medium text-text-primary">
                      {new Date(order.date).toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-text-muted" />
                    <span className="text-xs text-text-secondary">Payment method</span>
                    <span className="ml-auto text-sm font-medium text-text-primary">{order.method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">Order status</span>
                    <span
                      className={cn(
                        "ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold",
                        order.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      )}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div className="mt-8 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background/40">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        #
                      </th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Description
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Qty
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Unit
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id} className="border-t border-border/40">
                        <td className="px-4 py-3 text-xs text-text-muted">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary">{it.name}</div>
                          <div className="text-xs text-text-secondary">
                            by {it.creator} · {it.exam}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">1</td>
                        <td className="px-4 py-3 text-right text-sm">₹{it.price === 0 ? "Free" : it.price.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right font-medium text-text-primary">
                          ₹{it.price === 0 ? "0" : it.price.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 &&
                      order.items.map((it, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="px-4 py-3 text-xs text-text-muted">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-text-primary">{it.name}</td>
                          <td className="px-4 py-3 text-right text-sm">1</td>
                          <td className="px-4 py-3 text-right text-sm">₹{it.amount.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-medium text-text-primary">
                            ₹{it.amount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-xs space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="font-medium text-text-primary">₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Tax (included)</span>
                    <span className="font-medium text-text-primary">₹{tax.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                    <span className="text-sm font-semibold text-text-secondary">Total</span>
                    <span className="text-xl font-black text-pink-400">₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Status + access stamp */}
              <div className="mt-6 flex items-center justify-between rounded-xl border border-border/40 bg-background/30 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                      order.status === "PAID"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    )}
                  >
                    {order.status === "PAID" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    {order.status}
                  </span>
                  <span className="text-xs text-text-secondary">
                    Paid via {order.method} on {new Date(order.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </div>
                {items[0]?.expiresAt && (
                  <span className="text-xs text-text-secondary">
                    Access valid until {new Date(items[0].expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                )}
              </div>

              {/* Notes */}
              <div className="mt-8 border-t border-border pt-4 text-xs text-text-secondary">
                <p>
                  Thank you for choosing ByteClash. This invoice confirms your purchase of the
                  learning resources listed above. Access remains valid as described on each product.
                  For billing questions, contact <span className="text-text-primary">support@byteclash.dev</span>.
                </p>
              </div>

              {/* Footer */}
              <div className="mt-8 border-t border-border pt-4 text-center text-xs text-text-muted">
                © {new Date().getFullYear()} ByteClash. All rights reserved.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
