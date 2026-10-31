"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { CheckoutSuggestionCard } from "@/components/creator/billing/CheckoutSuggestionCard";
import { savePlanBundleIntent } from "@/lib/checkoutIntent";
import { trackCheckoutEvent } from "@/services/analytics";
import {
  getCheckoutSuggestion,
  type CheckoutSuggestion,
} from "@/services/billing";

function SuggestionDialog({
  suggestion,
  onAccept,
  onDecline,
  onClose,
}: {
  suggestion: CheckoutSuggestion;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex overflow-y-auto bg-[#1A1240]/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        role="dialog"
        aria-modal="true"
        aria-label="Recommended upgrade"
        className="m-auto w-full max-w-[430px] rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[8px_8px_0_var(--qs-sun)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-black tracking-tight">One better option</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-[10px] border-2 border-[var(--qs-line)]"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
        <CheckoutSuggestionCard
          suggestion={suggestion}
          onAccept={onAccept}
          onDecline={onDecline}
          onReopen={() => {}}
        />
      </motion.div>
    </motion.div>
  );
}

function PublicCheckoutCta({
  kind,
  productId,
  planSlug,
  label,
  className,
}: {
  kind: "plan" | "pack";
  productId: string;
  planSlug?: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<CheckoutSuggestion | null>(null);

  const destinationFor = (next: CheckoutSuggestion | null) => {
    if (kind === "plan") {
      const nextPath = `/creator/billing/plans?plan=${encodeURIComponent(planSlug ?? "")}`;
      return `/register?next=${encodeURIComponent(nextPath)}`;
    }
    const packId =
      next?.kind === "pack_upgrade" ? next.pack.code : productId;
    const nextPath = `/creator/billing/credits?pack=${encodeURIComponent(packId)}`;
    return nextPath;
  };

  const continueToCheckout = (next: CheckoutSuggestion | null) => {
    if (next?.kind === "plan_bundle" && planSlug) {
      savePlanBundleIntent({ planSlug, bundleId: next.bundleId });
    }
    router.push(destinationFor(next));
  };

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response =
        kind === "plan"
          ? await getCheckoutSuggestion({ planSlug })
          : await getCheckoutSuggestion({ packId: productId });
      const next = response.suggestion;
      if (!next) {
        continueToCheckout(null);
        return;
      }
      setSuggestion(next);
      trackCheckoutEvent({
        event: "suggestion_shown",
        suggestionType: next.suggestionType,
        sourceProductId: next.sourceProductId,
        productId: next.productId,
        planCode: response.planCode,
      });
    } catch {
      continueToCheckout(null);
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (!suggestion) return;
    trackCheckoutEvent({
      event: "suggestion_accepted",
      suggestionType: suggestion.suggestionType,
      sourceProductId: suggestion.sourceProductId,
      productId: suggestion.productId,
    });
    const next = suggestion;
    setSuggestion(null);
    continueToCheckout(next);
  };

  const decline = () => {
    if (!suggestion) return;
    trackCheckoutEvent({
      event: "suggestion_declined",
      suggestionType: suggestion.suggestionType,
      sourceProductId: suggestion.sourceProductId,
      productId: suggestion.productId,
    });
    setSuggestion(null);
    continueToCheckout(null);
  };

  return (
    <>
      <button type="button" onClick={handleClick} disabled={loading} className={className}>
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking best value…
          </span>
        ) : (
          label
        )}
      </button>
      <AnimatePresence>
        {suggestion && (
          <SuggestionDialog
            suggestion={suggestion}
            onAccept={accept}
            onDecline={decline}
            onClose={() => setSuggestion(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export function PublicPlanCta({
  planSlug,
  label,
  className,
}: {
  planSlug: string;
  label: string;
  className?: string;
}) {
  return (
    <PublicCheckoutCta
      kind="plan"
      productId={`plan:${planSlug}`}
      planSlug={planSlug}
      label={label}
      className={className}
    />
  );
}

export function PublicPackCta({
  packId,
  label,
  className,
}: {
  packId: string;
  label: string;
  className?: string;
}) {
  return (
    <PublicCheckoutCta
      kind="pack"
      productId={packId}
      label={label}
      className={className}
    />
  );
}
