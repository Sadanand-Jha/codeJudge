import { jsPDF } from "jspdf";
import type { QuestionPaper } from "@/components/creator/tests/sections/paperTypes";
import { downloadQuestionPaper } from "@/services/aiGenerate";
import { htmlToEditableText } from "@/components/creator/questions/QuestionHtml";

export interface ExportableQuestion {
  question: string;
  questionHtml?: string | null;
  difficulty: string;
  kind: string;
}

const plainQuestion = (question: ExportableQuestion) =>
  question.questionHtml?.trim()
    ? htmlToEditableText(question.questionHtml)
    : question.question;

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "questions";

/** Client-side PDF export for a selected set of subjective questions. */
export function downloadQuestionsPdf({
  questions,
  title,
  subject,
}: {
  questions: ExportableQuestion[];
  title: string;
  subject?: string | null;
}): void {
  if (questions.length === 0) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(26, 18, 64);
  doc.text(title, margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(92, 86, 121);
  const subtitle = [
    `${questions.length} question${questions.length === 1 ? "" : "s"}`,
    subject?.trim() || null,
    new Date().toLocaleDateString(),
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(subtitle, margin, y);
  y += 9;

  questions.forEach((question, index) => {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(106, 61, 240);
    doc.text(
      `Q${index + 1}.  ${question.difficulty.toUpperCase()} · ${question.kind.toUpperCase()}`,
      margin,
      y
    );
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(26, 18, 64);
    const lines = doc.splitTextToSize(plainQuestion(question), maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 4;
  });

  doc.save(`${slug(title)}.pdf`);
}

/** Word export uses the backend's DOCX renderer, which understands HTML tables. */
export async function downloadQuestionsDocx({
  questions,
  title,
  subject,
}: {
  questions: ExportableQuestion[];
  title: string;
  subject?: string | null;
}): Promise<void> {
  if (questions.length === 0) return;

  const paper: QuestionPaper = {
    title,
    instructions: subject ? `Subject: ${subject}` : "",
    syllabus: "",
    sections: [
      {
        order: 1,
        label: "A",
        name: subject?.trim() || "Questions",
        title: "",
        instructions: "",
        questionGroups: [
          {
            name: "Subjective Questions",
            type: "subjective",
            marksPerQuestion: 1,
            attemptRule: { type: "ALL", count: null },
            questions: questions.map((question, index) => ({
              num: index + 1,
              question: question.question,
              questionHtml: question.questionHtml ?? null,
              difficulty: question.difficulty,
              kind: question.kind,
              marks: 1,
            })),
          },
        ],
        totalQuestions: questions.length,
        totalAvailableMarks: questions.length,
        sectionMarks: questions.length,
      },
    ],
    totalQuestions: questions.length,
    totalMarks: questions.length,
  };

  await downloadQuestionPaper(paper);
}
