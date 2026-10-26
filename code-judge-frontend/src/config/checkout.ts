export const CHECKOUT_GST_RATE = 0.18;

export type CouponKind = "percent" | "flat";

export interface CheckoutCoupon {
  code: string;
  kind: CouponKind;
  value: number;
  label: string;
}

export const CHECKOUT_COUPONS: CheckoutCoupon[] = [
  { code: "TEACHER10", kind: "percent", value: 10, label: "10% off" },
  { code: "NEWUSER", kind: "percent", value: 15, label: "15% off" },
];

export function findCoupon(code: string): CheckoutCoupon | null {
  const normalized = code.trim().toUpperCase();
  return CHECKOUT_COUPONS.find((coupon) => coupon.code === normalized) ?? null;
}

export interface CheckoutTotals {
  price: number;
  discount: number;
  taxable: number;
  gst: number;
  total: number;
}

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateCheckoutTotals(
  price: number,
  coupon: CheckoutCoupon | null
): CheckoutTotals {
  const gross = roundMoney(price);
  const rawDiscount = coupon
    ? coupon.kind === "percent"
      ? (gross * coupon.value) / 100
      : coupon.value
    : 0;
  const discount = Math.min(gross, roundMoney(rawDiscount));
  const total = roundMoney(gross - discount);
  const taxable = roundMoney(total / (1 + CHECKOUT_GST_RATE));
  const gst = roundMoney(total - taxable);

  return { price: gross, discount, taxable, gst, total };
}

export function formatInr(value: number): string {
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  })}`;
}

export const MOCK_CARD_SUCCESS = "4242424242424242";
export const MOCK_CARD_DECLINED = "4000000000000002";

export interface PaymentBrand {
  id: string;
  name: string;
  mark: string;
  background: string;
  color: string;
}

export const UPI_APPS: PaymentBrand[] = [
  {
    id: "gpay",
    name: "Google Pay",
    mark: "G",
    background: "#ffffff",
    color: "#4285f4",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    mark: "Pe",
    background: "#5f259f",
    color: "#ffffff",
  },
  {
    id: "paytm",
    name: "Paytm",
    mark: "P",
    background: "#00baf2",
    color: "#ffffff",
  },
];

export const WALLETS: PaymentBrand[] = [
  {
    id: "paytm",
    name: "Paytm",
    mark: "P",
    background: "#00baf2",
    color: "#ffffff",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    mark: "Pe",
    background: "#5f259f",
    color: "#ffffff",
  },
  {
    id: "amazonpay",
    name: "Amazon Pay",
    mark: "a",
    background: "#ff9900",
    color: "#1a1240",
  },
  {
    id: "mobikwik",
    name: "MobiKwik",
    mark: "M",
    background: "#2563eb",
    color: "#ffffff",
  },
];

export const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "IDFC FIRST Bank",
];
