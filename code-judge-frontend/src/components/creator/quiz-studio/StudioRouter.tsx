"use client";

import { useRouter } from "next/navigation";
import { StudioProvider, useStudio } from "./StudioProvider";
import { StudioShell } from "./StudioShell";
import { SetupStep } from "./steps/SetupStep";
import { QuestionsStep } from "./steps/QuestionsStep";
import { SettingsStep } from "./steps/SettingsStep";
import { AudienceStep } from "./steps/AudienceStep";
import { PricingStep } from "./steps/PricingStep";
import { BrandingStep } from "./steps/BrandingStep";
import { ReviewStep } from "./steps/ReviewStep";
import { PublishStep, SuccessStep } from "./steps/PublishStep";

export function StudioRouter() {
  const { state, publish } = useStudio();
  switch (state.step) {
    case "setup":
      return <SetupStep />;
    case "questions":
      return <QuestionsStep />;
    case "settings":
      return <SettingsStep />;
    case "audience":
      return <AudienceStep />;
    case "pricing":
      return <PricingStep />;
    case "branding":
      return <BrandingStep />;
    case "review":
      return <ReviewStep />;
    case "publish":
      return <PublishStep onPublish={publish} />;
    default:
      return <SetupStep />;
  }
}

export function QuizStudio() {
  const router = useRouter();
  return (
    <StudioProvider>
      <QuizStudioInner onDashboard={() => router.push("/creator/quizzes")} />
    </StudioProvider>
  );
}

function QuizStudioInner({ onDashboard }: { onDashboard: () => void }) {
  const { state } = useStudio();
  if (state.published) {
    return <SuccessStep onDashboard={onDashboard} />;
  }
  return (
    <StudioShell>
      <StudioRouter />
    </StudioShell>
  );
}
