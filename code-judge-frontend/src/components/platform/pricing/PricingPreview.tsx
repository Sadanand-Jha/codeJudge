"use client";

import { Check, Sparkles } from "lucide-react";

export type PreviewPlan = {
  slug: string;
  name: string;
  tagline: string;
  offer: string;
  cta: string;
  featured: boolean;
  trialDays: number;
  price: number;
  originalPrice: number | null;
  credits: number;
  features: string[];
  discountBadge: string | null;
};

export type PreviewPack = {
  id: string;
  name: string;
  credits: number;
  price: number;
  cta: string;
  blurb: string;
  popular: boolean;
  validityMonths: number;
  savePercent: number;
};

export type PreviewTab = "plans" | "packs" | "coupons" | "content";

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function discountPercent(plan: PreviewPlan): number {
  if (!plan.originalPrice || plan.originalPrice <= plan.price) return 0;
  return Math.round((1 - plan.price / plan.originalPrice) * 100);
}

export function PricingPreview({
  tab,
  plans,
  packs,
  content,
}: {
  tab: PreviewTab;
  plans: PreviewPlan[];
  packs: PreviewPack[];
  content: Record<string, string>;
}) {
  const heading =
    tab === "packs"
      ? content.credits_heading || "Top up AI credits"
      : content.plans_heading || "Plans that grow with your quiz load";
  const subheading =
    tab === "packs"
      ? content.credits_subheading || "Buy a pack only when you need extra credits."
      : content.plans_subheading || "Every plan includes the full quiz builder, access codes and instant results.";

  return (
    <div className="overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)]">
      <div className="flex items-center gap-2 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="mx-auto hidden min-w-0 items-center gap-1.5 rounded-full border border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1 sm:flex">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qs-ok)]" />
          <span className="truncate text-[9px] font-extrabold tracking-[0.08em] text-[var(--qs-muted)]">
            quizsupport.com/pricing
          </span>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-[var(--qs-okbg)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-ok)] sm:ml-0">
          Live
        </span>
      </div>

      <div className="max-h-[720px] overflow-y-auto">
        <div className="qp-preview qs-ui qs-lp qp-page px-3 py-5 sm:px-4">
          <div className="qp-hero">
            {content.plans_banner && tab !== "packs" && (
              <p className="qp-pill mb-2 inline-flex">{content.plans_banner}</p>
            )}
            <p className="eb">{tab === "packs" ? "Credit packs" : "Monthly plans"}</p>
            <h1>{heading}</h1>
            <p className="lead">{subheading}</p>
          </div>

          {tab === "plans" && (
            <>
              <div className="qp-grid">
                {plans.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-[var(--qs-line)] p-4 text-[12px] text-[var(--qs-muted)]">
                    Add a public plan to preview it here.
                  </p>
                ) : (
                  plans.map((plan) => {
                    const percent = discountPercent(plan);
                    const pill =
                      plan.discountBadge || (percent > 0 ? `${percent}% off` : null);
                    return (
                      <article key={plan.slug} className={`qp-plan${plan.featured ? " is-hot" : ""}`}>
                        {plan.featured && <span className="qp-badge">Most popular</span>}
                        <div className="qp-plan-top">
                          <h3>{plan.name}</h3>
                          {pill && <span className="qp-pill">{pill}</span>}
                        </div>
                        {plan.offer && <p className="qp-offer">{plan.offer}</p>}
                        <p className="qp-plan-desc">{plan.tagline}</p>
                        <div className="qp-price">
                          <b>{inr(plan.price)}</b>
                          {plan.originalPrice && plan.originalPrice > plan.price && <s>{inr(plan.originalPrice)}</s>}
                          <span>/ month</span>
                        </div>
                        <p className={`qp-plan-credits${plan.credits === 0 ? " is-muted" : ""}`}>
                          <Sparkles size={13} aria-hidden="true" />
                          {plan.credits > 0 ? `${plan.credits} AI credits / month` : "AI credits sold separately"}
                        </p>
                        <ul className="qp-features">
                          {plan.features.filter((feature) => !/trial/i.test(feature)).map((feature, index) => (
                            <li key={`${feature}-${index}`}>
                              <span className="qp-tick" aria-hidden="true">
                                <Check size={11} strokeWidth={3.5} />
                              </span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <span className="btn qp-plan-cta">{plan.cta || "Choose plan"}</span>
                      </article>
                    );
                  })
                )}
              </div>
              <p className="qp-after">
                <Sparkles size={14} />
                {content.plans_gst_note || "Every paid plan includes monthly AI credits."}
              </p>
            </>
          )}

          {tab === "packs" && (
            <>
              <div className="qp-packs">
                {packs.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-[var(--qs-line)] p-4 text-[12px] text-[var(--qs-muted)]">
                    Add an active pack to preview it here.
                  </p>
                ) : (
                  packs.map((pack) => (
                    <article key={pack.id} className={`qp-pack${pack.popular ? " is-popular" : ""}`}>
                      {pack.popular && <span className="qp-badge">Limited offer</span>}
                      <div className="qp-pack-top">
                        <h3>{pack.name}</h3>
                        <span className="qp-pack-validity">{pack.validityMonths} months</span>
                      </div>
                      <div className="qp-pack-price">
                        <b>{inr(pack.price)}</b>
                        <span>one-time</span>
                      </div>
                      <div className="qp-pack-credits">
                        <strong>{pack.credits}</strong> AI credits
                      </div>
                      <p className="qp-pack-desc">{pack.blurb}</p>
                      <ul className="qp-features qp-pack-features">
                        <li>
                          <span className="qp-tick" aria-hidden="true"><Check size={11} strokeWidth={3.5} /></span>
                          Works with every active plan
                        </li>
                        <li>
                          <span className="qp-tick" aria-hidden="true"><Check size={11} strokeWidth={3.5} /></span>
                          Valid for {pack.validityMonths} months
                        </li>
                      </ul>
                      {pack.savePercent > 0 && (
                        <p className="qp-plan-desc">Save {pack.savePercent}% versus buying smaller packs.</p>
                      )}
                      <span className="btn qp-pack-cta">{pack.cta}</span>
                    </article>
                  ))
                )}
              </div>
            </>
          )}

          {tab === "coupons" && (
            <div className="rounded-[12px] border border-dashed border-[var(--qs-line)] p-5 text-center">
              <p className="text-[13px] font-extrabold text-[var(--qs-ink)]">Coupons do not appear as pricing cards.</p>
              <p className="mt-1 text-[11px] text-[var(--qs-muted)]">
                They show at checkout after a visitor enters a code. Publishing activates them; saving alone keeps them inactive.
              </p>
            </div>
          )}

          {tab === "content" && (
            <div className="space-y-3">
              <p className="qp-plan-desc">
                This preview uses your draft content. Publish to update the public Monthly Plans and Credits pages.
              </p>
              <div className="rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">GST note</p>
                <p className="mt-1 text-[12px] font-semibold text-[var(--qs-ink)]">
                  {content.plans_gst_note || "No GST note set."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
