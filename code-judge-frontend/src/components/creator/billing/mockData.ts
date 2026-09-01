/**
 * MOCK DATA — Billing & Payments
 *
 * All figures in this module are intentionally realistic but fictional
 * sample data used purely for frontend development. Replace these with real
 * API responses when the backend is connected. Nothing here is a real
 * financial figure.
 */
import type {
  AuditEvent,
  BankAccount,
  BillingNotification,
  BreakdownCategory,
  DailyEarningPoint,
  FeeBreakdown,
  FinancialDocument,
  FinancialInsight,
  MonthlySummary,
  OverviewStat,
  Payout,
  PaymentNotificationSetting,
  PayoutSchedule,
  ProductRevenue,
  RefundRecord,
  SalesMetric,
  TaxProfile,
  Transaction,
  WalletState,
} from "./types";

export const MOCK_NOTE = "Mock data — for UI development only";

export const OVERVIEW_STATS: OverviewStat[] = [
  { id: "total", label: "Total Earnings", value: 248650, deltaPct: 18.4, hint: "compared to previous period", accent: "primary" },
  { id: "available", label: "Available Balance", value: 38420, deltaPct: 6.2, hint: "available for withdrawal", accent: "success" },
  { id: "pending", label: "Pending Balance", value: 12840, deltaPct: -2.1, hint: "₹8,200 pending settlement", accent: "warning" },
  { id: "month", label: "This Month", value: 64280, deltaPct: 12.8, hint: "Aug 1 — Aug 20", accent: "gold" },
  { id: "sales", label: "Total Sales", value: 0, display: "1,842", deltaPct: 23.1, hint: "across all products", accent: "info" },
  { id: "refunds", label: "Refunds", value: 4280, deltaPct: 2.1, hint: "2.1% of gross sales", accent: "primary" },
];

export const WALLET: WalletState = {
  available: 38420,
  pending: 12840,
  pendingSettlement: 8200,
  processing: 4200,
  lifetimeWithdrawn: 482650,
  nextPayoutDate: "Aug 22, 2026",
  lastActivity: "20 Aug 2026, 8:14 PM",
};

/** Earnings — Last 10 Days (Aug 11 → Aug 20) */
export const EARNINGS_LAST_10_DAYS: DailyEarningPoint[] = [
  { date: "2026-08-11", label: "Aug 11", earnings: 4200, sales: 21, refunds: 120, prevEarnings: 3400 },
  { date: "2026-08-12", label: "Aug 12", earnings: 6800, sales: 34, refunds: 199, prevEarnings: 5100 },
  { date: "2026-08-13", label: "Aug 13", earnings: 3900, sales: 19, refunds: 0, prevEarnings: 3600 },
  { date: "2026-08-14", label: "Aug 14", earnings: 8400, sales: 42, refunds: 299, prevEarnings: 6900 },
  { date: "2026-08-15", label: "Aug 15", earnings: 7100, sales: 36, refunds: 199, prevEarnings: 5800 },
  { date: "2026-08-16", label: "Aug 16", earnings: 9800, sales: 49, refunds: 399, prevEarnings: 8200 },
  { date: "2026-08-17", label: "Aug 17", earnings: 5600, sales: 28, refunds: 199, prevEarnings: 4900 },
  { date: "2026-08-18", label: "Aug 18", earnings: 11200, sales: 56, refunds: 499, prevEarnings: 9100 },
  { date: "2026-08-19", label: "Aug 19", earnings: 8900, sales: 44, refunds: 299, prevEarnings: 7400 },
  { date: "2026-08-20", label: "Aug 20", earnings: 12450, sales: 62, refunds: 599, prevEarnings: 10000 },
];

