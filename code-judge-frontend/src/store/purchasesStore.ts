import { create } from "zustand";

export type ProductType =
  | "test_series"
  | "individual_test"
  | "course"
  | "study_material"
  | "premium_resource"
  | "ai_credits";

export type PurchaseStatus = "active" | "expiring_soon" | "expired" | "completed";

export interface PurchasedItem {
  id: string;
  orderId: string;
  type: ProductType;
  name: string;
  creator: string;
  exam: string;
  /** gradient class for the thumbnail */
  gradient: string;
  initials: string;
  /** total resources (tests / challenges / modules) */
  total: number;
  /** human label for `total`, e.g. "Tests" / "Challenges" */
  totalLabel: string;
  attempted: number;
  progressPct: number;
  lastAttemptedTest?: string;
  lastAttemptedScore?: number;
  lastAttemptedPct?: number;
  lastActive?: string;
  lastActiveDate: number;
  purchaseDate: number;
  price: number;
  originalPrice?: number;
  currency: "₹";
  /** ISO date string or null for lifetime access */
  expiresAt: string | null;
  /** performance metrics */
  averageScore?: number;
  bestScore?: number;
  averagePercentile?: number;
  highestRank?: number;
  timeSpentMins?: number;
  isFree: boolean;
  isNew: boolean;
}

export interface Order {
  id: string;
  date: number;
  amount: number;
  status: "PAID" | "FAILED" | "REFUNDED";
  method: "UPI" | "Card" | "Net Banking" | "Wallet" | "Other";
  items: { name: string; amount: number }[];
}

function daysRemaining(exp: string | null, now = Date.now()): number | null {
  if (!exp) return null;
  return Math.max(0, Math.ceil((new Date(exp).getTime() - now) / (1000 * 60 * 60 * 24)));
}

export function deriveStatus(item: PurchasedItem, now = Date.now()): PurchaseStatus {
  if (item.progressPct >= 100) return "completed";
  if (item.expiresAt && new Date(item.expiresAt).getTime() < now) return "expired";
  const d = daysRemaining(item.expiresAt, now);
  if (d !== null && d <= 7) return "expiring_soon";
  return "active";
}

export function itemDaysRemaining(item: PurchasedItem, now = Date.now()): number | null {
  return daysRemaining(item.expiresAt, now);
}

export type FilterKey =
  | "all"
  | "test_series"
  | "active"
  | "expiring"
  | "expired"
  | "completed"
  | "recent";

export type SortKey =
  | "recent_purchase"
  | "recent_access"
  | "progress"
  | "expiry"
  | "price";

const now = Date.now();

