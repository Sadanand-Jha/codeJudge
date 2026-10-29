"use client";

import { QuizKeyDialog } from "./QuizKeyDialog";
import { useQuizKeyDialogStore } from "@/store/quizKeyDialogStore";

export function QuizKeyDialogHost() {
  const payload = useQuizKeyDialogStore((state) => state.payload);

  return (
    <QuizKeyDialog
      key={payload ? `${payload.quizId}:${payload.keyHex}` : "closed"}
    />
  );
}
