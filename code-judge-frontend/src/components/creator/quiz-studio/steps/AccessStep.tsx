"use client";

import { StudioStepLayout } from "../primitives";
import { AudienceStep } from "./AudienceStep";
import { RegistrationStep } from "./RegistrationStep";
// OLD (disabled): pricing & monetization section.
// import { PricingStep } from "./PricingStep";

export function AccessStep() {
  return (
    <StudioStepLayout width="wide">
      <div className="space-y-8">
        <section className="border-t-2 border-[var(--qs-line)] pt-6 first:border-t-0 first:pt-0">
          <AudienceStep embedded />
        </section>
        <section className="border-t-2 border-[var(--qs-line)] pt-6">
          <RegistrationStep embedded />
        </section>
        {/* OLD (disabled): pricing & monetization section.
        <section className="hidden border-t-2 border-[var(--qs-line)] pt-6 sm:block">
          <PricingStep embedded />
        </section>
        */}
      </div>
    </StudioStepLayout>
  );
}
