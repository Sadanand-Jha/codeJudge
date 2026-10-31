"use client";

import GuestGuard from "@/components/guards/GuestGuard";

import StudentDashboardHero from "@/components/quiz/dashboard/StudentDashboardHero";
import YourActivitySection from "@/components/quiz/live/YourActivitySection";
import QuizPageReady from "@/components/quiz/live/QuizPageReady";

function QuizHome() {
  return (
    <div className="qs-ui qs-onest relative min-h-[calc(100dvh-3.5rem)] bg-[var(--qs-bg)]">
      <QuizPageReady>
        <StudentDashboardHero />

        <div className="mx-auto w-full max-w-[1160px] px-5 pb-16 pt-14 sm:px-7">
          <YourActivitySection />
        </div>
      </QuizPageReady>
    </div>
  );
}

export default function QuizDashboardPage() {
  return (
    <GuestGuard action="join-contest">
      <QuizHome />
    </GuestGuard>
  );
}