/** 30-day series (for the Earnings deep-dive chart) */
export const EARNINGS_LAST_30_DAYS: DailyEarningPoint[] = [
  { date: "2026-07-22", label: "Jul 22", earnings: 3100, sales: 15, refunds: 0, prevEarnings: 2400 },
  { date: "2026-07-23", label: "Jul 23", earnings: 4800, sales: 24, refunds: 199, prevEarnings: 3600 },
  { date: "2026-07-24", label: "Jul 24", earnings: 3600, sales: 18, refunds: 0, prevEarnings: 3100 },
  { date: "2026-07-25", label: "Jul 25", earnings: 6200, sales: 31, refunds: 199, prevEarnings: 5400 },
  { date: "2026-07-26", label: "Jul 26", earnings: 5400, sales: 27, refunds: 299, prevEarnings: 4200 },
  { date: "2026-07-27", label: "Jul 27", earnings: 4100, sales: 20, refunds: 0, prevEarnings: 3300 },
  { date: "2026-07-28", label: "Jul 28", earnings: 7200, sales: 36, refunds: 199, prevEarnings: 6100 },
  { date: "2026-07-29", label: "Jul 29", earnings: 5800, sales: 29, refunds: 0, prevEarnings: 4800 },
  { date: "2026-07-30", label: "Jul 30", earnings: 4900, sales: 24, refunds: 199, prevEarnings: 3900 },
  { date: "2026-07-31", label: "Jul 31", earnings: 7600, sales: 38, refunds: 299, prevEarnings: 6400 },
  { date: "2026-08-01", label: "Aug 1", earnings: 5400, sales: 27, refunds: 199, prevEarnings: 4400 },
  { date: "2026-08-02", label: "Aug 2", earnings: 6300, sales: 31, refunds: 0, prevEarnings: 5100 },
  { date: "2026-08-03", label: "Aug 3", earnings: 4600, sales: 23, refunds: 299, prevEarnings: 3700 },
  { date: "2026-08-04", label: "Aug 4", earnings: 8100, sales: 40, refunds: 199, prevEarnings: 6900 },
  { date: "2026-08-05", label: "Aug 5", earnings: 6900, sales: 34, refunds: 399, prevEarnings: 5700 },
  { date: "2026-08-06", label: "Aug 6", earnings: 5200, sales: 26, refunds: 0, prevEarnings: 4300 },
  { date: "2026-08-07", label: "Aug 7", earnings: 7400, sales: 37, refunds: 199, prevEarnings: 6200 },
  { date: "2026-08-08", label: "Aug 8", earnings: 6800, sales: 34, refunds: 299, prevEarnings: 5500 },
  { date: "2026-08-09", label: "Aug 9", earnings: 3900, sales: 19, refunds: 0, prevEarnings: 3200 },
  { date: "2026-08-10", label: "Aug 10", earnings: 5900, sales: 29, refunds: 199, prevEarnings: 4800 },
  ...EARNINGS_LAST_10_DAYS,
];

export const EARNINGS_TOTAL_LAST_10 = EARNINGS_LAST_10_DAYS.reduce((s, d) => s + d.earnings, 0); // 78,350
export const EARNINGS_DELTA_LAST_10 = 24.6;
export const SALES_TOTAL_LAST_10 = EARNINGS_LAST_10_DAYS.reduce((s, d) => s + d.sales, 0);

export const EARNINGS_BREAKDOWN: BreakdownCategory[] = [
  { id: "tests", label: "Tests", amount: 42850 },
  { id: "series", label: "Test Series", amount: 27300 },
  { id: "premium", label: "Premium Assessments", amount: 6800 },
  { id: "other", label: "Other", amount: 1400 },
];

export const FEE_BREAKDOWN: FeeBreakdown = {
  gross: 82450,
  platformFee: 10306,
  gst: 14841,
  processingFee: 1420,
  taxes: 820,
  refunds: 1280,
  net: 53783,
};

export const MONTHLY_SUMMARY: MonthlySummary = {
  monthLabel: "August 2026",
  grossRevenue: 124820,
  fees: 10240,
  refunds: 3420,
  netEarnings: 111160,
  sales: 642,
  averageOrder: 194,
  deltaPct: 18.7,
};

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "acc_hdfc",
    bankName: "HDFC Bank",
    holderName: "Aarav Verma",
    maskedNumber: "•••• •••• 4821",
    ifsc: "HDFC0001234",
    upiId: "aarav.verma@hdfcbank",
    isPrimary: true,
    verified: true,
  },
  {
    id: "acc_icici",
    bankName: "ICICI Bank",
    holderName: "Aarav Verma",
    maskedNumber: "•••• •••• 7703",
    ifsc: "ICIC0007710",
    upiId: "aaravverma@icici",
    isPrimary: false,
    verified: true,
  },
];

