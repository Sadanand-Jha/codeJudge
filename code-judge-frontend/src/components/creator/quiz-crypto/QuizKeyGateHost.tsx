"use client";

import { QuizKeyGateDialog } from "./QuizKeyGateDialog";
import { useQuizKeyGateStore } from "@/store/quizKeyGateStore";

export function QuizKeyGateHost() {
  const open = useQuizKeyGateStore((state) => state.open);
  const request = useQuizKeyGateStore((state) => state.request);
  const complete = useQuizKeyGateStore((state) => state.complete);
  const cancel = useQuizKeyGateStore((state) => state.cancel);

  return (
    <QuizKeyGateDialog
      key={request?.quizId ?? "closed"}
      open={open}
      title={request?.title}
      verify={request?.verify}
      onComplete={complete}
      onCancel={cancel}
    />
  );
}
