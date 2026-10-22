"use client";

import { StudioStepHeader, StudioStepLayout } from "../primitives";
import { TimingSection } from "../components/timing";
import { QuizCodeCard } from "./SettingsStep";
import { ReviewStep } from "./ReviewStep";
import { PublishStep } from "./PublishStep";

export function ReviewPublishStep({ onPublish }: { onPublish: () => void }) {
  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader title="Review & publish" />
      <ReviewStep embedded />

      <section className="border-t-2 border-[var(--qs-line)] pt-6">
        <TimingSection variant="availability" allowInlineStart={false} />
      </section>

      <QuizCodeCard />

      <section className="border-t-2 border-[var(--qs-line)] pt-6">
        <PublishStep onPublish={onPublish} embedded />
      </section>
    </StudioStepLayout>
  );
}
