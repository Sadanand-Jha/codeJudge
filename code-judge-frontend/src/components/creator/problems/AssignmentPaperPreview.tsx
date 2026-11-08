import { Check } from "lucide-react";
import { QuestionHtml } from "@/components/creator/questions/QuestionHtml";
import { cn } from "@/lib/helpers";

export interface AssignmentPreviewQuestion {
  question: string;
  questionHtml?: string | null;
  difficulty?: string;
  kind?: string;
  marks?: number;
  options?: Array<{ text: string; isCorrect?: boolean }>;
  explanation?: string | null;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function AssignmentPaperPreview({
  title,
  subject,
  instructions,
  questions,
  emptyLabel = "Add a question to see the preview.",
}: {
  title: string;
  subject?: string | null;
  instructions?: string | null;
  questions: AssignmentPreviewQuestion[];
  emptyLabel?: string;
}) {
  const totalMarks = questions.reduce((sum, question) => sum + (question.marks ?? 0), 0);

  return (
    <article className="mx-auto w-full max-w-[760px] rounded-[8px] border-2 border-[var(--qs-ink)] bg-white px-5 py-6 text-[#1b1340] shadow-[6px_6px_0_rgba(27,19,64,0.15)] sm:px-9 sm:py-8">
      <h2 className="text-center text-[22px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[26px]">
        {title.trim() || "Untitled assignment"}
      </h2>
      {subject?.trim() ? (
        <p className="mt-1 text-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#5d5878]">
          {subject}
        </p>
      ) : null}

      <div className="my-4 flex flex-wrap items-center justify-between gap-2 border-y-2 border-[#1b1340] py-2 text-[13px] font-bold sm:text-sm">
        <span>
          {questions.length} question{questions.length === 1 ? "" : "s"}
        </span>
        <span>Max marks: {totalMarks}</span>
      </div>

      {instructions?.trim() ? (
        <section className="mb-4">
          <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5d5878]">
            Instructions
          </h3>
          <p className="whitespace-pre-wrap text-[13px] font-medium leading-6">{instructions}</p>
        </section>
      ) : null}

      {questions.length === 0 ? (
        <p className="py-8 text-center text-[13px] font-medium italic text-[#8a85a6]">{emptyLabel}</p>
      ) : (
        <ol className="space-y-0">
          {questions.map((question, index) => (
            <li key={`${index}-${question.question.slice(0, 24)}`} className="border-b border-dashed border-[#bbb] py-3 last:border-b-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-2">
                  <span className="shrink-0 text-[14.5px] font-extrabold leading-6">{index + 1}.</span>
                  <div className="min-w-0 text-[14.5px] font-medium leading-6">
                    {question.questionHtml?.trim() ? (
                      <QuestionHtml html={question.questionHtml} />
                    ) : (
                      <p className="whitespace-pre-wrap">{question.question}</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[12.5px] font-bold">
                  {question.marks ?? 0} marks
                </span>
              </div>

              {question.options && question.options.length > 0 ? (
                <div className="mt-2 space-y-1.5 pl-6">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={`${optionIndex}-${option.text.slice(0, 16)}`}
                      className={cn(
                        "flex items-start gap-2 rounded-[6px] px-2 py-1 text-[13.5px] leading-5",
                        option.isCorrect ? "bg-[#e7f7ec] font-bold text-[#126b32]" : "text-[#3b3558]"
                      )}
                    >
                      <span className="shrink-0 font-extrabold">({OPTION_LABELS[optionIndex] ?? optionIndex + 1})</span>
                      <span className="min-w-0 whitespace-pre-wrap">{option.text}</span>
                      {option.isCorrect ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={3} /> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {question.explanation?.trim() ? (
                <p className="mt-2 pl-6 text-[12px] italic leading-5 text-[#5d5878]">
                  <span className="font-bold not-italic">Answer explanation: </span>
                  {question.explanation}
                </p>
              ) : null}

              {question.difficulty || question.kind ? (
                <div className="mt-2 flex flex-wrap gap-2 pl-6 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#5d5878]">
                  {question.difficulty ? <span>{question.difficulty}</span> : null}
                  {question.kind ? <span>· {question.kind}</span> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
