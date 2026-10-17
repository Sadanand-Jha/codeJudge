"use client";

import { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  CREDIT_PURCHASE_PACKS,
  type CreditPurchasePack,
} from "@/config/aiCredits";
import { UpiPayment } from "./UpiPayment";

/* Layout: left column (steps) + sticky right summary. Pack/payment
   components keep their behaviour; only arrangement changed. */

export type PayMethodId = "upi" | "card" | "nb" | "wal" | "pl";

export interface CheckoutPayload {
  pack: CreditPurchasePack;
  method: PayMethodId;
  methodLabel: string;
  app?: string;
  vpa?: string;
  email: string;
  gstin?: string;
  /** Total after coupon, GST-inclusive. */
  total: number;
  coupon?: string;
  discountPct?: number;
}

interface CreditPackCheckoutProps {
  onPay: (payload: CheckoutPayload) => void;
  processing?: boolean;
  /** Pack preselected when arriving from the pricing cards. */
  initialPackId?: string;
  /** Back to the pricing cards. */
  onBack?: () => void;
  /** UPI QR/collect-request flow confirmed payment (demo-verified). */
  onUpiSuccess?: (info: { pack: CreditPurchasePack; orderId: string; total: number }) => void;
}

const PACKS: CreditPurchasePack[] = CREDIT_PURCHASE_PACKS;

const COUPONS: Record<string, number> = { TEACHER10: 0.1, NEWUSER: 0.15 };

const TABS: Array<{ id: PayMethodId; label: string; fastest?: boolean }> = [
  { id: "upi", label: "UPI", fastest: true },
  { id: "card", label: "Cards" },
  { id: "nb", label: "Net Banking" },
  { id: "wal", label: "Wallets" },
  { id: "pl", label: "Pay Later" },
];

interface Tile {
  n: string;
  c: string;
  t?: string;
}

const BANKS: Tile[] = [
  { n: "SBI", c: "#1d4ed8" },
  { n: "HDFC", c: "#1e3a8a" },
  { n: "ICICI", c: "#ea580c" },
  { n: "Axis", c: "#9d174d" },
  { n: "Kotak", c: "#dc2626" },
  { n: "PNB", c: "#b45309" },
  { n: "BoB", c: "#f97316" },
  { n: "Yes Bank", c: "#0369a1" },
];

const MORE_BANKS = [
  "Canara Bank",
  "Union Bank",
  "IDFC First",
  "IndusInd",
  "Bank of India",
  "Federal Bank",
  "Indian Bank",
  "Central Bank",
  "UCO Bank",
  "RBL Bank",
  "South Indian Bank",
  "AU Small Finance",
];

const WALLETS: Tile[] = [
  { n: "Paytm", c: "#00b9f1" },
  { n: "PhonePe", c: "#5f259f" },
  { n: "Amazon Pay", c: "#f59e0b" },
  { n: "Mobikwik", c: "#2563eb" },
  { n: "Freecharge", c: "#ea580c" },
  { n: "Airtel Pay", c: "#dc2626" },
];

const PAY_LATER: Tile[] = [
  { n: "Simpl", c: "#0f766e" },
  { n: "LazyPay", c: "#7c3aed" },
  { n: "ICICI PayLater", c: "#ea580c" },
  { n: "Postpe", c: "#2563eb" },
];

const inr = (n: number) => `₹${n.toFixed(2)}`;

