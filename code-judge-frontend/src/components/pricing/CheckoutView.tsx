"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CreditCard,
  Info,
  Landmark,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  BANKS,
  CHECKOUT_GST_RATE,
  MOCK_CARD_DECLINED,
  MOCK_CARD_SUCCESS,
  UPI_APPS,
  WALLETS,
  calculateCheckoutTotals,
  findCoupon,
  formatInr,
  type CheckoutCoupon,
  type PaymentBrand,
} from "@/config/checkout";
import type { PricingCreditPack } from "@/types/pricing";

type PaymentMethodId = "upi" | "card" | "netbanking" | "wallet";
type CheckoutPhase = "form" | "processing" | "success" | "failed";
type ProcessingStep = 0 | 1 | 2;

interface FieldErrors {
  email?: string;
  upi?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardName?: string;
  bank?: string;
  wallet?: string;
}

interface Receipt {
  transactionId: string;
  email: string;
  method: string;
  pack: PricingCreditPack;
  total: number;
}

interface MockResult {
  ok: boolean;
  reason: string;
}

interface CheckoutViewProps {
  packs: PricingCreditPack[];
  initialPackId: string;
}

const PAYMENT_METHODS: Array<{
  id: PaymentMethodId;
  label: string;
  hint: string;
  icon: LucideIcon;
}> = [
  {
    id: "upi",
    label: "UPI",
    hint: "Google Pay, PhonePe, Paytm",
    icon: Smartphone,
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    hint: "Visa, Mastercard, RuPay, Amex",
    icon: CreditCard,
  },
  {
    id: "netbanking",
    label: "Net Banking",
    hint: "All major Indian banks",
    icon: Landmark,
  },
  {
    id: "wallet",
    label: "Wallets",
    hint: "Paytm, PhonePe, Amazon Pay",
    icon: Wallet,
  },
];

const PROCESSING_STEPS = [
  "Creating a secure order",
  "Processing payment",
  "Confirming payment",
];

const digitsOnly = (value: string) => value.replace(/\D/g, "");