const MOCK_PURCHASES: PurchasedItem[] = [
  {
    id: "p_jee_adv_2027",
    orderId: "ORD-2026-8427",
    type: "test_series",
    name: "JEE Advanced 2027 — Complete Test Series",
    creator: "Physics Wallah",
    exam: "JEE Advanced",
    gradient: "from-[#0F172A] via-[#1E3A8A] to-[#0EA5E9]",
    initials: "JEE",
    total: 24,
    totalLabel: "Tests",
    attempted: 8,
    progressPct: 34,
    lastAttemptedTest: "Full Test #8 (Physics)",
    lastAttemptedScore: 72,
    lastAttemptedPct: 48,
    lastActive: "Yesterday",
    lastActiveDate: now - 1000 * 60 * 60 * 24,
    purchaseDate: now - 1000 * 60 * 60 * 24 * 2,
    price: 999,
    originalPrice: 1499,
    currency: "₹",
    expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 315).toISOString().slice(0, 10),
    averageScore: 68,
    bestScore: 85,
    averagePercentile: 48,
    highestRank: 2430,
    timeSpentMins: 2240,
    isFree: false,
    isNew: false,
  },
  {
    id: "p_neet_2026",
    orderId: "ORD-2026-7156",
    type: "test_series",
    name: "NEET 2026 — Ultimate Test Series",
    creator: "Aakash Institute",
    exam: "NEET",
    gradient: "from-[#14532D] via-[#16A34A] to-[#4ADE80]",
    initials: "NEET",
    total: 18,
    totalLabel: "Tests",
    attempted: 18,
    progressPct: 100,
    lastAttemptedTest: "Full Test #18 (Final)",
    lastAttemptedScore: 612,
    lastAttemptedPct: 82,
    lastActive: "2 weeks ago",
    lastActiveDate: now - 1000 * 60 * 60 * 24 * 14,
    purchaseDate: now - 1000 * 60 * 60 * 24 * 150,
    price: 1499,
    currency: "₹",
    expiresAt: "2026-08-12",
    averageScore: 590,
    bestScore: 648,
    averagePercentile: 82,
    highestRank: 1870,
    timeSpentMins: 4900,
    isFree: false,
    isNew: false,
  },
  {
    id: "p_gate_2027",
    orderId: "ORD-2026-8890",
    type: "test_series",
    name: "GATE 2027 — Mock Test Series",
    creator: "Made Easy",
    exam: "GATE",
    gradient: "from-[#312E81] via-[#5B21B6] to-[#A78BFA]",
    initials: "GATE",
    total: 30,
    totalLabel: "Tests",
    attempted: 26,
    progressPct: 87,
    lastAttemptedTest: "Mock 6 (ECE) Full",
    lastAttemptedScore: 78,
    lastAttemptedPct: 85,
    lastActive: "2 hours ago",
    lastActiveDate: now - 1000 * 60 * 60 * 2,
    purchaseDate: now - 1000 * 60 * 60 * 24 * 3,
    price: 799,
    originalPrice: 1199,
    currency: "₹",
    expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 120).toISOString().slice(0, 10),
    averageScore: 74,
    bestScore: 92,
    averagePercentile: 87,
    highestRank: 540,
    timeSpentMins: 3100,
    isFree: false,
    isNew: true,
  },
  {
    id: "p_ssc_cgl_2026",
    orderId: "ORD-2026-7301",
    type: "test_series",
    name: "SSC CGL Tier — Test Series",
    creator: "Gradeup",
    exam: "SSC CGL",
    gradient: "from-[#451A1A] via-[#7F1D1D] to-[#F87171]",
    initials: "SSC",
    total: 40,
    totalLabel: "Tests",
    attempted: 10,
    progressPct: 25,
    lastAttemptedTest: "Tier-I Mock #4",
    lastAttemptedScore: 134,
    lastAttemptedPct: 71,
    lastActive: "3 days ago",
    lastActiveDate: now - 1000 * 60 * 60 * 24 * 3,
    purchaseDate: now - 1000 * 60 * 60 * 24 * 10,
    price: 599,
    currency: "₹",
    expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 150).toISOString().slice(0, 10),
    averageScore: 126,
    bestScore: 156,
    averagePercentile: 71,
    highestRank: 3200,
    timeSpentMins: 1560,
    isFree: false,
    isNew: false,
  },
  {
    id: "p_code_challenges",
    orderId: "ORD-2026-8174",
    type: "course",
    name: "1000 Code Challenges — Mastery Path",
    creator: "ByteClash",
    exam: "Competitive Coding",
    gradient: "from-[#1E293B] via-[#334159] to-[#94A3B8]",
    initials: "COD",
    total: 300,
    totalLabel: "Challenges",
    attempted: 150,
    progressPct: 50,
    lastAttemptedTest: "Sliding Window #27",
    lastAttemptedScore: 100,
    lastAttemptedPct: 100,
    lastActive: "Yesterday",
    lastActiveDate: now - 1000 * 60 * 60 * 24,
    purchaseDate: now - 1000 * 60 * 60 * 24 * 22,
    price: 799,
    originalPrice: 1199,
    currency: "₹",
    expiresAt: null,
    averageScore: 82,
    bestScore: 100,
    averagePercentile: 91,
    highestRank: 42,
    timeSpentMins: 6700,
    isFree: false,
    isNew: false,
  },
  {
    id: "p_digital_logic",
    orderId: "ORD-2026-9052",
    type: "course",
    name: "Digital Logic Design Mastery",
    creator: "Neso Academy",
    exam: "GATE",
    gradient: "from-[#312E81] via-[#5B21B6] to-[#A78BFA]",
    initials: "DLD",
    total: 48,
    totalLabel: "Modules",
    attempted: 0,
    progressPct: 0,
    lastActive: "Just now",
    lastActiveDate: now,
    purchaseDate: now - 1000 * 60 * 60 * 24 * 1,
    price: 499,
    currency: "₹",
    expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
    isFree: false,
    isNew: true,
  },
  {
    id: "p_jee_main_free",
    orderId: "ORD-2026-GRATIS",
    type: "test_series",
    name: "JEE Main Free Foundation Pack",
    creator: "ByteClash",
    exam: "JEE Main",
    gradient: "from-[#1E3A8A] via-[#2563EB] to-[#60A5FA]",
    initials: "JEE",
    total: 5,
    totalLabel: "Tests",
    attempted: 5,
    progressPct: 100,
    lastAttemptedTest: "Free Test #5",
    lastAttemptedScore: 96,
    lastAttemptedPct: 64,
    lastActive: "3 weeks ago",
    lastActiveDate: now - 1000 * 60 * 60 * 24 * 21,
    purchaseDate: now - 1000 * 60 * 60 * 24 * 60,
    price: 0,
    currency: "₹",
    expiresAt: null,
    isFree: true,
    isNew: false,
  },
];

