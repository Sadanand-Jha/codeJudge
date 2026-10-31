// Invoice V2: builds the canonical invoice snapshot for a paid order, renders
// the printable HTML used by both the in-app viewer and the PDF, and sends the
// payment-success + invoice emails.
import * as billingRepository from "../repositories/billing.repository.ts";
import type {
  OrderRow,
  PurchasableCreditPack,
  PurchasablePlanBundle,
} from "../repositories/billing.repository.ts";
import { BillingError } from "./billing/errors.ts";
import { getBrandLogo, OTP_LOGO_CID, sendEmail } from "./email.ts";
import { renderInvoicePdf } from "./invoicePdf.service.ts";
import logger from "../utils/logger.ts";

export const GST_RATE_PERCENT = 18;

export type InvoiceKind = "plan" | "credit_pack" | "bundle";

export interface InvoiceLineItem {
  name: string;
  description: string;
  quantity: number;
  unitPaise: number;
  amountPaise: number;
}

export interface InvoiceData {
  invoiceNo: string;
  documentTitle: "INVOICE" | "TAX INVOICE";
  kind: InvoiceKind;
  kindLabel: string;
  status: string;
  statusLabel: string;
  invoiceDate: string;
  paidAt: string | null;
  orderId: string;
  orderNo: string;
  transactionId: string | null;
  paymentMethod: string | null;
  currency: string;
  billedTo: { name: string; email: string };
  seller: { name: string; lines: string[]; gstin: string | null; email: string };
  items: InvoiceLineItem[];
  subtotalPaise: number;
  discountPaise: number;
  discountLabel: string | null;
  taxablePaise: number;
  gstPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalPaise: number;
  gstRegistered: boolean;
  gstRatePercent: number;
  grant: { title: string; description: string };
  planName: string | null;
  packName: string | null;
  credits: number;
  startsAt: string | null;
  expiresAt: string | null;
}

interface InvoiceCompany {
  name: string;
  lines: string[];
  gstin: string | null;
  email: string;
}

function envValue(name: string): string {
  return (process.env[name] || "").trim();
}

function getCompany(): InvoiceCompany {
  const address = (envValue("INVOICE_COMPANY_ADDRESS") || "India")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    name: envValue("INVOICE_COMPANY_NAME") || "QuizSupport",
    lines: address.length ? address : ["India"],
    gstin: envValue("INVOICE_GSTIN") || null,
    email:
      envValue("INVOICE_SUPPORT_EMAIL") ||
      envValue("SUPPORT_EMAIL") ||
      "support@quizsupport.app",
  };
}