export const UPI_ID = "sa••••@upi";

export const PAYOUT_SCHEDULE: PayoutSchedule = { mode: "manual", dayOfWeek: 5 };

export const PAYOUTS: Payout[] = [
  { id: "PO_8821", date: "Aug 18, 2026", amount: 25200, destination: "HDFC Bank •••• 4821", status: "Processing", fee: 125, netAmount: 25075, referenceId: "REF_99124X" },
  { id: "PO_8743", date: "Aug 11, 2026", amount: 18400, destination: "HDFC Bank •••• 4821", status: "Completed", fee: 92, netAmount: 18308, referenceId: "REF_88410A" },
  { id: "PO_8612", date: "Jul 30, 2026", amount: 31250, destination: "HDFC Bank •••• 4821", status: "Completed", fee: 156, netAmount: 31094, referenceId: "REF_77290B" },
  { id: "PO_8504", date: "Jul 22, 2026", amount: 9650, destination: "ICICI Bank •••• 7703", status: "Completed", fee: 48, netAmount: 9602, referenceId: "REF_66177C" },
  { id: "PO_8398", date: "Jul 09, 2026", amount: 22800, destination: "HDFC Bank •••• 4821", status: "Failed", fee: 114, netAmount: 22686, referenceId: "REF_55213D" },
  { id: "PO_8211", date: "Jun 25, 2026", amount: 14750, destination: "HDFC Bank •••• 4821", status: "Completed", fee: 74, netAmount: 14676, referenceId: "REF_44120E" },
  { id: "PO_8020", date: "Jun 10, 2026", amount: 8900, destination: "HDFC Bank •••• 4821", status: "Cancelled", fee: 45, netAmount: 8855, referenceId: "REF_33088F" },
  { id: "PO_7914", date: "May 29, 2026", amount: 20350, destination: "ICICI Bank •••• 7703", status: "Completed", fee: 102, netAmount: 20248, referenceId: "REF_22914G" },
];

