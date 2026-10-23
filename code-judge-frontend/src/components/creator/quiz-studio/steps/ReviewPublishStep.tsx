"use client";

import { StudioStepHeader, StudioStepLayout } from "../primitives";
import { TimingSection } from "../components/timing";
import { QuizCodeCard } from "./SettingsStep";
import { PublishStep } from "./PublishStep";

export function ReviewPublishStep({ onPublish }: { onPublish: () => void }) {
  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader title="Publish" />
      <QuizCodeCard />

      <section className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
        <div className="border-b-2 border-[var(--qs-line)] px-5 py-4 sm:px-6 sm:py-5">
          <h2 className="text-base font-extrabold text-[var(--qs-ink)]">
            Availability & publish
          </h2>
          <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
            Choose when this quiz runs, then start or schedule it.
          </p>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <TimingSection variant="availability" allowInlineStart={false} flat />

          <div className="mt-6 border-t-2 border-[var(--qs-line)] pt-5">
            <h3 className="text-sm font-extrabold text-[var(--qs-ink)]">
              Ready to publish?
            </h3>
            <div className="mt-3">
              <PublishStep onPublish={onPublish} embedded bare />
            </div>
          </div>
        </div>
      </section>
    </StudioStepLayout>
  );
}
