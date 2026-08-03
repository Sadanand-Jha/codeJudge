"use client";

import { useState } from "react";
import QuizSettingsPage from "@/components/quiz/creator/QuizSettingsPage";
import QuestionBuilder from "@/components/quiz/creator/QuestionBuilder";
import { QuizDetails, DEFAULT_QUIZ_DETAILS, CreatorQuestion } from "@/components/quiz/creator/types";
import { loadQuizState, clearQuizState, saveQuizState } from "@/utils/quizStorage";
import { toast } from "@/lib/toast";

interface InitialState {
  stage: "settings" | "builder";
  details: QuizDetails;
  questions: CreatorQuestion[];
  activeQuestionId: string;
}

function getInitialState(): InitialState {
  const saved = loadQuizState();
  if (saved) {
    return {
      stage: saved.currentStage,
      details: saved.details,
      questions: saved.questions,
      activeQuestionId: saved.activeQuestionId,
    };
  }
  return {
    stage: "settings",
    details: DEFAULT_QUIZ_DETAILS,
    questions: [],
    activeQuestionId: "",
  };
}

export default function CreateQuizPage() {
  const [initial] = useState<InitialState>(getInitialState);
  const [stage, setStage] = useState<"settings" | "builder">(initial.stage);
  const [details, setDetails] = useState<QuizDetails>(initial.details);
  const [questions] = useState<CreatorQuestion[]>(initial.questions);
  const [activeQuestionId] = useState(initial.activeQuestionId);

  const handleContinue = (quizDetails: QuizDetails) => {
    setDetails(quizDetails);
    setStage("builder");
    // Save the stage transition
    const saved = loadQuizState();
    saveQuizState({
      details: quizDetails,
      questions: saved?.questions || [],
      activeQuestionId: saved?.activeQuestionId || "",
      currentStage: "builder",
      updatedAt: new Date().toISOString(),
    });
  };

  const handleBack = () => {
    setStage("settings");
    const saved = loadQuizState();
    if (saved) {
      saveQuizState({
        ...saved,
        currentStage: "settings",
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handlePublish = () => {
    // Read complete quiz from localStorage
    const saved = loadQuizState();
    if (!saved) {
      toast.error("No quiz data found. Please start over.");
      return;
    }

    // Validate all data
    const incomplete = saved.questions.filter((q) => {
      const hasTitle = q.title.trim().length > 0;
      if (!hasTitle) return true;
      if (q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false") {
        const hasOptions = q.options.length >= 2 && q.options.every((o) => o.content.trim() !== "");
        const hasCorrect = q.options.some((o) => o.isCorrect);
        return !hasOptions || !hasCorrect;
      }
      return String(q.correctAnswer).trim().length === 0;
    });

    if (incomplete.length > 0) {
      toast.error(`${incomplete.length} question(s) are incomplete. Please complete them before publishing.`);
      return;
    }

    // Build the complete payload
    const payload = {
      details: saved.details,
      questions: saved.questions,
      totalQuestions: saved.questions.length,
      totalMarks: saved.questions.reduce((sum, q) => sum + q.marks, 0),
      totalTime: saved.questions.reduce((sum, q) => sum + q.expectedTime, 0),
    };

    // TODO: Send single API request with the complete quiz payload
    console.log("Publishing quiz:", payload);

    // If submission succeeds, clear localStorage
    clearQuizState();
    toast.success("Quiz published successfully!");
  };

  if (stage === "builder") {
    return (
      <QuestionBuilder
        details={details}
        initialQuestions={questions}
        initialActiveQuestionId={activeQuestionId}
        onBack={handleBack}
        onPublish={handlePublish}
      />
    );
  }

  return <QuizSettingsPage initialDetails={details} onContinue={handleContinue} />;
}