export const TRANSACTIONS: Transaction[] = [
  { id: "TXN_8F92K31", date: "20 Aug 2026, 6:42 PM", student: "Rahul Sharma", studentId: "ST_2041", product: "JEE Physics Mock Test #4", type: "sale", gross: 199, fee: 18, net: 181, status: "Completed", paymentMethod: "UPI" },
  { id: "TXN_8F91L04", date: "20 Aug 2026, 4:10 PM", student: "Priya Nair", studentId: "ST_1933", product: "JEE Main 2027 Mock Series", type: "series", gross: 499, fee: 45, net: 454, status: "Completed", paymentMethod: "UPI" },
  { id: "TXN_8F88M20", date: "20 Aug 2026, 12:35 PM", student: "Kabir Singh", studentId: "ST_1871", product: "NEET Biology Full Test", type: "sale", gross: 149, fee: 13, net: 136, status: "Completed", paymentMethod: "Card" },
  { id: "TXN_8F84N02", date: "19 Aug 2026, 9:18 PM", student: "Ananya Iyer", studentId: "ST_1712", product: "Mathematics Advanced Pack", type: "sale", gross: 299, fee: 27, net: 272, status: "Completed", paymentMethod: "NetBanking" },
  { id: "TXN_8F79P55", date: "19 Aug 2026, 7:02 PM", student: "Rohan Gupta", studentId: "ST_1644", product: "JEE Main 2027 Mock Series", type: "series", gross: 499, fee: 45, net: 454, status: "Completed", paymentMethod: "UPI" },
  { id: "TXN_8F66Q18", date: "19 Aug 2026, 3:47 PM", student: "Sneha Patel", studentId: "ST_1509", product: "JEE Physics Mock Test #4", type: "refund", gross: -199, fee: 0, net: -199, status: "Refunded", paymentMethod: "UPI" },
  { id: "TXN_8F54R33", date: "18 Aug 2026, 8:26 PM", student: "Arjun Mehta", studentId: "ST_1422", product: "Chemistry Chapter Test Series", type: "sale", gross: 249, fee: 22, net: 227, status: "Completed", paymentMethod: "UPI" },
  { id: "TXN_8F41S09", date: "18 Aug 2026, 6:58 AM", student: "Ishaan Kulkarni", studentId: "ST_1390", product: "NEET Biology Full Test", type: "sale", gross: 149, fee: 13, net: 136, status: "Processing", paymentMethod: "Card" },
  { id: "TXN_8F29T47", date: "17 Aug 2026, 11:20 PM", student: "Diya Rao", studentId: "ST_1276", product: "JEE Main 2027 Mock Series", type: "series", gross: 499, fee: 45, net: 454, status: "Completed", paymentMethod: "UPI" },
  { id: "TXN_8F17U62", date: "17 Aug 2026, 2:15 PM", student: "Vikram Joshi", studentId: "ST_1148", product: "Payout to HDFC Bank", type: "payout", gross: -25200, fee: 0, net: -25200, status: "Processing", paymentMethod: "Bank Transfer" },
  { id: "TXN_8F03V88", date: "16 Aug 2026, 10:44 PM", student: "Meera Krishnan", studentId: "ST_1031", product: "JEE Physics Mock Test #4", type: "sale", gross: 199, fee: 18, net: 181, status: "Completed", paymentMethod: "UPI" },
  { id: "TXN_7Z90W14", date: "16 Aug 2026, 5:05 PM", student: "Aditya Rawat", studentId: "ST_0990", product: "Platform fee (JEE Physics #4)", type: "platform_fee", gross: -15.92, fee: 0, net: -15.92, status: "Completed", paymentMethod: "Adjustment" },
  { id: "TXN_7Z81X36", date: "15 Aug 2026, 1:30 PM", student: "Navya Menon", studentId: "ST_0877", product: "Chemistry Chapter Test Series", type: "sale", gross: 249, fee: 22, net: 227, status: "Completed", paymentMethod: "UPI" },
  { id: "TXN_7Z74Y55", date: "14 Aug 2026, 9:12 PM", student: "Parth Shah", studentId: "ST_0721", product: "JEE Main 2027 Mock Series", type: "sale", gross: 499, fee: 45, net: 454, status: "Completed", paymentMethod: "NetBanking" },
];

export const PRODUCTS: ProductRevenue[] = [
  { id: "prod_jee_main", name: "JEE Main 2027 Mock Series", type: "series", price: 499, sales: 842, grossRevenue: 420158, refunds: 12800, netRevenue: 368420, conversion: 12.4, trendPct: 21.4 },
  { id: "prod_phy4", name: "JEE Physics Mock Test #4", type: "test", price: 199, sales: 1210, grossRevenue: 240790, refunds: 6420, netRevenue: 214310, conversion: 18.2, trendPct: 14.8 },
  { id: "prod_neet_bio", name: "NEET Biology Full Test", type: "test", price: 149, sales: 874, grossRevenue: 130226, refunds: 4980, netRevenue: 112840, conversion: 15.7, trendPct: 9.2 },
  { id: "prod_chem_series", name: "Chemistry Chapter Test Series", type: "series", price: 249, sales: 520, grossRevenue: 129480, refunds: 3900, netRevenue: 112470, conversion: 10.1, trendPct: -3.6 },
  { id: "prod_math_pack", name: "Mathematics Advanced Pack", type: "series", price: 299, sales: 431, grossRevenue: 128869, refunds: 3200, netRevenue: 111420, conversion: 11.8, trendPct: 17.9 },
  { id: "prod_phy_thermal", name: "Thermodynamics Chapter Test", type: "test", price: 99, sales: 902, grossRevenue: 89298, refunds: 2840, netRevenue: 76410, conversion: 21.3, trendPct: 31.7 },
  { id: "prod_neet_chem", name: "NEET Chemistry Full Test", type: "test", price: 149, sales: 640, grossRevenue: 95360, refunds: 2210, netRevenue: 83240, conversion: 14.6, trendPct: 4.1 },
  { id: "prod_jee_phys_1", name: "JEE Main Mock Test 01", type: "test", price: 99, sales: 1314, grossRevenue: 130086, refunds: 4100, netRevenue: 112980, conversion: 19.9, trendPct: 26.3 },
];

