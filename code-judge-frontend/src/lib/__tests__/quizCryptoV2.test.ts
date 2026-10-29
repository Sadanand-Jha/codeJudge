import assert from "node:assert/strict";
import {
  buildDecryptedIndexFromPayloads,
  buildSecureProblems,
  decryptStudentProblems,
  hashAnswerText,
} from "../quizCryptoV2";
import { generateDek } from "../crypto";
import type { CreatorQuestion } from "@/components/quiz/creator/types";

function makeQuestion(overrides: Partial<CreatorQuestion>): CreatorQuestion {
  return {
    id: "q_test",
    type: "single_choice",
    title: "Private question",
    options: [],
    correctAnswer: "",
    explanation: "Private explanation",
    hint: "Private hint",
    marks: 5,
    negativeMarks: 0,
    difficulty: "Medium",
    expectedTime: 2,
    topic: "Private topic",
    bloomLevel: "Understand",
    tags: [],
    visibility: "visible",
    status: "published",
    required: true,
    attachments: [],
    images: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

async function main() {
  assert.equal(
    await hashAnswerText("  New   Delhi "),
    await hashAnswerText("new delhi")
  );

  const choice = makeQuestion({
    id: "q_choice",
    serverId: 500,
    title: "<p>Capital of India?</p>",
    options: [
      { id: "10", label: "A", content: "Mumbai", isCorrect: false },
      { id: "11", label: "B", content: "New Delhi", isCorrect: true },
    ],
    correctAnswer: "11",
  });
  const fill = makeQuestion({
    id: "q_fill",
    serverId: 501,
    type: "fill_blanks",
    title: "Capital of India is ___.",
    options: [{ id: "q_fill_answer", label: "A", content: "", isCorrect: true }],
    correctAnswer: "New Delhi",
  });

  const dek = await generateDek();
  const problems = await buildSecureProblems(
    "42",
    [choice, fill],
    dek
  );

  assert.equal(problems.length, 2);
  assert.equal(JSON.stringify(problems).includes("Capital of India"), false);
  assert.equal(JSON.stringify(problems).includes("New Delhi"), false);
  assert.equal(problems[0].options[0].id, 10);
  assert.equal(problems[0].options[1].id, 11);
  assert.equal(
    problems[1].options[0].answerHash,
    await hashAnswerText("New Delhi")
  );

  const decrypted = await decryptStudentProblems(
    "42",
    dek,
    problems.map((problem, index) => ({
      id: 500 + index,
      payloadAadId: problem.payloadAadId,
      payloadCt: problem.payloadCt,
    }))
  );
  const choicePayload = decrypted.get(500);
  const fillPayload = decrypted.get(501);
  assert.equal(choicePayload?.title, "<p>Capital of India?</p>");
  assert.equal(choicePayload?.options[1].content, "New Delhi");
  assert.equal(choicePayload?.correctAnswer, "11");
  assert.equal(fillPayload?.type, "fill_blanks");
  assert.equal(fillPayload?.correctAnswer, "New Delhi");

  const index = buildDecryptedIndexFromPayloads([
    {
      id: 500,
      payload: choicePayload!,
      options: [{ id: 10 }, { id: 11 }],
    },
  ]);
  assert.equal(index.byId.get("500")?.options[1].id, "11");
  assert.equal(index.byId.get("500")?.options[1].content, "New Delhi");
  assert.equal(index.questions[0].title, "<p>Capital of India?</p>");

  await assert.rejects(
    () =>
      decryptStudentProblems("43", dek, [
        {
          id: 500,
          payloadAadId: problems[0].payloadAadId,
          payloadCt: problems[0].payloadCt,
        },
      ]),
    /DECRYPT|decrypt/
  );

  console.log("quizCryptoV2 tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
