import assert from "node:assert/strict";
import type { QuestionPaper } from "@/components/creator/tests/sections/paperTypes";
import {
  buildRegenerateQuestionPayload,
  replacePaperQuestion,
} from "@/components/creator/tests/sections/questionRegeneration";

const paper: QuestionPaper = {
  title: "Operating Systems",
  instructions: "",
  syllabus: "",
  totalQuestions: 3,
  totalMarks: 15,
  sections: [
    {
      order: 1,
      label: "A",
      name: "Short Answers",
      title: "",
      instructions: "",
      totalQuestions: 2,
      totalAvailableMarks: 10,
      sectionMarks: 10,
      questionGroups: [
        {
          name: "Concepts",
          type: "SHORT_ANSWER",
          marksPerQuestion: 5,
          attemptRule: { type: "ALL", count: null },
          questions: [
            { num: 1, question: "Explain virtual memory.", difficulty: "hard", kind: "Theory", marks: 5 },
            { num: 2, question: "Define a semaphore.", difficulty: "easy", kind: "Theory", marks: 5 },
          ],
        },
      ],
    },
    {
      order: 2,
      label: "B",
      name: "Numericals",
      title: "",
      instructions: "",
      totalQuestions: 1,
      totalAvailableMarks: 5,
      sectionMarks: 5,
      questionGroups: [
        {
          name: "Scheduling",
          type: "NUMERICAL",
          marksPerQuestion: 5,
          attemptRule: { type: "ALL", count: null },
          questions: [
            { num: 3, question: "Calculate average waiting time.", difficulty: "medium", kind: "Numerical", marks: 5 },
          ],
        },
      ],
    },
  ],
};

const payload = buildRegenerateQuestionPayload(
  paper,
  { sectionIndex: 0, groupIndex: 0, questionIndex: 0 },
  { subjectId: 7, chapterIds: [11], topicIds: [21], syllabus: "Deadlocks and memory" },
  "Focus on a numerical problem about page faults."
);

assert.equal(payload.numberOfQuestions, 1);
assert.equal(payload.hardCount, 1);
assert.equal(payload.easyCount, 0);
assert.equal(payload.mediumCount, 0);
assert.equal(payload.theoryCount, 1);
assert.equal(payload.numericalCount, 0);
assert.equal(payload.subjectId, 7);
assert.deepEqual(payload.chapterIds, [11]);
assert.deepEqual(payload.topicIds, [21]);
assert.equal(payload.saveToBank, true);
assert.match(payload.context ?? "", /hard difficulty/);
assert.match(payload.context ?? "", /5 marks/);
assert.match(payload.context ?? "", /teacher specifically wants: Focus on a numerical problem about page faults/);
assert.deepEqual(payload.avoidQuestions, [
  "Explain virtual memory.",
  "Define a semaphore.",
  "Calculate average waiting time.",
]);

const updated = replacePaperQuestion(
  paper,
  { sectionIndex: 0, groupIndex: 0, questionIndex: 0 },
  {
    num: 1,
    question: "Compare paging and segmentation.",
    questionHtml: "<p>Compare paging and segmentation.</p>",
    difficulty: "easy",
    kind: "Numerical",
    chapterId: 12,
    topicId: 22,
    bankQuestionId: 99,
  }
);

const replaced = updated.sections[0].questionGroups[0].questions[0];
assert.equal(replaced.question, "Compare paging and segmentation.");
assert.equal(replaced.questionHtml, "<p>Compare paging and segmentation.</p>");
assert.equal(replaced.difficulty, "hard");
assert.equal(replaced.kind, "Theory");
assert.equal(replaced.marks, 5);
assert.equal(replaced.num, 1);
assert.equal(replaced.chapterId, 12);
assert.equal(replaced.topicId, 22);
assert.equal(replaced.bankQuestionId, 99);
assert.equal(updated.sections[0].questionGroups[0].questions[1], paper.sections[0].questionGroups[0].questions[1]);
assert.equal(updated.sections[1], paper.sections[1]);
assert.equal(updated.totalQuestions, paper.totalQuestions);
assert.equal(updated.totalMarks, paper.totalMarks);

console.log("Paper question regeneration tests passed.");