export const REFUNDS: RefundRecord[] = [
  { id: "RF_4421", amount: 199, student: "Sneha Patel", product: "JEE Physics Mock Test #4", transactionId: "TXN_8F66Q18", reason: "Duplicate purchase", date: "19 Aug 2026", status: "Completed" },
  { id: "RF_4408", amount: 499, student: "Farhan Ali", product: "JEE Main 2027 Mock Series", transactionId: "TXN_8F29T47", reason: "Payment failed, charged twice", date: "19 Aug 2026", status: "Approved" },
  { id: "RF_4396", amount: 149, student: "Tanvi Desai", product: "NEET Biology Full Test", transactionId: "TXN_8E88M20", reason: "Purchased wrong exam", date: "18 Aug 2026", status: "Requested" },
  { id: "RF_4371", amount: 249, student: "Rahul Sharma", product: "Chemistry Chapter Test Series", transactionId: "TXN_8E54R33", reason: "Test not as described", date: "17 Aug 2026", status: "Processing" },
  { id: "RF_4344", amount: 99, student: "Kavya Reddy", product: "JEE Main Mock Test 01", transactionId: "TXN_8E31T47", reason: "Refund policy — 24h window", date: "15 Aug 2026", status: "Rejected" },
  { id: "RF_4302", amount: 199, student: "Mohit Bansal", product: "JEE Physics Mock Test #4", transactionId: "TXN_8D90W14", reason: "Duplicate purchase", date: "12 Aug 2026", status: "Completed" },
  { id: "RF_4288", amount: 299, student: "Aisha Khan", product: "Mathematics Advanced Pack", transactionId: "TXN_8D77X36", reason: "Accidental purchase", date: "10 Aug 2026", status: "Completed" },
];

export const TAX_PROFILE: TaxProfile = {
  legalName: "Aarav Verma",
  businessName: "Aarav Physics Academy",
  address: "B-204, Green Park, New Delhi, Delhi 110016",
  country: "India",
  pan: "AVEPK1234F",
  gstStatus: "Registered",
  gstin: "07AVEPK1234F1Z5",
};

export const DOCUMENTS: FinancialDocument[] = [
  { id: "doc_inv_0826", name: "Tax Invoice — August 2026", period: "Aug 1 — Aug 20", generatedAt: "20 Aug 2026", amount: 72334, type: "invoice", formats: ["pdf", "csv"] },
  { id: "doc_stmt_0726", name: "Monthly Statement — July 2026", period: "Jul 1 — Jul 31", generatedAt: "1 Aug 2026", amount: 98420, type: "statement", formats: ["pdf", "excel"] },
  { id: "doc_stmt_0626", name: "Monthly Statement — June 2026", period: "Jun 1 — Jun 30", generatedAt: "1 Jul 2026", amount: 76210, type: "statement", formats: ["pdf", "excel"] },
  { id: "doc_tax_q2", name: "Quarterly Statement — Q2 2026", period: "Apr — Jun 2026", generatedAt: "5 Jul 2026", amount: 214500, type: "tax", formats: ["pdf", "csv"] },
  { id: "doc_stmt_0526", name: "Monthly Statement — May 2026", period: "May 1 — May 31", generatedAt: "1 Jun 2026", amount: 66880, type: "statement", formats: ["pdf", "excel"] },
  { id: "doc_inv_0526", name: "Tax Invoice — May 2026", period: "May 1 — May 31", generatedAt: "1 Jun 2026", amount: 59820, type: "invoice", formats: ["pdf", "csv"] },
  { id: "doc_tax_q1", name: "Quarterly Statement — Q1 2026", period: "Jan — Mar 2026", generatedAt: "4 Apr 2026", amount: 142800, type: "tax", formats: ["pdf", "csv"] },
];

export const SALES_METRICS: SalesMetric[] = [
  { label: "Total Sales", value: 0, display: "1,842", deltaPct: 23.1 },
  { label: "Average Order Value", value: 226, deltaPct: 4.6 },
  { label: "Conversion Rate", value: 0, display: "14.2%", deltaPct: 1.8 },
  { label: "Returning Buyers", value: 0, display: "1,124", deltaPct: 9.4 },
  { label: "New Buyers", value: 0, display: "718", deltaPct: 18.2 },
];

