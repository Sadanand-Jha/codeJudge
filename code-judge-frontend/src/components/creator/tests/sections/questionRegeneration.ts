import type { GenerateQuestionsPayload, QuestionPaper, SubjectiveQuestion } from "./paperTypes";

type QuestionLocation = {
  sectionIndex: number;
  groupIndex: number;
  questionIndex: number;
};

type RegenerationScope = {
  subjectId: number;
  chapterIds: number[];
  topicIds: number[];
  syllabus?: string;
};

const difficultyFor = (value: string): "easy" | "medium" | "hard" => {
  const difficulty = value.trim().toLowerCase();
  if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") return difficulty;
  throw new Error("This question's difficulty cannot be preserved.");
};

const kindFor = (value: string): "Theory" | "Numerical" => {
  const kind = value.trim().toLowerCase();
  if (kind === "numerical") return "Numerical";
  if (kind === "theory") return "Theory";
  throw new Error("This question's type cannot be preserved.");
};

export function buildRegenerateQuestionPayload(
  paper: QuestionPaper,
  location: QuestionLocation,
  scope: RegenerationScope,
  instruction?: string
): GenerateQuestionsPayload {
  const section = paper.sections[location.sectionIndex];
  const group = section?.questionGroups[location.groupIndex];
  const question = group?.questions[location.questionIndex];
  if (!section || !group || !question) throw new Error("The selected question could not be found.");

  const difficulty = difficultyFor(question.difficulty);
  const kind = kindFor(question.kind);

  return {
    numberOfQuestions: 1,
    easyCount: difficulty === "easy" ? 1 : 0,
    mediumCount: difficulty === "medium" ? 1 : 0,
    hardCount: difficulty === "hard" ? 1 : 0,
    theoryCount: kind === "Theory" ? 1 : 0,
    numericalCount: kind === "Numerical" ? 1 : 0,
    reasoningEffort: "plus",
    syllabus: scope.syllabus?.trim() || undefined,
    context: [
      `Replace one question in "${paper.title}", Section ${section.label} — ${section.name}, group "${group.name}".`,
      `Keep the replacement at ${question.difficulty} difficulty, ${question.kind} type and ${question.marks} marks unless the teacher's instruction asks for something different.`,
      instruction?.trim() ? `The teacher specifically wants: ${instruction.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    avoidQuestions: paper.sections
      .flatMap((paperSection) => paperSection.questionGroups.flatMap((paperGroup) => paperGroup.questions))
      .map((paperQuestion) => paperQuestion.question)
      .filter(Boolean),
    subjectId: scope.subjectId,
    chapterIds: scope.chapterIds,
    topicIds: scope.topicIds,
    saveToBank: true,
  };
}

export function replacePaperQuestion(
  paper: QuestionPaper,
  location: QuestionLocation,
  replacement: SubjectiveQuestion
): QuestionPaper {
  const section = paper.sections[location.sectionIndex];
  const group = section?.questionGroups[location.groupIndex];
  const question = group?.questions[location.questionIndex];
  if (!section || !group || !question) throw new Error("The selected question could not be found.");

  return {
    ...paper,
    sections: paper.sections.map((currentSection, sectionIndex) => {
      if (sectionIndex !== location.sectionIndex) return currentSection;
      return {
        ...currentSection,
        questionGroups: currentSection.questionGroups.map((currentGroup, groupIndex) => {
          if (groupIndex !== location.groupIndex) return currentGroup;
          return {
            ...currentGroup,
            questions: currentGroup.questions.map((currentQuestion, questionIndex) => {
              if (questionIndex !== location.questionIndex) return currentQuestion;
              return {
                ...currentQuestion,
                question: replacement.question,
                questionHtml: replacement.questionHtml ?? null,
                difficulty: currentQuestion.difficulty,
                kind: currentQuestion.kind,
                subjectId: replacement.subjectId ?? currentQuestion.subjectId,
                chapterId: replacement.chapterId ?? currentQuestion.chapterId,
                topicId: replacement.topicId ?? currentQuestion.topicId,
                bankQuestionId: replacement.bankQuestionId ?? currentQuestion.bankQuestionId,
              };
            }),
          };
        }),
      };
    }),
  };
}
