"use client";

import { useState, useCallback, useEffect } from "react";
import QuestionBuilder from "./QuestionBuilder";
import { QuizDetails, CreatorQuestion, createDefaultQuestion, getQuestionStatus } from "./types";
import { saveQuizQuestions, saveActiveQuestionId } from "@/utils/quizStorage";
import { formatQuizCode } from "@/utils/quizCode";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/helpers";

const DEFAULT_DETAILS: QuizDetails = {
  name: "Untitled Quiz",
  description: "",
  subject: "",
  subjectId: "",
  topic: "",
  difficulty: "Medium",
  visibility: "public",
  visibilityId: null,
  timeLimit: 30,
  startDate: "",
  endDate: "",
  timeZone: "Asia/Kolkata",
  randomizeQuestions: false,
  randomizeOptions: false,
  passingPercentage: 40,
  allowReattempt: true,
  showResultImmediately: true,
  showCorrectAnswersAfterSubmission: true,
  negativeMarking: false,
  negativeMarkValue: 0,
  tags: [],
  totalQuestions: 0,
  totalMarks: 0,
  marksPerQuestion: 10,
  passingMarks: 0,
  registrationEnabled: false,
  registrationStart: "",
  registrationEnd: "",
  emailResults: false,
  leaderboard: false,
  leaderboardShowRank: true,
  leaderboardShowScore: true,
  leaderboardShowTime: true,
  resultVisibility: "immediate",
  collaborators: [],
  audience: { mode: "EVERYONE", roomIds: [], roomNames: [], students: [], eligibleCount: 0 },
  availabilityMode: "immediate",
  availabilityStart: "",
  availabilityEnd: "",
  availabilityEndBehavior: "auto_submit",
};

export function QuestionsPage({ 
  onSave, 
  onBack,
  quizCode 
}: { 
  onSave: () => void; 
  onBack: () => void;
  quizCode?: string;
}) {
  const [details, setDetails] = useState<QuizDetails>(DEFAULT_DETAILS);
  const [questions, setQuestions] = useState<CreatorQuestion[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved state on mount
  useEffect(() => {
    const loadState = async () => {
      setIsLoading(true);
      try {
        // TODO: Implement loadQuizQuestions in quizStorage
        // const savedQuestions = loadQuizQuestions(quizCode || "");
        // if (savedQuestions?.length) {
        //   setQuestions(savedQuestions);
        //   setActiveQuestionId(savedQuestions[0]?.id || null);
        // } else {
          const defaultQ = createDefaultQuestion("q_1");
          setQuestions([defaultQ]);
          setActiveQuestionId(defaultQ.id);
        // }
      } catch {
        const defaultQ = createDefaultQuestion("q_1");
        setQuestions([defaultQ]);
        setActiveQuestionId(defaultQ.id);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, [quizCode]);

// Auto-save to localStorage
  useEffect(() => {
    if (!isLoading && questions.length > 0) {
      const timer = setTimeout(() => {
        saveQuizQuestions(questions, activeQuestionId ?? "");
        if (quizCode) saveActiveQuestionId(activeQuestionId ?? "");
        onSave?.();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [questions, activeQuestionId, isLoading, quizCode, onSave]);

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const totalTime = questions.reduce((sum, q) => sum + q.expectedTime, 0);
  const completedCount = questions.filter(q => getQuestionStatus(q) === "complete").length;

  const handlePublish = useCallback(() => {
    const incomplete = questions.filter(q => getQuestionStatus(q) !== "complete");
    if (incomplete.length > 0) {
      toast.warning(`${incomplete.length} question(s) are incomplete. Please complete them before publishing.`);
      return;
    }
    // Navigate to review/publish tab
  }, [questions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
          <p className="text-sm text-muted-foreground">Loading question workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col gap-4">
      {/* Quiz metadata bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#263245] bg-[#1B2433] p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={details.name || "Untitled Quiz"}
            onChange={e => setDetails(d => ({ ...d, name: e.target.value }))}
            className="bg-transparent border-none text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none w-64"
            placeholder="Quiz title"
          />
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">|</span>
          <span className="text-xs font-medium text-[#EC4899]">#{quizCode || formatQuizCode("") || "----"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <span className="text-[10px] font-medium text-muted-foreground">{questions.length} questions</span>
          <span className="text-[10px] font-medium text-muted-foreground">{totalMarks} marks</span>
          <span className="text-[10px] font-medium text-muted-foreground">{totalTime} min</span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]", completedCount === questions.length ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400")}>
            {completedCount}/{questions.length} complete
          </span>
        </div>
      </div>

      {/* Main Question Builder */}
      <QuestionBuilder
        details={details}
        initialQuestions={questions}
        initialActiveQuestionId={activeQuestionId ?? undefined}
        onBack={onBack}
        onPublish={handlePublish}
      />
    </div>
  );
}