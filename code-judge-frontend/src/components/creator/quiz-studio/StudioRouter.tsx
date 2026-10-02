"use client";

import { useRouter } from "next/navigation";
import { StudioProvider, useStudio } from "./StudioProvider";
import { StudioShell } from "./StudioShell";
import { SetupStep } from "./steps/SetupStep";
import { QuestionsStep } from "./steps/QuestionsStep";
import { GameMechanicsStep } from "./steps/GameMechanicsStep";
import { SettingsStep } from "./steps/SettingsStep";
import { AudienceStep } from "./steps/AudienceStep";
import { RegistrationStep } from "./steps/RegistrationStep";
import { PricingStep } from "./steps/PricingStep";
import { BrandingStep } from "./steps/BrandingStep";
import { ReviewStep } from "./steps/ReviewStep";
import { PublishStep, SuccessStep } from "./steps/PublishStep";

export function StudioRouter() {
  const { state, publish, editMode } = useStudio();

  switch (state.step) {
    case "setup":
      return <SetupStep />;
    case "questions":
      return <QuestionsStep />;
    case "gameMechanics":
      return <GameMechanicsStep />;
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
      if (editMode) return <ReviewStep />;
      return <PublishStep onPublish={publish} />;
    default:
      return <SetupStep />;
  }
}

function StudioShellWithRouter({ onDashboard }: { onDashboard: () => void }) {
  const { state, loading, loadError, questionsLoading, editMode } = useStudio();

  if (loading || (editMode && questionsLoading && !loadError)) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-[0_18px_60px_rgba(17,24,39,0.08)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.3)]">
          <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-pink-500/15 to-violet-500/15">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-pink-500/20 border-t-pink-500" />
            <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-pink-500/10" />
          </div>
          <h2 className="mt-5 text-base font-bold text-text-primary">
            {loading ? "Loading quiz" : "Loading quiz questions"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {loading
              ? "Preparing your Creator Studio workspace…"
              : "Waiting for the questions service. We’ll retry automatically until everything is ready."}
          </p>
          {!loading && (
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Your saved questions remain protected
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center bg-background">
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

export function QuizEditor({ quizId, initialStep }: { quizId: string; initialStep?: string }) {
  const router = useRouter();
  return (
    <StudioProvider editMode initialQuizId={quizId} initialStep={initialStep}>
      <StudioShellWithRouter onDashboard={() => router.push("/creator/quizzes")} />
    </StudioProvider>
  );
}
