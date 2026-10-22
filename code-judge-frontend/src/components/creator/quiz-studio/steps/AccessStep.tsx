"use client";

import { StudioStepHeader, StudioStepLayout } from "../primitives";
import { AudienceStep } from "./AudienceStep";
import { RegistrationStep } from "./RegistrationStep";
import { PricingStep } from "./PricingStep";

export function AccessStep() {
  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader title="Access" />
      <p className="-mt-1 px-1 text-sm font-medium text-[var(--qs-muted)]">
        Decide who can join, what they share, and how they get in.
      </p>

      <div className="space-y-8">
        <section className="border-t-2 border-[var(--qs-line)] pt-6 first:border-t-0 first:pt-0">
          <AudienceStep embedded />
        </section>
        <section className="border-t-2 border-[var(--qs-line)] pt-6">
          <RegistrationStep embedded />
        </section>
        <section className="border-t-2 border-[var(--qs-line)] pt-6">
          <PricingStep embedded />
        </section>
      </div>
    </StudioStepLayout>
  );
}