/** Top-selling products for the Sales Analytics panel */
export const TOP_PRODUCTS: Array<{ name: string; revenue: number }> = [
  { name: "JEE Main Mock Test 01", revenue: 18420 },
  { name: "Physics Chapter Test Series", revenue: 12840 },
  { name: "NEET Biology Full Test", revenue: 9320 },
  { name: "Mathematics Advanced Pack", revenue: 7850 },
];

export const INSIGHTS: FinancialInsight[] = [
  { id: "ins_1", title: "Strong week", description: "Your earnings increased 24.6% over the previous 10 days.", tone: "positive" },
  { id: "ins_2", title: "Top performer", description: "JEE Main Mock Test #4 generated the highest revenue this week.", tone: "neutral" },
  { id: "ins_3", title: "Refund rate", description: "Your refund rate is 2.1%, down from 3.4% last month.", tone: "positive" },
  { id: "ins_4", title: "Growth opportunity", description: "Your Biology tests have high traffic but lower conversion.", tone: "opportunity" },
];

export const BILLING_NOTIFICATIONS: BillingNotification[] = [
  { id: "bn_1", kind: "payment", title: "₹499 received from Priya", description: "JEE Main 2027 Mock Series", time: "12 min ago", read: false },
  { id: "bn_2", kind: "payout", title: "₹12,840 payout is processing", description: "Withdrawal to HDFC Bank •••• 4821", time: "2 hr ago", read: false },
  { id: "bn_3", kind: "refund", title: "Refund of ₹199 completed", description: "Sneha Patel — JEE Physics Mock Test #4", time: "5 hr ago", read: false },
  { id: "bn_4", kind: "statement", title: "Your monthly statement is ready", description: "July 2026 — download from Documents", time: "1 day ago", read: true },
  { id: "bn_5", kind: "verification", title: "Bank account verification required", description: "ICICI Bank •••• 7703 needs re-verification", time: "2 days ago", read: true },
];

export const AUDIT_LOG: AuditEvent[] = [
  { id: "aud_1", label: "Withdrawal requested", detail: "₹25,000 → HDFC Bank •••• 4821", time: "18 Aug 2026, 8:14 PM", kind: "withdraw" },
  { id: "aud_2", label: "Payout account changed", detail: "Default set to HDFC Bank •••• 4821", time: "11 Aug 2026, 11:02 AM", kind: "account" },
  { id: "aud_3", label: "New device login", detail: "Chrome on Windows — New Delhi", time: "9 Aug 2026, 6:30 PM", kind: "login" },
  { id: "aud_4", label: "Withdrawal requested", detail: "₹18,400 → HDFC Bank •••• 4821", time: "2 Aug 2026, 5:45 PM", kind: "withdraw" },
  { id: "aud_5", label: "Notification preferences updated", detail: "Payout failed alerts enabled", time: "28 Jul 2026, 9:12 AM", kind: "settings" },
];

export const NOTIFICATION_SETTINGS: Array<{ id: PaymentNotificationSetting; label: string; description: string; enabled: boolean }> = [
  { id: "payment_received", label: "Payment received", description: "When a student purchases your test", enabled: true },
  { id: "refund", label: "Refund", description: "When a refund is requested or completed", enabled: true },
  { id: "payout_completed", label: "Payout completed", description: "When a withdrawal reaches your bank", enabled: true },
  { id: "payout_failed", label: "Payout failed", description: "When a withdrawal cannot be processed", enabled: true },
  { id: "weekly_summary", label: "Weekly earnings summary", description: "Every Monday morning", enabled: false },
  { id: "monthly_statement", label: "Monthly financial statement", description: "First day of each month", enabled: true },
];

/** Bank payout fee (flat, incl. GST) used by the withdraw flow */
export const WITHDRAWAL_FEE = 500;
export const WITHDRAWAL_FEE_EXCL_GST = 424;
export const WITHDRAWAL_GST = 76;
export const WITHDRAWAL_MIN = 1000;
export const WITHDRAWAL_FEE_NOTE =
  "Flat ₹500 processing fee (₹424 + 18% GST ₹76). Bank charges may apply for instant transfer.";
