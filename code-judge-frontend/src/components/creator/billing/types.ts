/**
 * Billing & Payments domain types for Test Creators.
 *
 * Every number in the UI originates from these types so that real backend
 * data can be swapped in without touching component markup.
 */

export type BillingMetricKey = "earnings" | "sales" | "refunds";

export interface DailyEarningPoint {
  /** ISO date key, e.g. "2026-08-20" */
  date: string;
  /** Human label, e.g. "Aug 20" */
  label: string;
  earnings: number;
  sales: number;
  refunds: number;
  /** Earnings from the previous period (same calendar slot) for comparison */
  prevEarnings: number;
}

export interface OverviewStat {
  id: string;
  label: string;
  value: number;
  /** Display value rendered directly (e.g. "1,842" sales) */
  display?: string;
  deltaPct: number;
  hint: string;
  accent: "primary" | "success" | "warning" | "gold" | "info";
}

export interface WalletState {
  available: number;
  pending: number;
  pendingSettlement: number;
  processing: number;
  lifetimeWithdrawn: number;
  nextPayoutDate: string;
  lastActivity: string;
}

export interface FeeBreakdown {
  gross: number;
  /** Website/platform commission — 12.5% of gross */
  platformFee: number;
  /** GST on the gross revenue — 18% of gross */
  gst: number;
  processingFee: number;
  taxes: number;
  refunds: number;
  net: number;
}

export type BreakdownCategoryId = "tests" | "series" | "premium" | "other";

export interface BreakdownCategory {
  id: BreakdownCategoryId;
  label: string;
  amount: number;
}

export type PayoutStatus = "Completed" | "Processing" | "Pending" | "Failed" | "Cancelled";

export interface Payout {
  id: string;
  date: string;
  amount: number;
  destination: string;
  status: PayoutStatus;
  fee: number;
  netAmount: number;
  referenceId: string;
}

export type TransactionType =
  | "sale"
  | "series"
  | "refund"
  | "payout"
  | "adjustment"
  | "platform_fee";

export type TransactionStatus = "Completed" | "Processing" | "Pending" | "Failed" | "Refunded";

export interface Transaction {
  id: string;
  date: string;
  student: string;
  studentId: string;
  product: string;
  type: TransactionType;
  gross: number;
  fee: number;
  net: number;
  status: TransactionStatus;
  paymentMethod: string;
}

export interface ProductRevenue {
  id: string;
  name: string;
  type: "test" | "series" | "assessment";
  price: number;
  sales: number;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  conversion: number;
  trendPct: number;
}

export type RefundStatus = "Requested" | "Approved" | "Processing" | "Completed" | "Rejected";

export interface RefundRecord {
  id: string;
  amount: number;
  student: string;
  product: string;
  transactionId: string;
  reason: string;
  date: string;
  status: RefundStatus;
}

export interface BankAccount {
  id: string;
  bankName: string;
  holderName: string;
  maskedNumber: string;
  ifsc: string;
  upiId: string;
  isPrimary: boolean;
  verified: boolean;
}

export interface PayoutSchedule {
  mode: "manual" | "weekly" | "monthly";
  dayOfWeek: number;
}

export type PaymentNotificationSetting =
  | "payment_received"
  | "refund"
  | "payout_completed"
  | "payout_failed"
  | "weekly_summary"
  | "monthly_statement";

export interface TaxProfile {
  legalName: string;
  businessName: string;
  address: string;
  country: string;
  pan: string;
  gstStatus: "Not registered" | "Registered";
  gstin?: string;
}

export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  tone: "positive" | "neutral" | "attention" | "opportunity";
}

export type BillingNotificationKind =
  | "payment"
  | "payout"
  | "refund"
  | "statement"
  | "verification";

export interface BillingNotification {
  id: string;
  kind: BillingNotificationKind;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export type DocumentType = "invoice" | "statement" | "tax";

export type DocumentFormat = "pdf" | "csv" | "excel";

export interface FinancialDocument {
  id: string;
  name: string;
  period: string;
  generatedAt: string;
  amount: number;
  type: DocumentType;
  formats: DocumentFormat[];
}

export interface SalesMetric {
  label: string;
  value: number;
  display?: string;
  deltaPct: number;
}

export interface MonthlySummary {
  monthLabel: string;
  grossRevenue: number;
  fees: number;
  refunds: number;
  netEarnings: number;
  sales: number;
  averageOrder: number;
  deltaPct: number;
}

export interface AuditEvent {
  id: string;
  label: string;
  detail: string;
  time: string;
  kind: "withdraw" | "account" | "login" | "settings";
}

export type BillingPageState = "loading" | "ready" | "empty" | "error";