function luhnOk(num: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let v = Number(num[i]);
    if (dbl) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function cardBrand(n: string): string {
  if (/^4/.test(n)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "AMEX";
  if (/^3(0|6|8)/.test(n)) return "Diners";
  if (/^(60|65|81|82|508|353|356)/.test(n)) return "RuPay";
  return "";
}

const FOCUS =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-pink-300 focus-visible:ring-offset-2 dark:focus-visible:ring-pink-500/50 dark:focus-visible:ring-offset-transparent";

const INPUT =
  "min-h-[46px] w-full rounded-[10px] border-[1.5px] border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500";

function Divider({ children }: { children: string }) {
  return (
    <div className="my-3.5 flex items-center gap-2.5 text-xs text-slate-500">
      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" />
      {children}
      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" />
    </div>
  );
}

function Tiles({
  items,
  selected,
  onPick,
  label,
}: {
  items: Tile[];
  selected: number | null;
  onPick: (i: number) => void;
  label: string;
}) {
  return (
    <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={label}>
      {items.map((app, i) => (
        <button
          key={app.n}
          type="button"
          aria-pressed={selected === i}
          onClick={() => onPick(i)}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-[1.5px] border-slate-200 bg-white px-1.5 py-3 text-center text-[13px] font-semibold text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
            selected === i && "border-pink-600 bg-pink-50 dark:border-pink-400 dark:bg-pink-500/10",
            FOCUS
          )}
        >
          <span
            className="grid h-[38px] w-[38px] place-items-center rounded-[10px] text-sm font-extrabold text-[var(--qs-on-brand)]"
            style={{ background: app.c }}
            aria-hidden="true"
          >
            {app.t ?? app.n[0]}
          </span>
          {app.n}
        </button>
      ))}
    </div>
  );
}

