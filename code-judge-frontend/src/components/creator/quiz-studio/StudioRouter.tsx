"use client";

import { useRouter } from "next/navigation";
import { StudioProvider, useStudio } from "./StudioProvider";
import { StudioShell } from "./StudioShell";
import { SetupStep } from "./steps/SetupStep";
import { QuestionsStep } from "./steps/QuestionsStep";
import { SettingsStep } from "./steps/SettingsStep";
import { AudienceStep } from "./steps/AudienceStep";
import { RegistrationStep } from "./steps/RegistrationStep";
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
    case "registration":
      return <RegistrationStep />;
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

function StudioShellWithRouter({ onDashboard }: { onDashboard: () => void }) {
  const { state, loading } = useStudio();

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-300 border-t-transparent" />
          <p className="text-sm text-text-secondary">Loading quiz…</p>
        </div>
      </div>
    );
  }

  if (state.published) {
    return <SuccessStep onDashboard={onDashboard} />;
  }
  return (
    <StudioShell>
      <StudioRouter />
    </StudioShell>
  );
}

export function QuizCreator() {
  const router = useRouter();
  return (
    <StudioProvider>
      <StudioShellWithRouter onDashboard={() => router.push("/creator/quizzes")} />
    </StudioProvider>
  );
}

export function QuizEditor({ quizId }: { quizId: string }) {
  const router = useRouter();
  return (
    <StudioProvider editMode initialQuizId={quizId}>
      <StudioShellWithRouter onDashboard={() => router.push("/creator/quizzes")} />
    </StudioProvider>
  );
}