function frontendUrl(): string {
  return (envValue("FRONTEND_URL") || "http://localhost:3000").replace(/\/$/, "");
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return "Access activated on payment";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLineAmounts(
  lines: Array<{ name: string; description: string; grossPaise: number }>,
  subtotalPaise: number
): InvoiceLineItem[] {
  const rawTotal = lines.reduce((sum, line) => sum + Math.max(0, line.grossPaise), 0);
  if (rawTotal <= 0) {
    return [
      {
        name: lines[0]?.name ?? "QuizSupport purchase",
        description: lines[0]?.description ?? "",
        quantity: 1,
        unitPaise: subtotalPaise,
        amountPaise: subtotalPaise,
      },
    ];
  }

  let allocated = 0;
  return lines.map((line, index) => {
    const amount =
      index === lines.length - 1
        ? Math.max(0, subtotalPaise - allocated)
        : Math.round((subtotalPaise * Math.max(0, line.grossPaise)) / rawTotal);
    allocated += amount;
    return {
      name: line.name,
      description: line.description,
      quantity: 1,
      unitPaise: amount,
      amountPaise: amount,
    };
  });
}

function kindLabel(kind: InvoiceKind): string {
  switch (kind) {
    case "plan":
      return "MONTHLY SUBSCRIPTION";
    case "credit_pack":
      return "AI CREDIT PACK";
    default:
      return "BEST VALUE BUNDLE";
  }
}

function statusLabel(status: string): string {
  if (status === "paid") return "Paid";
  if (status === "refunded") return "Refunded";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function packExpiry(order: OrderRow, pack: PurchasableCreditPack | null): Date | null {
  if (order.expiresAt) return order.expiresAt;
  const base = order.paidAt ?? order.startsAt ?? order.createdAt;
  const days = order.validityDays || pack?.validityDays || 0;
  if (!days) return null;
  return new Date(base.getTime() + days * 86_400_000);
}

function grantFor(
  order: OrderRow,
  pack: PurchasableCreditPack | null,
  planName: string | null,
  packName: string | null
): { title: string; description: string } {
  const expires = formatDate(order.expiresAt);
  if (order.orderType === "plan") {
    return {
      title: `${planName ?? "Your plan"} is active`,
      description: `Active until ${expires}. Manage or cancel anytime from Billing.`,
    };
  }
  if (order.orderType === "credit_pack") {
    const credits = order.creditsTotal || pack?.credits || 0;
    return {
      title: `+${credits.toLocaleString("en-IN")} AI credits added`,
      description: `Credits are valid for ${order.validityDays || pack?.validityDays || 0} days and ready to use right away.`,
    };
  }
  return {
    title: `${planName ?? "Plan"} active + ${order.bundlePackCredits.toLocaleString("en-IN")} credits added`,
    description: `${packName ?? "Credit pack"} added. Plan active until ${expires}.`,
  };
}

export async function buildInvoiceData(
  order: OrderRow,
  contact: { name: string; email: string }
): Promise<InvoiceData> {
  const plan =
    order.catalogPlanId === null
      ? null
      : await billingRepository.findPlanSummaryById(order.catalogPlanId);
  const pack =
    order.packId === null
      ? null
      : await billingRepository.findCreditPackById(order.packId);
  const bundle: PurchasablePlanBundle | null =
    order.orderType === "bundle" && order.bundleId !== null
      ? await billingRepository.findPlanBundleById(order.bundleId)
      : null;

  const company = getCompany();
  const gstRegistered = Boolean(company.gstin);
  const factor = 1 + GST_RATE_PERCENT / 100;
  const totalPaise = Math.max(0, order.amountPaise);
  const subtotalPaise =
    order.mrpPaise > 0 ? order.mrpPaise : Math.max(totalPaise, order.mrpPaise);

  const planName = bundle?.plan.name ?? plan?.name ?? null;
  const packName = bundle?.pack.name ?? pack?.name ?? null;
  const planRange = formatRange(order.startsAt, order.expiresAt);
  const packRange = formatRange(order.startsAt, packExpiry(order, pack));

  const rawLines: Array<{ name: string; description: string; grossPaise: number }> = [];
  if (order.orderType === "plan") {
    rawLines.push({
      name: planName ?? "QuizSupport monthly plan",
      description: planRange,
      grossPaise: subtotalPaise,
    });
  } else if (order.orderType === "credit_pack") {
    rawLines.push({
      name: packName ?? "AI credit pack",
      description: `${(order.creditsTotal || pack?.credits || 0).toLocaleString("en-IN")} AI credits · valid ${order.validityDays || pack?.validityDays || 0} days`,
      grossPaise: subtotalPaise,
    });
  } else if (bundle) {
    rawLines.push(
      {
        name: `${bundle.plan.name} · Monthly`,
        description: planRange,
        grossPaise: bundle.plan.amountPaise,
      },
      {
        name: bundle.pack.name,
        description: `${order.bundlePackCredits.toLocaleString("en-IN")} AI credits · valid ${order.bundlePackValidityDays ?? bundle.pack.validityDays} days`,
        grossPaise: bundle.pack.priceInr * 100,
      }
    );
  } else {
    const packGross = pack ? pack.priceInr * 100 : 0;
    rawLines.push(
      {
        name: planName ? `${planName} · Monthly` : "QuizSupport monthly plan",
        description: planRange,
        grossPaise: Math.max(0, subtotalPaise - packGross),
      },
      {
        name: packName ?? "AI credit pack",
        description: `${order.bundlePackCredits.toLocaleString("en-IN")} AI credits`,
        grossPaise: packGross,
      }
    );
  }

  let items = normalizeLineAmounts(rawLines, subtotalPaise);
  let netSubtotal = items.reduce((sum, item) => sum + item.amountPaise, 0);
  let discountPaise = Math.max(0, netSubtotal - totalPaise);

  if (gstRegistered) {
    items = items.map((item) => {
      const net = Math.round(item.amountPaise / factor);
      return { ...item, unitPaise: net, amountPaise: net };
    });
    netSubtotal = items.reduce((sum, item) => sum + item.amountPaise, 0);
    const taxable = Math.round(totalPaise / factor);
    discountPaise = Math.max(0, netSubtotal - taxable);
    if (discountPaise <= 2) discountPaise = 0;
  }

  const taxablePaise = gstRegistered
    ? discountPaise > 0
      ? Math.max(0, netSubtotal - discountPaise)
      : netSubtotal
    : 0;
  const gstPaise = gstRegistered ? Math.max(0, totalPaise - taxablePaise) : 0;
  const cgstPaise = Math.round(gstPaise / 2);
  const sgstPaise = gstPaise - cgstPaise;

  const credits =
    order.orderType === "bundle"
      ? order.bundlePlanCredits + order.bundlePackCredits
      : order.creditsTotal || pack?.credits || 0;

  return {
    invoiceNo: order.orderNo,
    documentTitle: gstRegistered ? "TAX INVOICE" : "INVOICE",
    kind: order.orderType,
    kindLabel: kindLabel(order.orderType),
    status: order.status,
    statusLabel: statusLabel(order.status),
    invoiceDate: (order.paidAt ?? order.createdAt).toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    orderId: order.id,
    orderNo: order.orderNo,
    transactionId: order.gatewayPaymentId,
    paymentMethod: order.paymentMethod,
    currency: order.currency,
    billedTo: contact,
    seller: {
      name: company.name,
      lines: company.lines,
      gstin: company.gstin,
      email: company.email,
    },
    items,
    subtotalPaise: netSubtotal,
    discountPaise,
    discountLabel:
      discountPaise > 0
        ? order.orderType === "bundle"
          ? "Bundle discount"
          : order.couponCode
            ? `Coupon ${order.couponCode}`
            : "Discount"
        : null,
    taxablePaise,
    gstPaise,
    cgstPaise,
    sgstPaise,
    totalPaise,
    gstRegistered,
    gstRatePercent: GST_RATE_PERCENT,
    grant: grantFor(order, pack, planName, packName),
    planName,
    packName,
    credits,
    startsAt: order.startsAt?.toISOString() ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
  };
}

let cachedLogoDataUrl: string | null | undefined;

async function getLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;
  const logo = await getBrandLogo("light");
  cachedLogoDataUrl = logo
    ? `data:image/png;base64,${logo.toString("base64")}`
    : null;
  return cachedLogoDataUrl;
}

function logoMark(logoDataUrl: string | null): string {
  if (logoDataUrl) {
    return `<img class="plogo-img" src="${logoDataUrl}" alt="QuizSupport" />`;
  }
  return `<span class="plogo-text">Quiz<b>Support</b></span>`;
}

const GRANT_ICONS: Record<InvoiceKind, string> = {
  plan: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  credit_pack: '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/>',
  bundle:
    '<path d="M12 3l2.3 5.7L20 11l-5.7 2.3L12 19l-2.3-5.7L4 11l5.7-2.3z"/>',
};

export async function renderInvoiceHtml(data: InvoiceData): Promise<string> {
  const logoDataUrl = await getLogoDataUrl();
  const sellerLines = data.seller.lines.map((line) => `<br>${escapeHtml(line)}`).join("");
  const itemRows = data.items
    .map(
      (item) => `<div class="row">
        <div class="desc"><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description)}</small><span class="mob">Qty ${item.quantity} × ${formatInr(item.unitPaise)}</span></div>
        <span class="q r">${item.quantity}</span>
        <span class="rt r">${formatInr(item.unitPaise)}</span>
        <span class="r"><b>${formatInr(item.amountPaise)}</b></span>
      </div>`
    )
    .join("");

  const discountRow =
    data.discountPaise > 0
      ? `<div class="row disc"><div class="desc"><b>${escapeHtml(data.discountLabel ?? "Discount")}</b><small>Applied to this order</small></div><span class="q r"></span><span class="rt r"></span><span class="r">−${formatInr(data.discountPaise)}</span></div>`
      : "";

  const taxRows = data.gstRegistered
    ? `<div class="t"><span>Taxable value</span><span>${formatInr(data.taxablePaise)}</span></div>
       <div class="t"><span>CGST (${data.gstRatePercent / 2}%)</span><span>${formatInr(data.cgstPaise)}</span></div>
       <div class="t"><span>SGST (${data.gstRatePercent / 2}%)</span><span>${formatInr(data.sgstPaise)}</span></div>`
    : `<div class="t"><span>GST</span><span>Not applicable</span></div>`;

  const discountTotal =
    data.discountPaise > 0
      ? `<div class="t ok"><span>Discount</span><span>−${formatInr(data.discountPaise)}</span></div>`
      : "";

  const metaRows = [
    ["Invoice date", formatDate(data.invoiceDate)],
    ["Order ID", data.orderNo],
    ["Payment", data.paymentMethod ? data.paymentMethod.toUpperCase() : "—"],
    ["Transaction", data.transactionId ?? "—"],
    ["Status", data.statusLabel],
  ]
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(data.documentTitle)} ${escapeHtml(data.invoiceNo)} · ${escapeHtml(data.seller.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#f6f4ff;--ink:#1b1340;--muted:#5d5878;--purple:#6b3fef;--yellow:#ffd23f;--line:#ddd6fe;--soft:#f1edff;--ok:#12805c;--vault:#231f45}
*{box-sizing:border-box;margin:0}
html,body{background:var(--bg);color:var(--ink);font-family:Onest,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{padding:22px}
.paper{position:relative;background:#fff;color:#1b1340;border:2px solid #1b1340;border-radius:28px;padding:40px 44px 34px;box-shadow:10px 10px 0 var(--yellow);overflow:hidden;max-width:980px;margin:0 auto}
.ph{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}
.plogo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:26px;letter-spacing:-.03em}
.plogo-img{display:block;width:auto;height:38px}
.plogo-text b{color:var(--purple)}
.inv{text-align:right}
.inv h2{font-size:34px;letter-spacing:-.05em;line-height:1}
.inv span{display:block;margin-top:8px;font-size:14px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}
.stamp{display:inline-block;margin-top:10px;transform:rotate(-6deg);border:3px solid var(--ok);color:var(--ok);font-weight:800;font-size:18px;letter-spacing:.14em;padding:3px 14px;border-radius:10px;background:rgba(229,248,239,.6)}
.kind{display:inline-flex;align-items:center;gap:8px;margin:22px 0 4px;background:var(--yellow);border:2px solid #1b1340;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:800;letter-spacing:.06em}
.info{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin:22px 0 28px;padding:22px 0;border-top:2px solid #1b1340;border-bottom:2px solid var(--line)}
.info h4{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:9px}
.info p{font-size:14px;line-height:1.55;font-weight:500}
.info b{font-weight:800}
.kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13.5px}
.kv dt{color:var(--muted);font-weight:600}.kv dd{font-weight:700;text-align:right;word-break:break-all;margin:0}
.items{border:2px solid #1b1340;border-radius:18px;overflow:hidden}
.row{display:grid;grid-template-columns:1fr 60px 110px 120px;gap:12px;align-items:center;padding:15px 18px;font-size:14.5px;font-variant-numeric:tabular-nums}
.row+.row{border-top:2px solid var(--line)}
.row.h{background:var(--soft);font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:12px 18px}
.row .r{text-align:right}
.desc b{display:block;font-size:15.5px;letter-spacing:-.01em}
.desc small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px;line-height:1.4}
.desc .mob{display:none}
.row.disc{color:var(--ok);font-weight:700}
.bottom{display:grid;grid-template-columns:1fr 340px;gap:30px;margin-top:26px;align-items:start}
.tot{font-variant-numeric:tabular-nums}
.tot .t{display:flex;justify-content:space-between;padding:7px 2px;font-size:14.5px}
.tot .t span:first-child{color:var(--muted);font-weight:600}
.tot .t.ok span:last-child{color:var(--ok);font-weight:800}
.grand{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:16px 18px;background:var(--purple);color:#fff;border:2px solid #1b1340;border-radius:16px;box-shadow:5px 5px 0 var(--yellow);font-weight:800}
.grand span:first-child{font-size:14px;letter-spacing:.02em}
.grand span:last-child{font-size:28px;letter-spacing:-.04em}
.grant{display:flex;gap:16px;align-items:center;background:var(--vault);color:#fff;border:2px solid #1b1340;border-radius:20px;padding:18px 20px}
.gico{width:54px;height:54px;border-radius:15px;background:var(--yellow);color:#1b1340;display:grid;place-items:center;flex:none;border:2px solid #1b1340}
.grant h3{font-size:19px;letter-spacing:-.03em;line-height:1.15}
.grant p{font-size:13.5px;color:#bdb6e6;margin-top:4px;line-height:1.45}
.foot{margin-top:30px;padding-top:20px;border-top:2px dashed var(--line);display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);line-height:1.6}
.foot b{color:var(--ink)}
.secure{display:flex;align-items:center;gap:8px}.secure svg{color:var(--ok)}
@page{size:A4;margin:10mm}
@media print{body{background:#fff;padding:0}.paper{box-shadow:none;border-radius:0;border:2px solid #1b1340;padding:26px;max-width:none}.items,.bottom,.info,.grant{break-inside:avoid}}
@media(max-width:760px){.paper{padding:26px 18px 24px;box-shadow:7px 7px 0 var(--yellow)}.info{grid-template-columns:1fr;gap:20px}.bottom{grid-template-columns:1fr}.inv{text-align:left}.ph{flex-direction:column}.row{grid-template-columns:1fr auto;gap:8px}.row.h .q,.row.h .rt,.row .q,.row .rt{display:none}.desc .mob{display:block;font-size:12.5px;color:var(--muted);margin-top:3px}}
</style>
</head>
<body>
<article class="paper" aria-label="Invoice">
  <div class="ph">
    <div>
      <div class="plogo">${logoMark(logoDataUrl)}</div>
      <span class="kind"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>${escapeHtml(data.kindLabel)}</span>
    </div>
    <div class="inv"><h2>${escapeHtml(data.documentTitle)}</h2><span>No. ${escapeHtml(data.invoiceNo)}</span><span class="stamp">${escapeHtml(data.statusLabel.toUpperCase())}</span></div>
  </div>
  <div class="info">
    <div><h4>Billed to</h4><p><b>${escapeHtml(data.billedTo.name)}</b><br>${escapeHtml(data.billedTo.email)}</p></div>
    <div><h4>From</h4><p><b>${escapeHtml(data.seller.name)}</b>${sellerLines}${data.seller.gstin ? `<br>${escapeHtml(data.seller.gstin)}` : ""}</p></div>
    <div><h4>Invoice details</h4><dl class="kv">${metaRows}</dl></div>
  </div>
  <div class="items">
    <div class="row h"><span>Description</span><span class="q r">Qty</span><span class="rt r">${data.gstRegistered ? "Rate" : "Price"}</span><span class="r">Amount</span></div>
    ${itemRows}
    ${discountRow}
  </div>
  <div class="bottom">
    <div class="grant"><div class="gico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${GRANT_ICONS[data.kind]}</svg></div><div><h3>${escapeHtml(data.grant.title)}</h3><p>${escapeHtml(data.grant.description)}</p></div></div>
    <div class="tot">
      <div class="t"><span>Subtotal</span><span>${formatInr(data.subtotalPaise)}</span></div>
      ${discountTotal}
      ${taxRows}
      <div class="grand"><span>TOTAL PAID</span><span>${formatInr(data.totalPaise)}</span></div>
    </div>
  </div>
  <div class="foot">
    <div><b>Need help with this invoice?</b><br>Write to ${escapeHtml(data.seller.email)} and quote the invoice number.</div>
    <div class="secure"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>Computer-generated invoice. No signature required.</div>
  </div>
</article>
</body>
</html>`;
}

function renderPurchaseEmail(
  data: InvoiceData,
  variant: "success" | "invoice",
  hasLogo: boolean
): string {
  const amount = formatInr(data.totalPaise);
  const brandMark = hasLogo
    ? `<img src="cid:${OTP_LOGO_CID}" alt="QuizSupport" width="170" style="display:block;width:170px;max-width:100%;height:auto;border:0;outline:none;" />`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-.02em;">Quiz<span style="color:#ffd23f;">Support</span></div>`;
  const billingLink = `${frontendUrl()}/creator/billing/transactions`;
  const heading =
    variant === "success" ? "Payment successful" : "Your invoice is ready";
  const intro =
    variant === "success"
      ? `Thanks for purchasing! We received ${amount} for ${escapeHtml(data.kindLabel.toLowerCase())}. Your purchase is active and ready to use.`
      : `Thank you for your purchase. Your ${escapeHtml(data.documentTitle.toLowerCase())} is attached as a PDF.`;
  const attachNote =
    variant === "invoice"
      ? `<p style="margin:0 0 18px 0;font-size:13px;color:#5d5878;line-height:20px;">The PDF invoice <strong style="color:#1b1340;">Invoice-${escapeHtml(data.invoiceNo)}.pdf</strong> is attached to this email.</p>`
      : `<p style="margin:0 0 18px 0;font-size:13px;color:#5d5878;line-height:20px;">A copy of your invoice has also been emailed to <strong style="color:#1b1340;">${escapeHtml(data.billedTo.email)}</strong>.</p>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f6f4ff;">
<div style="background:#f6f4ff;padding:30px 14px;font-family:Onest,Inter,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:2px solid #1b1340;border-radius:20px;overflow:hidden;">
    <tr><td style="background:#2d2260;padding:24px 26px;color:#fff;">
      ${brandMark}
      <div style="display:inline-block;margin-top:12px;background:#ffd23f;color:#1b1340;font-size:10.5px;font-weight:800;letter-spacing:.08em;padding:5px 12px;border-radius:999px;border:2px solid #1b1340;">${variant === "success" ? "PAYMENT SUCCESSFUL" : "INVOICE"}</div>
      <h1 style="margin:12px 0 6px 0;font-size:28px;line-height:1.1;letter-spacing:-.03em;">${escapeHtml(heading)}</h1>
      <p style="margin:0;font-size:14px;color:#cfc8ff;">Order ${escapeHtml(data.orderNo)}</p>
    </td></tr>
    <tr><td style="padding:24px 26px 8px 26px;">
      <p style="margin:0 0 12px 0;font-size:14px;color:#1b1340;line-height:22px;">Hi ${escapeHtml(data.billedTo.name)},</p>
      <p style="margin:0 0 18px 0;font-size:14px;color:#5d5878;line-height:22px;">${intro}</p>
      ${attachNote}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1edff;border:2px solid #ddd6fe;border-radius:14px;margin:0 0 18px 0;">
        <tr><td style="padding:14px 16px;font-size:13px;color:#1b1340;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#5d5878;font-weight:600;">Invoice</span><strong>${escapeHtml(data.invoiceNo)}</strong></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#5d5878;font-weight:600;">Item</span><strong>${escapeHtml(data.planName ?? data.packName ?? data.kindLabel)}</strong></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#5d5878;font-weight:600;">Amount paid</span><strong style="color:#12805c;">${amount}</strong></div>
        </td></tr>
      </table>
      <p style="margin:0 0 16px 0;font-size:13px;color:#5d5878;line-height:20px;"><strong style="color:#1b1340;">${escapeHtml(data.grant.title)}</strong><br>${escapeHtml(data.grant.description)}</p>
      <a href="${billingLink}" style="display:inline-block;background:#6b3fef;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 20px;border-radius:12px;border:2px solid #1b1340;">View billing history</a>
    </td></tr>
    <tr><td style="padding:18px 26px 24px 26px;border-top:2px dashed #ddd6fe;font-size:12px;color:#5d5878;line-height:18px;">
      Need help? Write to <a href="mailto:${escapeHtml(data.seller.email)}" style="color:#6b3fef;font-weight:700;">${escapeHtml(data.seller.email)}</a> and quote ${escapeHtml(data.invoiceNo)}.
    </td></tr>
  </table>
</div>
</body></html>`;
}

function textSummary(data: InvoiceData, variant: "success" | "invoice"): string {
  const amount = formatInr(data.totalPaise);
  if (variant === "success") {
    return `Payment successful for order ${data.orderNo}. Amount paid: ${amount}. Your invoice ${data.invoiceNo} has been emailed to ${data.billedTo.email}.`;
  }
  return `Your QuizSupport invoice ${data.invoiceNo} for ${amount} is attached as a PDF.`;
}

async function loadInvoiceForOrder(order: OrderRow): Promise<InvoiceData | null> {
  const contact = await billingRepository.findInvoiceContactById(order.userId);
  if (!contact) {
    logger.warn(`Invoice email skipped for order ${order.orderNo}: user has no email`);
    return null;
  }
  return buildInvoiceData(order, contact);
}

/**
 * Sends the payment-success email and the invoice email with the PDF attached.
 * Failures are logged so a paid entitlement is never rolled back because of an
 * email/PDF problem.
 */
export async function sendOrderEmails(order: OrderRow): Promise<void> {
  try {
    const data = await loadInvoiceForOrder(order);
    if (!data) return;

    const logo = await getBrandLogo("dark");
    const inlineAttachments = logo
      ? [
          {
            filename: "quizsupport-logo.png",
            content: logo,
            contentType: "image/png",
            cid: OTP_LOGO_CID,
          },
        ]
      : [];

    const successEmail = sendEmail({
      to: data.billedTo.email,
      subject: `Payment successful · ${data.orderNo}`,
      text: textSummary(data, "success"),
      html: renderPurchaseEmail(data, "success", Boolean(logo)),
      inlineAttachments,
    }).catch((error) => {
      logger.error(`Success email failed for order ${data.orderNo}:`, error);
    });

    const invoiceEmail = (async () => {
      let pdf: Buffer | null = null;
      try {
        pdf = await renderInvoicePdf(await renderInvoiceHtml(data));
      } catch (error) {
        logger.error(`Invoice PDF render failed for order ${data.orderNo}:`, error);
      }
      await sendEmail({
        to: data.billedTo.email,
        subject: `Your QuizSupport invoice · ${data.invoiceNo}`,
        text: textSummary(data, "invoice"),
        html: renderPurchaseEmail(data, "invoice", Boolean(logo)),
        inlineAttachments,
        ...(pdf
          ? {
              attachments: [
                {
                  filename: `Invoice-${data.invoiceNo}.pdf`,
                  content: pdf,
                  contentType: "application/pdf",
                },
              ],
            }
          : {}),
      });
    })().catch((error) => {
      logger.error(`Invoice email failed for order ${data.orderNo}:`, error);
    });

    await Promise.all([successEmail, invoiceEmail]);
  } catch (error) {
    logger.error(`Order emails failed for order ${order.orderNo}:`, error);
  }
}

async function findInvoiceableOrder(
  userId: string,
  orderKey: string
): Promise<OrderRow> {
  const order = await billingRepository.findOrderForUser(userId, orderKey);
  if (!order) {
    throw new BillingError(404, "ORDER_NOT_FOUND", "Order not found.");
  }
  if (order.status !== "paid" && order.status !== "refunded") {
    throw new BillingError(
      409,
      "ORDER_NOT_INVOICEABLE",
      "An invoice is available only for paid orders."
    );
  }
  return order;
}

export async function getInvoiceForUser(
  userId: string,
  orderKey: string
): Promise<InvoiceData> {
  const order = await findInvoiceableOrder(userId, orderKey);
  const data = await loadInvoiceForOrder(order);
  if (!data) {
    throw new BillingError(404, "INVOICE_CONTACT_MISSING", "Billing contact not found.");
  }
  return data;
}

export async function getInvoicePdfForUser(
  userId: string,
  orderKey: string
): Promise<{ data: InvoiceData; pdf: Buffer }> {
  const data = await getInvoiceForUser(userId, orderKey);
  const pdf = await renderInvoicePdf(await renderInvoiceHtml(data));
  return { data, pdf };
}

export async function emailInvoiceForUser(
  userId: string,
  orderKey: string
): Promise<{ sent: boolean; email: string; invoiceNo: string }> {
  const { data, pdf } = await getInvoicePdfForUser(userId, orderKey);
  const logo = await getBrandLogo("dark");
  await sendEmail({
    to: data.billedTo.email,
    subject: `Your QuizSupport invoice · ${data.invoiceNo}`,
    text: textSummary(data, "invoice"),
    html: renderPurchaseEmail(data, "invoice", Boolean(logo)),
    inlineAttachments: logo
      ? [
          {
            filename: "quizsupport-logo.png",
            content: logo,
            contentType: "image/png",
            cid: OTP_LOGO_CID,
          },
        ]
      : [],
    attachments: [
      {
        filename: `Invoice-${data.invoiceNo}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
  return { sent: true, email: data.billedTo.email, invoiceNo: data.invoiceNo };
}
