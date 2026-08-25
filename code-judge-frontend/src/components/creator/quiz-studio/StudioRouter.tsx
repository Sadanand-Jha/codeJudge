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
  const { state, loading, loadError } = useStudio();

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-300 border-t-transparent" />
          <p className="text-sm text-text-secondary">Loading quiz…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-text-primary">Quiz not found</h3>
          <p className="max-w-sm text-sm text-text-muted">{loadError}</p>
          <button
            onClick={onDashboard}
            className="mt-2 rounded-lg bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D81B60]"
          >
            Back to Quizzes
          </button>
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