const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-2026-8427",
    date: now - 1000 * 60 * 60 * 24 * 2,
    amount: 999,
    status: "PAID",
    method: "UPI",
    items: [{ name: "JEE Advanced 2027 — Complete Test Series", amount: 999 }],
  },
  {
    id: "ORD-2026-7156",
    date: now - 1000 * 60 * 60 * 24 * 150,
    amount: 1499,
    status: "PAID",
    method: "Card",
    items: [{ name: "NEET 2026 — Ultimate Test Series", amount: 1499 }],
  },
  {
    id: "ORD-2026-8890",
    date: now - 1000 * 60 * 60 * 24 * 3,
    amount: 799,
    status: "PAID",
    method: "UPI",
    items: [{ name: "GATE 2027 — Mock Test Series", amount: 799 }],
  },
  {
    id: "ORD-2026-7301",
    date: now - 1000 * 60 * 60 * 24 * 10,
    amount: 599,
    status: "PAID",
    method: "Net Banking",
    items: [{ name: "SSC CGL Tier — Test Series", amount: 599 }],
  },
  {
    id: "ORD-2026-8174",
    date: now - 1000 * 60 * 60 * 24 * 22,
    amount: 799,
    status: "PAID",
    method: "Wallet",
    items: [{ name: "1000 Code Challenges — Mastery Path", amount: 799 }],
  },
  {
    id: "ORD-2026-9052",
    date: now - 1000 * 60 * 60 * 24,
    amount: 499,
    status: "PAID",
    method: "UPI",
    items: [{ name: "Digital Logic Design Mastery", amount: 499 }],
  },
  {
    id: "ORD-2026-GRATIS",
    date: now - 1000 * 60 * 60 * 24 * 60,
    amount: 0,
    status: "PAID",
    method: "Other",
    items: [{ name: "JEE Main Free Foundation Pack", amount: 0 }],
  },
];

export interface PurchasesState {
  purchases: PurchasedItem[];
  orders: Order[];
  /** id of the item purchased last (surfaced via the success experience) */
  recentPurchaseId: string | null;
  /** whether the purchase-success experience is shown */
  showSuccess: boolean;
  stats: () => { purchased: number; inProgress: number; completed: number; totalSpent: number };
  dismissSuccess: () => void;
  /** open the detail drawer */
  detailId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  /** open the order detail drawer */
  orderDetailId: string | null;
  openOrder: (id: string) => void;
  closeOrder: () => void;
  /** open the printable invoice view */
  invoiceId: string | null;
  openInvoice: (id: string) => void;
  closeInvoice: () => void;
}

export function filterPurchases(
  purchases: PurchasedItem[],
  filter: FilterKey,
  sort: SortKey,
  search: string
): PurchasedItem[] {
  let out = purchases;
  if (search.trim()) {
    const q = search.toLowerCase();
    out = out.filter((i) => `${i.name} ${i.creator} ${i.exam}`.toLowerCase().includes(q));
  }
  out = out.filter((i) => {
      switch (filter) {
        case "test_series":
          return i.type === "test_series" || i.type === "individual_test";
        case "active":
          return deriveStatus(i) === "active" || deriveStatus(i) === "expiring_soon";
        case "expiring":
          return deriveStatus(i) === "expiring_soon";
        case "expired":
          return deriveStatus(i) === "expired";
        case "completed":
          return deriveStatus(i) === "completed";
        case "recent":
          return i.isNew;
        default:
          return true;
      }
    });
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "recent_purchase":
          return b.purchaseDate - a.purchaseDate;
        case "recent_access":
          return b.lastActiveDate - a.lastActiveDate;
        case "progress":
          return b.progressPct - a.progressPct;
        case "expiry":
          if (!b.expiresAt) return 1;
          if (!a.expiresAt) return -1;
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        case "price":
          return b.price - a.price;
        default:
          return b.purchaseDate - a.purchaseDate;
      }
    });
    return out;
}

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
  purchases: MOCK_PURCHASES,
  orders: MOCK_ORDERS,
  recentPurchaseId: "p_gate_2027",
  showSuccess: true,
  detailId: null,
  orderDetailId: null,
  invoiceId: null,
  dismissSuccess: () => set({ showSuccess: false }),
  openDetail: (id) => set({ detailId: id, orderDetailId: null, invoiceId: null }),
  closeDetail: () => set({ detailId: null }),
  openOrder: (id) => set({ orderDetailId: id, detailId: null, invoiceId: null }),
  closeOrder: () => set({ orderDetailId: null }),
  openInvoice: (id) => set({ invoiceId: id, orderDetailId: null, detailId: null }),
  closeInvoice: () => set({ invoiceId: null }),
  stats: () => {
    const items = get().purchases;
    const purchased = items.length;
    const completed = items.filter((i) => i.progressPct >= 100).length;
    const inProgress = items.filter((i) => i.progressPct > 0 && i.progressPct < 100).length;
    const totalSpent = items.filter((i) => !i.isFree).reduce((s, i) => s + i.price, 0);
    return { purchased, inProgress, completed, totalSpent };
  },
}));