function formatCardNumber(value: string): string {
  return digitsOnly(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
}

function luhnValid(value: string): boolean {
  let sum = 0;
  let double = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum > 0 && sum % 10 === 0;
}

function cardBrand(value: string): { label: string; cvvLength: number } {
  const digits = digitsOnly(value);
  if (/^3[47]/.test(digits)) return { label: "Amex", cvvLength: 4 };
  if (/^4/.test(digits)) return { label: "Visa", cvvLength: 3 };
  if (/^(5[1-5]|2[2-7])/.test(digits)) {
    return { label: "Mastercard", cvvLength: 3 };
  }
  if (/^(60|65|81|82|508|353|356)/.test(digits)) {
    return { label: "RuPay", cvvLength: 3 };
  }
  if (/^3(0|6|8)/.test(digits)) return { label: "Diners", cvvLength: 3 };
  return { label: "Card", cvvLength: 3 };
}

function isValidEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function validatePayment(details: {
  method: PaymentMethodId;
  email: string;
  upiApp: string | null;
  wallet: string | null;
  bank: string;
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!details.email.trim()) {
    errors.email = "Enter an email address for your receipt.";
  } else if (!isValidEmail(details.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (details.method === "upi") {
    if (!details.upiApp) errors.upi = "Choose a UPI app to continue.";
  }

  if (details.method === "netbanking") {
    if (!details.bank) errors.bank = "Choose your bank to continue.";
  }

  if (details.method === "wallet") {
    if (!details.wallet) errors.wallet = "Choose a wallet to continue.";
  }

  if (details.method === "card") {
    const digits = digitsOnly(details.cardNumber);
    if (digits.length < 13 || !luhnValid(digits)) {
      errors.cardNumber = "Enter a valid card number.";
    }

    const expiry = /^(\d{2})\/(\d{2})$/.exec(details.cardExpiry);
    if (!expiry) {
      errors.cardExpiry = "Use MM/YY.";
    } else {
      const month = Number(expiry[1]);
      const year = 2000 + Number(expiry[2]);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      if (
        month < 1 ||
        month > 12 ||
        year < currentYear ||
        (year === currentYear && month < currentMonth)
      ) {
        errors.cardExpiry = "Enter a valid future expiry.";
      }
    }

    const brand = cardBrand(digits);
    if (!new RegExp(`^\\d{${brand.cvvLength}}$`).test(details.cardCvv)) {
      errors.cardCvv =
        brand.cvvLength === 4
          ? "Enter the 4-digit CVV."
          : "Enter the 3-digit CVV.";
    }

    if (!details.cardName.trim()) {
      errors.cardName = "Enter the name on the card.";
    }
  }

  return errors;
}

function BrandPicker({
  items,
  name,
  label,
  selected,
  onSelect,
  error,
  errorId,
  hint,
}: {
  items: PaymentBrand[];
  name: string;
  label: string;
  selected: string | null;
  onSelect: (id: string) => void;
  error?: string;
  errorId?: string;
  hint?: string;
}) {
  return (
    <fieldset
      className="qco-brand-fieldset"
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="qco-field-label">{label}</legend>
      <div className="qco-brands">
        {items.map((item) => (
          <label
            key={item.id}
            className={cn(
              "qco-brand-option",
              selected === item.id && "is-selected"
            )}
          >
            <input
              type="radio"
              name={name}
              value={item.id}
              checked={selected === item.id}
              onChange={() => onSelect(item.id)}
              className="sr-only"
            />
            <span
              className="qco-brand-mark"
              style={{ backgroundColor: item.background, color: item.color }}
              aria-hidden="true"
            >
              {item.mark}
            </span>
            <span>{item.name}</span>
            <Check
              className="qco-brand-check"
              size={12}
              strokeWidth={3.5}
              aria-hidden="true"
            />
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="qco-field-error" role="alert">
          {error}
        </p>
      )}
      {hint && <p className="qco-field-help">{hint}</p>}
    </fieldset>
  );
}

export function CheckoutView({ packs, initialPackId }: CheckoutViewProps) {
  const fallbackPackId =
    packs.find((item) => item.id === initialPackId)?.id ??
    packs.find((item) => item.popular)?.id ??
    packs[0]?.id ??
    "";

  const [packId, setPackId] = useState(fallbackPackId);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CheckoutCoupon | null>(
    null
  );
  const [couponMessage, setCouponMessage] = useState<{
    tone: "hint" | "ok" | "error";
    text: string;
  }>({
    tone: "hint",
    text: "Try TEACHER10 for 10% off.",
  });

  const [method, setMethod] = useState<PaymentMethodId>("upi");
  const [upiApp, setUpiApp] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [bank, setBank] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [phase, setPhase] = useState<CheckoutPhase>("form");
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(0);
  const [failureReason, setFailureReason] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const resultRef = useRef<MockResult>({ ok: true, reason: "" });
  const statusRef = useRef<HTMLDivElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  // Monotonic counter for demo transaction ids — keeps `Date.now()` out of
  // render so the component stays pure (react-hooks/purity).
  const receiptCounter = useRef(0);

  const pack = packs.find((item) => item.id === packId) ?? packs[0];
  const totals = calculateCheckoutTotals(pack?.price ?? 0, appliedCoupon);
  const brand = cardBrand(cardNumber);
  const locked = phase !== "form";

  useEffect(() => {
    if (phase !== "processing") return;

    const firstStep = window.setTimeout(() => setProcessingStep(1), 650);
    const secondStep = window.setTimeout(() => setProcessingStep(2), 1400);
    const finish = window.setTimeout(() => {
      if (resultRef.current.ok) {
        setPhase("success");
      } else {
        setFailureReason(resultRef.current.reason);
        setPhase("failed");
      }
    }, 2200);

    return () => {
      window.clearTimeout(firstStep);
      window.clearTimeout(secondStep);
      window.clearTimeout(finish);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "form") return;
    const frame = requestAnimationFrame(() => statusRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const clearFieldError = (field: keyof FieldErrors) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  };

  const clearAllErrors = () => {
    setErrors({});
    setFormError(null);
  };

  const handleApplyCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked) return;

    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      setCouponMessage({ tone: "error", text: "Enter a coupon code." });
      return;
    }

    const coupon = findCoupon(code);
    if (!coupon) {
      setAppliedCoupon(null);
      setCouponMessage({
        tone: "error",
        text: "That coupon is not valid. Check the code and try again.",
      });
      return;
    }

    setCouponInput(coupon.code);
    setAppliedCoupon(coupon);
    setCouponMessage({
      tone: "ok",
      text: `${coupon.code} applied — ${coupon.label}.`,
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage({ tone: "hint", text: "Try TEACHER10 for 10% off." });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase !== "form" || !pack) return;

    const nextErrors = validatePayment({
      method,
      email,
      upiApp,
      wallet,
      bank,
      cardNumber,
      cardName,
      cardExpiry,
      cardCvv,
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please check the highlighted fields and try again.");
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    setFormError(null);

    const brandName = cardBrand(cardNumber);
    const selectedUpi = UPI_APPS.find((item) => item.id === upiApp);
    const selectedWallet = WALLETS.find((item) => item.id === wallet);
    const methodLabel =
      method === "upi"
        ? `UPI${selectedUpi ? ` · ${selectedUpi.name}` : ""}`
        : method === "card"
          ? `Card · ${brandName.label}`
          : method === "netbanking"
            ? `Net Banking · ${bank}`
            : `Wallet${selectedWallet ? ` · ${selectedWallet.name}` : ""}`;
    const declined =
      method === "card" && digitsOnly(cardNumber) === MOCK_CARD_DECLINED;

    resultRef.current = declined
      ? {
          ok: false,
          reason:
            "Your bank declined this test card. No amount has been charged.",
        }
      : { ok: true, reason: "" };

    setReceipt({
      transactionId: `QS-${(++receiptCounter.current).toString(36).toUpperCase()}`,
      email: email.trim(),
      method: methodLabel,
      pack,
      total: totals.total,
    });
    setProcessingStep(0);
    setPhase("processing");
  };

  const handleRetry = () => {
    setPhase("form");
    setFailureReason("");
    setCardCvv("");
    clearAllErrors();
  };

  const openPolicy = (id: string) => {
    const element = document.getElementById(id);
    if (element instanceof HTMLDetailsElement) element.open = true;
  };

  const renderMethodPanel = () => {
    if (method === "upi") {
      return (
        <BrandPicker
          items={UPI_APPS}
          name="upi-app"
          label="Choose a UPI app"
          selected={upiApp}
          onSelect={(id) => {
            setUpiApp(id);
            clearFieldError("upi");
          }}
          error={errors.upi}
          errorId="qco-upi-error"
          hint="You'll approve the payment request in your UPI app. No UPI PIN is entered on this page."
        />
      );
    }

    if (method === "card") {
      return (
        <div className="qco-card-form">
          <div className="qco-field">
            <label htmlFor="qco-card-number" className="qco-field-label">
              Card number
            </label>
            <div className="qco-input-wrap">
              <input
                id="qco-card-number"
                value={cardNumber}
                onChange={(event) => {
                  setCardNumber(formatCardNumber(event.target.value));
                  clearFieldError("cardNumber");
                }}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder="1234 5678 9012 3456"
                maxLength={23}
                className={cn(
                  "qco-input",
                  brand.label !== "Card" && "has-brand",
                  errors.cardNumber && "is-invalid"
                )}
                aria-invalid={Boolean(errors.cardNumber)}
                aria-describedby={
                  errors.cardNumber
                    ? "qco-card-number-error"
                    : "qco-card-number-help"
                }
              />
              {brand.label !== "Card" && (
                <span className="qco-card-brand" aria-hidden="true">
                  {brand.label}
                </span>
              )}
            </div>
            {errors.cardNumber ? (
              <p id="qco-card-number-error" className="qco-field-error" role="alert">
                {errors.cardNumber}
              </p>
            ) : (
              <p id="qco-card-number-help" className="qco-field-help">
                Visa, Mastercard, RuPay, Amex and Diners.
              </p>
            )}
          </div>

          <div className="qco-fields">
            <div className="qco-field">
              <label htmlFor="qco-card-expiry" className="qco-field-label">
                Expiry
              </label>
              <input
                id="qco-card-expiry"
                value={cardExpiry}
                onChange={(event) => {
                  setCardExpiry(formatExpiry(event.target.value));
                  clearFieldError("cardExpiry");
                }}
                inputMode="numeric"
                autoComplete="off"
                placeholder="MM/YY"
                maxLength={5}
                className={cn("qco-input", errors.cardExpiry && "is-invalid")}
                aria-invalid={Boolean(errors.cardExpiry)}
                aria-describedby={
                  errors.cardExpiry ? "qco-card-expiry-error" : undefined
                }
              />
              {errors.cardExpiry && (
                <p
                  id="qco-card-expiry-error"
                  className="qco-field-error"
                  role="alert"
                >
                  {errors.cardExpiry}
                </p>
              )}
            </div>

            <div className="qco-field">
              <label htmlFor="qco-card-cvv" className="qco-field-label">
                CVV
              </label>
              <input
                id="qco-card-cvv"
                value={cardCvv}
                onChange={(event) => {
                  setCardCvv(
                    digitsOnly(event.target.value).slice(0, brand.cvvLength)
                  );
                  clearFieldError("cardCvv");
                }}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder={brand.cvvLength === 4 ? "4 digits" : "3 digits"}
                maxLength={brand.cvvLength}
                className={cn("qco-input", errors.cardCvv && "is-invalid")}
                aria-invalid={Boolean(errors.cardCvv)}
                aria-describedby={
                  errors.cardCvv ? "qco-card-cvv-error" : undefined
                }
              />
              {errors.cardCvv && (
                <p id="qco-card-cvv-error" className="qco-field-error" role="alert">
                  {errors.cardCvv}
                </p>
              )}
            </div>
          </div>

          <div className="qco-field">
            <label htmlFor="qco-card-name" className="qco-field-label">
              Name on card
            </label>
            <input
              id="qco-card-name"
              value={cardName}
              onChange={(event) => {
                setCardName(event.target.value);
                clearFieldError("cardName");
              }}
              autoComplete="off"
              placeholder="As printed on the card"
              className={cn("qco-input", errors.cardName && "is-invalid")}
              aria-invalid={Boolean(errors.cardName)}
              aria-describedby={
                errors.cardName ? "qco-card-name-error" : undefined
              }
            />
            {errors.cardName && (
              <p id="qco-card-name-error" className="qco-field-error" role="alert">
                {errors.cardName}
              </p>
            )}
          </div>

          <p className="qco-demo-note">
            <Info size={13} aria-hidden="true" />
            <span>
              Use {MOCK_CARD_SUCCESS} to preview success or{" "}
              {MOCK_CARD_DECLINED} for a failed payment. Never enter a real
              card number.
            </span>
          </p>
        </div>
      );
    }

    if (method === "netbanking") {
      return (
        <div className="qco-field">
          <label htmlFor="qco-bank" className="qco-field-label">
            Select your bank
          </label>
          <div className="qco-select-wrap">
            <select
              id="qco-bank"
              value={bank}
              onChange={(event) => {
                setBank(event.target.value);
                clearFieldError("bank");
              }}
              className={cn("qco-input qco-select", errors.bank && "is-invalid")}
              aria-invalid={Boolean(errors.bank)}
              aria-describedby={errors.bank ? "qco-bank-error" : "qco-bank-help"}
            >
              <option value="">Choose a bank</option>
              {BANKS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>
          {errors.bank ? (
            <p id="qco-bank-error" className="qco-field-error" role="alert">
              {errors.bank}
            </p>
          ) : (
            <p id="qco-bank-help" className="qco-field-help">
              You&apos;ll be redirected to your bank to authorise the payment.
            </p>
          )}
        </div>
      );
    }

    return (
      <BrandPicker
        items={WALLETS}
        name="wallet"
        label="Choose a wallet"
        selected={wallet}
        onSelect={(id) => {
          setWallet(id);
          clearFieldError("wallet");
        }}
        error={errors.wallet}
        errorId="qco-wallet-error"
        hint="If your wallet balance is low, you can pay the remaining amount via UPI."
      />
    );
  };

  if (!pack) {
    return (
      <div className="qs-ui qs-lp qco-page min-h-screen">
        <div className="qco-main">
          <div className="qco-empty">
            <h1>Checkout unavailable</h1>
            <p>Credit packs could not be loaded right now.</p>
            <Link href="/pricing/credits" className="btn pri">
              Back to AI credits
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qs-ui qs-lp qco-page min-h-screen">
      <main className="qco-main">
        {phase === "success" && receipt ? (
          <div className="qco-success">
            <Link href="/pricing/credits" className="qco-back">
              <ArrowLeft size={15} aria-hidden="true" />
              AI credits
            </Link>
            <div
              className="qco-success-card"
              ref={statusRef}
              tabIndex={-1}
              role="status"
              aria-live="polite"
            >
              <div className="qco-success-head">
                <span className="qco-state-icon is-good" aria-hidden="true">
                  <BadgeCheck size={28} />
                </span>
                <p className="eb">Payment successful</p>
                <h1>Credits added</h1>
                <p>
                  {receipt.pack.credits.toLocaleString("en-IN")} AI credits are
                  now ready to use in your account.
                </p>
              </div>

              <dl className="qco-receipt">
                <div className="qco-receipt-row">
                  <dt>Credit pack</dt>
                  <dd>{receipt.pack.name}</dd>
                </div>
                <div className="qco-receipt-row">
                  <dt>Credits added</dt>
                  <dd>{receipt.pack.credits.toLocaleString("en-IN")}</dd>
                </div>
                <div className="qco-receipt-row">
                  <dt>Amount paid</dt>
                  <dd>{formatInr(receipt.total)}</dd>
                </div>
                <div className="qco-receipt-row">
                  <dt>Payment method</dt>
                  <dd>{receipt.method}</dd>
                </div>
                <div className="qco-receipt-row">
                  <dt>Receipt email</dt>
                  <dd>{receipt.email}</dd>
                </div>
                <div className="qco-receipt-row">
                  <dt>Transaction ID</dt>
                  <dd>{receipt.transactionId}</dd>
                </div>
              </dl>

              <div className="qco-success-actions">
                <Link href="/pricing/credits" className="btn">
                  Buy more credits
                </Link>
                <Link href="/pricing" className="btn pri">
                  Back to plans
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>

              <p className="qco-demo-note">
                <Info size={13} aria-hidden="true" />
                <span>
                  Demo checkout — no payment was processed and no credits were
                  added to a real account.
                </span>
              </p>
            </div>
          </div>
        ) : (
          <>
            <Link href="/pricing/credits" className="qco-back">
              <ArrowLeft size={15} aria-hidden="true" />
              AI credits
            </Link>

            <header className="qco-head">
              <div>
                <p className="eb">Secure checkout</p>
                <h1>Complete your purchase</h1>
                <p className="qco-lead">
                  Buy AI credits for your QuizSupport account. Your credits are
                  added after payment is confirmed.
                </p>
              </div>
              <span className="qco-head-badge">
                <ShieldCheck size={16} aria-hidden="true" />
                Secure payment
              </span>
            </header>

            <div className="qco-grid">
              <section
                className="qco-card qco-summary-card"
                aria-labelledby="qco-order-heading"
              >
                <div className="qco-card-head">
                  <div>
                    <h2 id="qco-order-heading">Order summary</h2>
                    <p>One-time purchase. No subscription.</p>
                  </div>
                  <span className="qco-secure-chip">
                    <Lock size={13} aria-hidden="true" />
                    Secure
                  </span>
                </div>

                <fieldset className="qco-pack-fieldset" disabled={locked}>
                  <legend className="qco-label">Choose a credit pack</legend>
                  <div className="qco-packs">
                    {packs.map((item) => {
                      const selected = item.id === pack.id;
                      return (
                        <label
                          key={item.id}
                          className={cn(
                            "qco-pack-option",
                            selected && "is-selected"
                          )}
                        >
                          <input
                            type="radio"
                            name="credit-pack"
                            value={item.id}
                            checked={selected}
                            onChange={() => {
                              setPackId(item.id);
                              setFormError(null);
                            }}
                            className="sr-only"
                          />
                          <span className="qco-pack-top">
                            <span className="qco-pack-name">{item.name}</span>
                            {item.popular && (
                              <span className="qco-pack-badge">Popular</span>
                            )}
                          </span>
                          <span className="qco-pack-price">
                            {formatInr(item.price)}
                            <small>one-time</small>
                          </span>
                          <span className="qco-pack-credits">
                            <Sparkles size={13} aria-hidden="true" />
                            {item.credits.toLocaleString("en-IN")} AI credits
                          </span>
                          <span className="qco-pack-validity">
                            Valid {item.validityMonths} months
                          </span>
                          <span className="qco-select-dot" aria-hidden="true">
                            <Check size={11} strokeWidth={3.5} />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="qco-pack-details">
                  <span className="qco-pack-icon" aria-hidden="true">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <strong>{pack.name}</strong>
                    <p>
                      {pack.credits.toLocaleString("en-IN")} credits · valid for{" "}
                      {pack.validityMonths} months
                    </p>
                  </div>
                </div>

                <form className="qco-coupon" onSubmit={handleApplyCoupon}>
                  <label htmlFor="qco-coupon" className="qco-label">
                    <Tag size={14} aria-hidden="true" />
                    Coupon code
                  </label>
                  <div className="qco-coupon-row">
                    <div className="qco-input-wrap">
                      <Tag size={15} aria-hidden="true" />
                      <input
                        id="qco-coupon"
                        value={couponInput}
                        onChange={(event) => {
                          setCouponInput(event.target.value.toUpperCase());
                          if (couponMessage.tone === "error") {
                            setCouponMessage({
                              tone: "hint",
                              text: "Try TEACHER10 for 10% off.",
                            });
                          }
                        }}
                        placeholder="Enter coupon code"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={locked || Boolean(appliedCoupon)}
                        aria-describedby="qco-coupon-msg"
                        className="qco-input qco-input-with-icon"
                      />
                    </div>
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        disabled={locked}
                        className="qco-coupon-btn is-remove"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={locked}
                        className="qco-coupon-btn"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  <p
                    id="qco-coupon-msg"
                    className={cn(
                      "qco-inline-msg",
                      `is-${couponMessage.tone}`
                    )}
                    aria-live="polite"
                  >
                    {couponMessage.text}
                  </p>
                </form>

                <dl className="qco-totals">
                  <div className="qco-total-row">
                    <dt>Subtotal (incl. GST)</dt>
                    <dd>{formatInr(totals.price)}</dd>
                  </div>
                  {totals.discount > 0 && (
                    <div className="qco-total-row is-discount">
                      <dt>
                        Discount
                        {appliedCoupon ? ` (${appliedCoupon.code})` : ""}
                      </dt>
                      <dd>−{formatInr(totals.discount)}</dd>
                    </div>
                  )}
                  <div className="qco-total-row">
                    <dt>
                      GST ({Math.round(CHECKOUT_GST_RATE * 100)}%)
                      <span className="qco-gst-tag"> included</span>
                    </dt>
                    <dd>{formatInr(totals.gst)}</dd>
                  </div>
                  <div className="qco-grand-total">
                    <dt>Total payable</dt>
                    <dd>{formatInr(totals.total)}</dd>
                  </div>
                </dl>

                <div className="qco-summary-foot">
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span>
                    All prices include GST. Credits are non-transferable.
                  </span>
                </div>
              </section>

              <section
                className="qco-card qco-payment-card"
                aria-labelledby="qco-payment-heading"
              >
                <div className="qco-card-head">
                  <div>
                    <h2 id="qco-payment-heading">Payment</h2>
                    <p>Choose how you want to pay.</p>
                  </div>
                  <span className="qco-test-pill">Test mode</span>
                </div>

                {phase === "processing" ? (
                  <div
                    className="qco-processing"
                    ref={statusRef}
                    tabIndex={-1}
                    role="status"
                    aria-live="polite"
                  >
                    <span className="qco-spinner" aria-hidden="true">
                      <Loader2 size={24} />
                    </span>
                    <h2>Processing payment</h2>
                    <p>
                      {formatInr(receipt?.total ?? totals.total)}
                      {receipt?.method ? ` · ${receipt.method}` : ""}
                    </p>
                    <ol className="qco-processing-steps">
                      {PROCESSING_STEPS.map((step, index) => {
                        const state =
                          index < processingStep
                            ? "is-done"
                            : index === processingStep
                              ? "is-active"
                              : "";
                        return (
                          <li key={step} className={state}>
                            <span aria-hidden="true">
                              {index < processingStep ? (
                                <Check size={11} strokeWidth={3.5} />
                              ) : index === processingStep ? (
                                <Loader2 size={11} />
                              ) : null}
                            </span>
                            {step}
                          </li>
                        );
                      })}
                    </ol>
                    <p className="qco-processing-note">
                      <Lock size={13} aria-hidden="true" />
                      Do not refresh or close this page.
                    </p>
                  </div>
                ) : phase === "failed" ? (
                  <div
                    className="qco-state"
                    ref={statusRef}
                    tabIndex={-1}
                    role="alert"
                  >
                    <span className="qco-state-icon is-bad" aria-hidden="true">
                      <AlertCircle size={28} />
                    </span>
                    <h2>Payment failed</h2>
                    <p>
                      {failureReason ||
                        "We could not complete this payment. No amount has been charged."}
                    </p>
                    <p className="qco-state-note">
                      Try again with another method, or contact support if the
                      amount was debited.
                    </p>
                    <div className="qco-state-actions">
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="btn pri"
                      >
                        Try again
                      </button>
                      <Link href="/contact" className="btn">
                        Contact support
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    {formError && (
                      <div
                        className="qco-error-summary"
                        ref={errorSummaryRef}
                        tabIndex={-1}
                        role="alert"
                      >
                        <AlertCircle size={16} aria-hidden="true" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <fieldset className="qco-methods">
                      <legend className="sr-only">Payment method</legend>
                      {PAYMENT_METHODS.map((item) => {
                        const Icon = item.icon;
                        const selected = method === item.id;
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "qco-method",
                              selected && "is-selected"
                            )}
                          >
                            <label className="qco-method-head">
                              <input
                                type="radio"
                                name="payment-method"
                                value={item.id}
                                checked={selected}
                                onChange={() => {
                                  setMethod(item.id);
                                  clearAllErrors();
                                }}
                                className="sr-only"
                              />
                              <span
                                className="qco-method-icon"
                                aria-hidden="true"
                              >
                                <Icon size={17} />
                              </span>
                              <span className="qco-method-copy">
                                <span className="qco-method-name">
                                  {item.label}
                                </span>
                                <span className="qco-method-hint">
                                  {item.hint}
                                </span>
                              </span>
                              {item.id === "upi" && (
                                <span className="qco-fastest">Fastest</span>
                              )}
                              <span
                                className="qco-radio-dot"
                                aria-hidden="true"
                              />
                            </label>
                            {selected && (
                              <div className="qco-method-panel">
                                {renderMethodPanel()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </fieldset>

                    <div className="qco-email-field">
                      <label htmlFor="qco-email" className="qco-field-label">
                        <Mail size={14} aria-hidden="true" />
                        Email for receipt
                      </label>
                      <input
                        id="qco-email"
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          clearFieldError("email");
                        }}
                        autoComplete="email"
                        placeholder="you@example.com"
                        className={cn(
                          "qco-input",
                          errors.email && "is-invalid"
                        )}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={
                          errors.email ? "qco-email-error" : "qco-email-help"
                        }
                      />
                      {errors.email ? (
                        <p
                          id="qco-email-error"
                          className="qco-field-error"
                          role="alert"
                        >
                          {errors.email}
                        </p>
                      ) : (
                        <p id="qco-email-help" className="qco-field-help">
                          We&apos;ll send the payment receipt here.
                        </p>
                      )}
                    </div>

                    <button type="submit" className="qco-pay">
                      <Lock size={17} aria-hidden="true" />
                      Pay {formatInr(totals.total)}
                    </button>

                    <div className="qco-secure-line">
                      <span>
                        <ShieldCheck size={13} aria-hidden="true" />
                        256-bit SSL encryption
                      </span>
                      <span>
                        <Lock size={13} aria-hidden="true" />
                        Secure payment
                      </span>
                      <span>GST included</span>
                    </div>

                    <p className="qco-terms">
                      By completing this payment you agree to our{" "}
                      <a
                        href="#qco-terms"
                        onClick={() => openPolicy("qco-terms")}
                      >
                        Terms
                      </a>
                      , <Link href="/privacy">Privacy Policy</Link>, and{" "}
                      <a
                        href="#qco-refund"
                        onClick={() => openPolicy("qco-refund")}
                      >
                        Refund Policy
                      </a>
                      .
                    </p>

                    <p className="qco-demo-note">
                      <Info size={13} aria-hidden="true" />
                      <span>
                        Demo checkout — no real payment will be processed.
                      </span>
                    </p>
                  </form>
                )}
              </section>
            </div>

            <section
              className="qco-policies"
              aria-label="Purchase policies"
            >
              <details className="qco-policy" id="qco-terms">
                <summary>Terms of purchase</summary>
                <p>
                  AI credit packs are one-time digital purchases. Credits are
                  added after payment is verified, are non-transferable, and
                  expire after the validity period shown at checkout. Prices
                  include GST. By paying, you confirm that you are authorised
                  to use the selected payment method.
                </p>
              </details>
              <details className="qco-policy" id="qco-refund">
                <summary>Refund policy</summary>
                <p>
                  If a payment fails or you are charged twice, contact support
                  and we will review it. Unused credits can be refunded within
                  7 days of purchase. Approved refunds are sent back to the
                  original payment method within 5–7 working days. Used credits
                  are not refundable.
                </p>
              </details>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