export function CreditPackCheckout({ onPay, processing, initialPackId, onBack, onUpiSuccess }: CreditPackCheckoutProps) {
  /* Remounted via key={packId} by the parent, so initial state is enough. */
  const [packId, setPackId] = useState<string>(
    initialPackId ?? PACKS.find((p) => p.popular)?.id ?? PACKS[0].id
  );
  const [tab, setTab] = useState<PayMethodId>("upi");
  const [upiWaiting, setUpiWaiting] = useState(false);

  const [tilePick, setTilePick] = useState<Record<Exclude<PayMethodId, "upi">, number | null>>({
    card: null,
    nb: null,
    wal: null,
    pl: null,
  });
  const [bankSelect, setBankSelect] = useState("");

  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [cardErr, setCardErr] = useState({ num: "", exp: "", cvv: "", name: "" });

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [wantGst, setWantGst] = useState(false);
  const [gstin, setGstin] = useState("");
  const [gstErr, setGstErr] = useState("");
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [formErr, setFormErr] = useState("");

  const pack = PACKS.find((p) => p.id === packId) ?? PACKS[0];
  const baseRate = PACKS[0].price / PACKS[0].credits;
  const disc = appliedCoupon ? (COUPONS[appliedCoupon] ?? 0) : 0;
  const total = +(pack.price * (1 - disc)).toFixed(2);
  const gstPart = total - total / 1.18;
  const brand = cardBrand(cardNum.replace(/\s/g, ""));

  const pickTile = (method: Exclude<PayMethodId, "upi">, i: number) => {
    setTilePick((s) => ({ ...s, [method]: s[method] === i ? null : i }));
    if (method === "nb") setBankSelect("");
    setFormErr("");
  };

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (COUPONS[code]) {
      setAppliedCoupon(code);
      setCouponMsg({ ok: true, text: `Coupon applied: ${Math.round(COUPONS[code] * 100)}% off.` });
    } else {
      setAppliedCoupon(null);
      setCouponMsg({ ok: false, text: "This coupon is not valid. Check the code and try again." });
    }
  };

  const resolveApp = (method: PayMethodId): string | undefined => {
    if (method === "nb") {
      if (tilePick.nb !== null) return BANKS[tilePick.nb].n;
      return bankSelect || undefined;
    }
    if (method === "wal") return tilePick.wal !== null ? WALLETS[tilePick.wal].n : undefined;
    if (method === "pl") return tilePick.pl !== null ? PAY_LATER[tilePick.pl].n : undefined;
    return undefined;
  };

  const buildPayload = (): CheckoutPayload | null => {
    setFormErr("");
    let ok = true;

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailErr("Enter a valid email — your receipt goes here.");
      ok = false;
    } else {
      setEmailErr("");
    }

    if (wantGst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.trim())) {
      setGstErr("GSTIN must be 15 characters.");
      ok = false;
    } else {
      setGstErr("");
    }

    if (tab === "card") {
      const digits = cardNum.replace(/\s/g, "");
      const errs = { num: "", exp: "", cvv: "", name: "" };
      if (digits.length < 13 || !luhnOk(digits)) errs.num = "Card number is not valid.";
      const m = expiry.match(/^(\d\d)\/(\d\d)$/);
      let expOk = false;
      if (m) {
        const mo = Number(m[1]);
        const yr = 2000 + Number(m[2]);
        const now = new Date();
        expOk = mo >= 1 && mo <= 12 && (yr > now.getFullYear() || (yr === now.getFullYear() && mo >= now.getMonth() + 1));
      }
      if (!expOk) errs.exp = "Expiry is not valid.";
      const cvvLen = brand === "AMEX" ? 4 : 3;
      if (cvv.length !== cvvLen) errs.cvv = "Enter the CVV.";
      if (!cardName.trim()) errs.name = "Enter the name on the card.";
      setCardErr(errs);
      if (errs.num || errs.exp || errs.cvv || errs.name) ok = false;
    }

    if (tab === "nb" && !resolveApp("nb")) {
      setFormErr("Choose your bank to continue.");
      ok = false;
    }
    if (tab === "wal" && tilePick.wal === null) {
      setFormErr("Choose your wallet to continue.");
      ok = false;
    }
    if (tab === "pl" && tilePick.pl === null) {
      setFormErr("Choose a Pay Later option to continue.");
      ok = false;
    }

    if (!ok) return null;
    return {
      pack,
      method: tab,
      methodLabel: TABS.find((t) => t.id === tab)?.label ?? tab,
      app: resolveApp(tab),
      vpa: undefined,
      email: email.trim(),
      gstin: wantGst ? gstin.trim().toUpperCase() : undefined,
      total,
      coupon: appliedCoupon ?? undefined,
      discountPct: disc > 0 ? Math.round(disc * 100) : undefined,
    };
  };

  const handlePay = () => {
    // UPI has its own QR / collect-request flow inside <UpiPayment />.
    if (processing || tab === "upi") return;
    const payload = buildPayload();
    if (payload) onPay(payload);
  };

  const payLabel = processing ? "Processing… do not close this page" : `Pay ${inr(total)} securely`;

  return (
    <section
      aria-labelledby="checkout-heading"
      className="w-full"
    >
      <h2 id="checkout-heading" className="sr-only">
        Credit pack checkout
      </h2>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "mb-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-900 transition-colors hover:border-pink-300 hover:text-pink-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-pink-400/40 dark:hover:text-pink-300",
            FOCUS
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to packs
        </button>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* LEFT — steps */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1419]">
          <h3 className="mb-3.5 text-base font-bold text-slate-900 dark:text-white">
            1. Choose your pack
          </h3>
          {/* Horizontal 3-card row on desktop, stacked with Popular first on mobile */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Credit pack">
            {PACKS.map((p) => {
              const sv = Math.round((1 - p.price / p.credits / baseRate) * 100);
              const checked = p.id === packId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setPackId(p.id)}
                  className={cn(
                    "flex min-h-[168px] w-full cursor-pointer flex-col rounded-2xl border-[1.5px] border-slate-200 bg-white p-4 text-left dark:border-white/10 dark:bg-white/[0.02]",
                    checked && "border-pink-600 bg-pink-50/60 dark:border-pink-400 dark:bg-pink-500/10",
                    p.popular && "max-sm:order-first",
                    FOCUS
                  )}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    {p.popular && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                        ★ Most Popular
                      </span>
                    )}
                    {sv > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                        Save {sv}%
                      </span>
                    )}
                  </span>
                  <b className="mt-2 block text-sm font-bold text-slate-900 dark:text-white">{p.name}</b>
                  <span className="mt-1 text-[26px] font-extrabold leading-none tabular-nums text-slate-900 dark:text-white">
                    ₹{p.price}
                  </span>
                  <span className="mt-1.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {p.credits} credits · ₹{(p.price / p.credits).toFixed(2)}/credit
                  </span>
                </button>
              );
            })}
          </div>

          <h3 className="mb-3.5 text-base font-bold text-slate-900 dark:text-white">
            2. Payment method
          </h3>
            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Payment method">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                disabled={upiWaiting}
                onClick={() => {
                  setTab(t.id);
                  setFormErr("");
                }}
                className={cn(
                  "flex flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px] border-[1.5px] border-slate-200 bg-white px-3.5 py-2.5 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.02] dark:text-white",
                  tab === t.id && "border-pink-600 bg-pink-50 text-pink-700 dark:border-pink-400 dark:bg-pink-500/10 dark:text-pink-300",
                  FOCUS
                )}
              >
                {t.label}
                {t.fastest && (
                  <span className="rounded-full bg-pink-600 px-1.5 py-px text-[10.5px] font-bold text-white dark:bg-pink-500">
                    Fastest
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* UPI — QR + UPI ID + status flow live in <UpiPayment /> */}
          <div role="tabpanel" hidden={tab !== "upi"}>
            {tab === "upi" && (
              <UpiPayment
                key={`${pack.id}-${total}`}
                total={total}
                packName={pack.name}
                packCredits={pack.credits}
                onSuccess={(orderId) => onUpiSuccess?.({ pack, orderId, total })}
                onWaitingChange={setUpiWaiting}
              />
            )}
          </div>

          {/* Cards */}
          <div role="tabpanel" hidden={tab !== "card"}>
            <div className="mb-3.5">
              <label htmlFor="cko-cn" className="mb-1.5 block text-[13px] font-semibold text-slate-900 dark:text-white">
                Card number
              </label>
              <div className="relative">
                <input
                  id="cko-cn"
                  value={cardNum}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 19);
                    setCardNum(v.replace(/(.{4})/g, "$1 ").trim());
                  }}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  maxLength={23}
                  className={cn(INPUT, cardErr.num && "border-red-600", FOCUS)}
                />
                {brand && (
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-extrabold text-pink-700 dark:text-pink-300">
                    {brand}
                  </span>
                )}
              </div>
              {cardErr.num && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{cardErr.num}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="mb-3.5">
                <label htmlFor="cko-ex" className="mb-1.5 block text-[13px] font-semibold text-slate-900 dark:text-white">
                  Expiry (MM/YY)
                </label>
                <input
                  id="cko-ex"
                  value={expiry}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                  }}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                  maxLength={5}
                  className={cn(INPUT, cardErr.exp && "border-red-600", FOCUS)}
                />
                {cardErr.exp && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{cardErr.exp}</p>}
              </div>
              <div className="mb-3.5">
                <label htmlFor="cko-cv" className="mb-1.5 block text-[13px] font-semibold text-slate-900 dark:text-white">
                  CVV
                </label>
                <input
                  id="cko-cv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  type="password"
                  autoComplete="cc-csc"
                  placeholder="•••"
                  maxLength={brand === "AMEX" ? 4 : 3}
                  className={cn(INPUT, cardErr.cvv && "border-red-600", FOCUS)}
                />
                {cardErr.cvv && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{cardErr.cvv}</p>}
              </div>
            </div>
            <div className="mb-3.5">
              <label htmlFor="cko-nm" className="mb-1.5 block text-[13px] font-semibold text-slate-900 dark:text-white">
                Name on card
              </label>
              <input
                id="cko-nm"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                autoComplete="cc-name"
                placeholder="As printed on card"
                className={cn(INPUT, cardErr.name && "border-red-600", FOCUS)}
              />
              {cardErr.name && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{cardErr.name}</p>}
            </div>
            <label className="my-2.5 flex items-start gap-2 text-[13px] text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] accent-pink-600"
              />
              <span>Save this card securely for faster checkout (tokenised as per RBI guidelines, only with your permission)</span>
            </label>
            <div className="mt-1.5 rounded-[10px] bg-pink-50 px-3 py-2.5 text-xs text-slate-500 dark:bg-pink-500/10 dark:text-slate-400">
              Visa, Mastercard, RuPay, Amex &amp; Diners — credit and debit. Your bank may ask for an OTP / 3D Secure check.
            </div>
          </div>

          {/* Net banking */}
          <div role="tabpanel" hidden={tab !== "nb"}>
            <Tiles items={BANKS} selected={tilePick.nb} onPick={(i) => pickTile("nb", i)} label="Popular banks" />
            <div className="mb-3.5">
              <label htmlFor="cko-bk" className="mb-1.5 block text-[13px] font-semibold text-slate-900 dark:text-white">
                Or choose another bank
              </label>
              <select
                id="cko-bk"
                value={bankSelect}
                onChange={(e) => {
                  setBankSelect(e.target.value);
                  setTilePick((s) => ({ ...s, nb: null }));
                  setFormErr("");
                }}
                className={cn(INPUT, FOCUS)}
              >
                <option value="">Select bank</option>
                {MORE_BANKS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Wallets */}
          <div role="tabpanel" hidden={tab !== "wal"}>
            <Tiles items={WALLETS} selected={tilePick.wal} onPick={(i) => pickTile("wal", i)} label="Wallets" />
            <div className="mt-1.5 rounded-[10px] bg-pink-50 px-3 py-2.5 text-xs text-slate-500 dark:bg-pink-500/10 dark:text-slate-400">
              If your wallet balance is low, you can pay the remaining amount via UPI.
            </div>
          </div>

          {/* Pay later */}
          <div role="tabpanel" hidden={tab !== "pl"}>
            <Tiles items={PAY_LATER} selected={tilePick.pl} onPick={(i) => pickTile("pl", i)} label="Pay later options" />
            <div className="mt-1.5 rounded-[10px] bg-pink-50 px-3 py-2.5 text-xs text-slate-500 dark:bg-pink-500/10 dark:text-slate-400">
              Pay today, settle after 15 days. Eligibility is checked by the partner app.
            </div>
          </div>

          <Divider>Optional</Divider>
          <label className="my-2.5 flex items-start gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={wantGst}
              onChange={(e) => setWantGst(e.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] accent-pink-600"
            />
            <span>Need a GST invoice (for business / school)</span>
          </label>
          {wantGst && (
            <div className="mb-3.5">
              <label htmlFor="cko-gstin" className="mb-1.5 block text-[13px] font-semibold text-slate-900 dark:text-white">
                GSTIN
              </label>
              <input
                id="cko-gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                autoCapitalize="characters"
                className={cn(INPUT, gstErr && "border-red-600", FOCUS)}
              />
              {gstErr && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{gstErr}</p>}
            </div>
          )}
          <div className="mb-1">
            <label htmlFor="cko-em" className="mb-1.5 block text-[13px] font-semibold text-slate-900 dark:text-white">
              Receipt email
            </label>
            <input
              id="cko-em"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.in"
              autoComplete="email"
              className={cn(INPUT, emailErr && "border-red-600", FOCUS)}
            />
            {emailErr && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{emailErr}</p>}
          </div>

          {formErr && (
            <p className="mt-2 text-[13px] font-semibold text-red-700 dark:text-red-300" role="alert">
              {formErr}
            </p>
          )}
        </div>

        {/* RIGHT — sticky order summary with the Pay button */}
        <aside
          aria-label="Order summary"
          className="rounded-2xl border border-slate-200 bg-white p-5 max-lg:order-last sm:p-6 lg:sticky lg:top-6 dark:border-white/10 dark:bg-[#1e1419]"
        >
          <h3 className="mb-3.5 text-base font-bold text-slate-900 dark:text-white">Order summary</h3>
          <div className="flex justify-between py-1.5 text-slate-500 dark:text-slate-400">
            <span>{pack.name}</span>
            <b className="font-semibold text-slate-900 dark:text-white">{pack.credits} credits</b>
          </div>
          <div className="flex justify-between py-1.5 text-slate-500 dark:text-slate-400">
            <span>Pack price</span>
            <b className="font-semibold tabular-nums text-slate-900 dark:text-white">{inr(pack.price)}</b>
          </div>
          {disc > 0 && appliedCoupon && (
            <div className="flex justify-between py-1.5 text-slate-500 dark:text-slate-400">
              <span>
                Discount <span className="font-bold">({appliedCoupon})</span>
              </span>
              <b className="font-semibold tabular-nums text-green-700 dark:text-green-300">
                −{inr(pack.price - total)}
              </b>
            </div>
          )}
          <div className="flex justify-between py-1.5 text-slate-500 dark:text-slate-400">
            <span>
              GST (18%) <small>included</small>
            </span>
            <b className="font-semibold tabular-nums text-slate-900 dark:text-white">{inr(gstPart)}</b>
          </div>
          <div className="mt-2 flex justify-between border-t border-dashed border-slate-200 pt-3 text-lg font-extrabold text-slate-900 dark:border-white/15 dark:text-white">
            <span>Total</span>
            <b className="text-[22px] tabular-nums">{inr(total)}</b>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              autoCapitalize="characters"
              aria-label="Coupon code"
              className={cn(INPUT, "min-h-[44px] py-2.5 text-sm", FOCUS)}
            />
            <button
              type="button"
              onClick={applyCoupon}
              className={cn(
                "w-auto flex-none cursor-pointer rounded-[10px] bg-pink-600 px-4 text-sm font-bold text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-400",
                FOCUS
              )}
            >
              Apply
            </button>
          </div>
          <div
            className={cn(
              "mt-1 min-h-[18px] text-xs",
              !couponMsg && "text-slate-500 dark:text-slate-400",
              couponMsg?.ok && "text-green-700 dark:text-green-300",
              couponMsg && !couponMsg.ok && "text-red-700 dark:text-red-300"
            )}
            aria-live="polite"
          >
            {couponMsg ? couponMsg.text : "Try: TEACHER10"}
          </div>

          {/* UPI owns its own Pay actions inside <UpiPayment /> */}
          {tab !== "upi" && (
            <button
              type="button"
              onClick={handlePay}
              disabled={processing}
              className={cn(
                "mt-3 hidden h-13 w-full cursor-pointer items-center justify-center rounded-xl border-0 bg-pink-600 px-4 py-4 text-base font-extrabold text-white hover:bg-pink-700 active:scale-[0.99] disabled:cursor-progress disabled:opacity-65 lg:inline-flex dark:bg-pink-500 dark:hover:bg-pink-400",
                FOCUS
              )}
            >
              {payLabel}
            </button>
          )}
          <div className="mt-3.5 hidden flex-wrap justify-center gap-x-3.5 gap-y-1.5 text-xs text-slate-500 lg:flex dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3" aria-hidden="true" /> Secure payment
            </span>
            <span>Failed payment = auto refund in 5–7 days</span>
            <span>No subscription</span>
          </div>
          <div className="mt-3 hidden rounded-[10px] bg-pink-50 px-3 py-2.5 text-xs text-slate-500 lg:block dark:bg-pink-500/10 dark:text-slate-400">
            Credits are added instantly · Valid {pack.validityMonths} month{pack.validityMonths !== 1 ? "s" : ""} from purchase
          </div>

          {/* Mobile trust copy (the sticky bar below carries the Pay action) */}
          <div className="mt-3 flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 text-xs text-slate-500 lg:hidden dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3" aria-hidden="true" /> Secure payment
            </span>
            <span>Failed payment = auto refund in 5–7 days</span>
            <span>No subscription</span>
          </div>
          <div className="mt-3 rounded-[10px] bg-pink-50 px-3 py-2.5 text-xs text-slate-500 lg:hidden dark:bg-pink-500/10 dark:text-slate-400">
            Credits are added instantly · Valid {pack.validityMonths} month{pack.validityMonths !== 1 ? "s" : ""} from purchase
          </div>
        </aside>
      </div>

      {/* Spacer so the sticky mobile bar never covers content */}
      {tab !== "upi" && <div className="h-[92px] lg:hidden" aria-hidden="true" />}

      {/* Sticky mobile Pay bar (UPI has its own in-tab actions) */}
      {tab !== "upi" && (
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur lg:hidden dark:border-white/10 dark:bg-[#1e1419]/95"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight tabular-nums text-slate-900 dark:text-white">
              {inr(total)}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {pack.credits} credits · {pack.name}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePay}
            disabled={processing}
            className={cn(
              "flex-none cursor-pointer rounded-xl border-0 bg-pink-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-pink-700 active:scale-[0.98] disabled:cursor-progress disabled:opacity-65 dark:bg-pink-500 dark:hover:bg-pink-400",
              FOCUS
            )}
          >
            {processing ? "Processing…" : "Pay now"}
          </button>
        </div>
      </div>
      )}
    </section>
  );
}

export default CreditPackCheckout;
