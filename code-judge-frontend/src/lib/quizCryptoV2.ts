import {
  decryptJson,
  encryptJson,
  exportDekB64Url,
  generateDek,
  getSubtle,
  questionPayloadAad,
  toBufferSource,
  unwrapDek,
  utf8Encode,
  wrapDek,
  wrappedDekAad,
  type Envelope,
} from "@/lib/crypto";
import {
  CREATOR_DIFFICULTY_TO_BACKEND,
  CREATOR_TYPE_TO_BACKEND,
} from "@/utils/quizQuestionSync";
import type { CreatorQuestion } from "@/components/quiz/creator/types";
import type {
  SaveSecureContentInput,
  SecureProblemInput,
  SecureTeacherQuestion,
} from "@/services/quizCrypto";
import type { DecryptedQuizIndex } from "@/utils/decryptedQuizContent";

export interface SecurePayloadOption {
  content: string;
  contentHtml?: string;
  caption?: string;
  matchingTarget?: string;
  imageUrl?: string;
  isCorrect: boolean;
}

export interface SecureQuestionPayload {
  version: 1;
  type: CreatorQuestion["type"];
  title: string;
  topic: string;
  explanation: string;
  hint: string;
  solution?: string;
  correctAnswer: string | number | number[];
  marks: number;
  negativeMarks: number;
  difficulty: CreatorQuestion["difficulty"];
  expectedTime: number;
  bloomLevel: CreatorQuestion["bloomLevel"];
  tags: string[];
  visibility: CreatorQuestion["visibility"];
  status: CreatorQuestion["status"];
  required: boolean;
  options: SecurePayloadOption[];
  matchItems?: Array<{ content: string; imageUrl?: string }>;
  matchMatches?: Array<{ content: string; imageUrl?: string }>;
  matchMapping?: Record<string, string>;
  shuffleColumnA?: boolean;
  shuffleColumnB?: boolean;
  partialMarking?: boolean;
  interactionMode?: CreatorQuestion["interactionMode"];
  showCorrectAfterSubmit?: boolean;
  showExplanationAfterSubmit?: boolean;
  attachments?: CreatorQuestion["attachments"];
  images?: CreatorQuestion["images"];
}

function isChoiceType(type: CreatorQuestion["type"]): boolean {
  return (
    type === "single_choice" ||
    type === "multiple_choice" ||
    type === "true_false"
  );
}

function splitFillBlankAnswers(question: CreatorQuestion): string[] {
  const raw = String(question.correctAnswer ?? "").trim();
  if (!raw) return [];
  if (raw.includes("|")) {
    return raw.split("|").map((part) => part.trim()).filter(Boolean);
  }
  if (raw.includes(",") && raw.split(",").length > 1 && question.title.includes("___")) {
    return raw.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return [raw];
}

function buildPayloadOptions(question: CreatorQuestion): SecurePayloadOption[] {
  if (question.type === "match_following") {
    const left = question.matchItems ?? [];
    const right = question.matchMatches ?? [];
    const mapping = question.matchMapping ?? {};
    const rightById = new Map(right.map((item) => [item.id, item.content]));
    return left.map((item, index) => {
      const rightId = mapping[item.id] ?? right[index]?.id;
      const target = rightId
        ? rightById.get(rightId) ?? right[index]?.content ?? ""
        : right[index]?.content ?? "";
      return {
        content: item.content,
        matchingTarget: target,
        imageUrl: item.imageUrl,
        isCorrect: true,
      };
    });
  }
  if (question.type === "fill_blanks") {
    return splitFillBlankAnswers(question).map((answer) => ({
      content: "",
      matchingTarget: answer,
      isCorrect: true,
    }));
  }
  if (isChoiceType(question.type)) {
    return question.options
      .filter((option) => option.content.trim().length > 0)
      .map((option) => ({
        content: option.content,
        contentHtml: option.contentHtml,
        caption: option.caption,
        imageUrl: option.imageUrl,
        isCorrect: option.isCorrect,
      }));
  }
  const answer = String(question.correctAnswer ?? "").trim();
  return answer
    ? [{ content: answer, isCorrect: true }]
    : [];
}

export function normalizeAnswerText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function hashAnswerText(value: string): Promise<string> {
  const digest = await getSubtle().digest(
    "SHA-256",
    toBufferSource(utf8Encode(normalizeAnswerText(value)))
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toQuestionPayload(
  question: CreatorQuestion,
  options: SecurePayloadOption[]
): SecureQuestionPayload {
  return {
    version: 1,
    type: question.type,
    title: question.title,
    topic: question.topic,
    explanation: question.explanation,
    hint: question.hint,
    solution: question.solution,
    correctAnswer: question.correctAnswer,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    difficulty: question.difficulty,
    expectedTime: question.expectedTime,
    bloomLevel: question.bloomLevel,
    tags: question.tags,
    visibility: question.visibility,
    status: question.status,
    required: question.required,
    options,
    matchItems: question.matchItems?.map((item) => ({
      content: item.content,
      imageUrl: item.imageUrl,
    })),
    matchMatches: question.matchMatches?.map((item) => ({
      content: item.content,
      imageUrl: item.imageUrl,
    })),
    matchMapping: question.matchMapping,
    shuffleColumnA: question.shuffleColumnA,
    shuffleColumnB: question.shuffleColumnB,
    partialMarking: question.partialMarking,
    interactionMode: question.interactionMode,
    showCorrectAfterSubmit: question.showCorrectAfterSubmit,
    showExplanationAfterSubmit: question.showExplanationAfterSubmit,
    attachments: question.attachments,
    images: question.images,
  };
}

function stableAadId(question: CreatorQuestion): string {
  if (question.payloadAadId) return question.payloadAadId;
  if (question.serverId) return `srv_${question.serverId}`;
  const cleaned = question.id.replace(/[^A-Za-z0-9_-]/g, "_");
  return cleaned.length >= 8 ? cleaned.slice(0, 128) : `q_${cleaned}`.slice(0, 128);
}

async function buildSkeletonOptions(
  question: CreatorQuestion,
  options: SecurePayloadOption[]
): Promise<SecureProblemInput["options"]> {
  if (question.type === "fill_blanks" || question.type === "match_following") {
    return Promise.all(
      options.map(async (option) => ({
        isCorrect: true,
        answerHash: await hashAnswerText(
          option.matchingTarget ?? option.content
        ),
      }))
    );
  }
  if (isChoiceType(question.type)) {
    const visible = question.options.filter(
      (option) => option.content.trim().length > 0
    );
    return options.map((option, index) => {
      const existingId = visible[index]?.id;
      const serverId =
        existingId && /^\d+$/.test(existingId) ? Number(existingId) : undefined;
      return {
        isCorrect: option.isCorrect,
        ...(serverId ? { id: serverId } : {}),
      };
    });
  }
  return Promise.all(
    options.map(async (option) => ({
      isCorrect: true,
      answerHash: await hashAnswerText(option.content),
    }))
  );
}

export async function buildSecureProblems(
  quizId: string,
  questions: CreatorQuestion[],
  dek: CryptoKey
): Promise<SecureProblemInput[]> {
  const problems: SecureProblemInput[] = [];
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const payloadAadId = stableAadId(question);
    question.payloadAadId = payloadAadId;
    const options = buildPayloadOptions(question);
    const payload = toQuestionPayload(question, options);
    const payloadCt = await encryptJson(
      dek,
      payload,
      questionPayloadAad(quizId, payloadAadId)
    );
    problems.push({
      problemId: question.serverId,
      payloadAadId,
      payloadCt,
      quizProblemType: CREATOR_TYPE_TO_BACKEND[question.type],
      questionNumber: index + 1,
      marks: question.marks || undefined,
      negativeMarks: question.negativeMarks || undefined,
      difficulty: CREATOR_DIFFICULTY_TO_BACKEND[question.difficulty],
      options: await buildSkeletonOptions(question, options),
    });
  }
  return problems;
}

export interface EncryptedQuizQuestions {
  input: SaveSecureContentInput;
  dek: CryptoKey;
  wrappedDek: Envelope;
}

export async function encryptQuizQuestions(
  quizId: string,
  questions: CreatorQuestion[],
  kek: CryptoKey,
  existingWrappedDek?: Envelope | null
): Promise<EncryptedQuizQuestions> {
  let dek: CryptoKey;
  let wrappedDek: Envelope;
  if (existingWrappedDek) {
    dek = await unwrapDek(existingWrappedDek, kek, wrappedDekAad(quizId));
    wrappedDek = existingWrappedDek;
  } else {
    dek = await generateDek();
    wrappedDek = await wrapDek(dek, kek, wrappedDekAad(quizId));
  }
  const problems = await buildSecureProblems(quizId, questions, dek);
  return {
    input: {
      ...(existingWrappedDek ? {} : { wrappedDek }),
      problems,
    },
    dek,
    wrappedDek,
  };
}

export async function decryptTeacherQuestions(
  quizId: string,
  kek: CryptoKey,
  problems: SecureTeacherQuestion[],
  wrappedDek: Envelope | null
): Promise<Map<number, SecureQuestionPayload>> {
  if (!wrappedDek) return new Map();
  const dek = await unwrapDek(wrappedDek, kek, wrappedDekAad(quizId));
  const decrypted = new Map<number, SecureQuestionPayload>();
  for (const problem of problems) {
    if (!problem.payloadCt) continue;
    const payload = await decryptJson<SecureQuestionPayload>(
      dek,
      problem.payloadCt,
      questionPayloadAad(quizId, problem.payloadAadId)
    );
    decrypted.set(problem.problemId, payload);
  }
  return decrypted;
}

export async function decryptStudentProblems(
  quizId: string,
  dek: CryptoKey,
  problems: Array<{
    id: number;
    payloadAadId: string;
    payloadCt: Envelope;
  }>
): Promise<Map<number, SecureQuestionPayload>> {
  const decrypted = new Map<number, SecureQuestionPayload>();
  for (const problem of problems) {
    const payload = await decryptJson<SecureQuestionPayload>(
      dek,
      problem.payloadCt,
      questionPayloadAad(quizId, problem.payloadAadId)
    );
    decrypted.set(problem.id, payload);
  }
  return decrypted;
}

export function mergeSecureProblemRow<T extends object>(
  row: T,
  payload: SecureQuestionPayload,
  skeleton: SecureTeacherQuestion
): T {
  const options = skeleton.options.map((option, index) => {
    const source = payload.options[index];
    return {
      id: option.id,
      option_statement: source?.contentHtml?.trim() || source?.content || "",
      option_description: source?.caption ?? null,
      matching_target: source?.matchingTarget ?? null,
      iscorrect: option.isCorrect,
    };
  });
  return {
    ...row,
    problem_statement: payload.title,
    problem_description: payload.topic,
    explaination: payload.explanation,
    hint: payload.hint,
    options,
    payload_ct: null,
    payload_aad_id: skeleton.payloadAadId,
  } as T;
}

export async function exportShareDek(
  quizId: string,
  kek: CryptoKey,
  wrappedDek: Envelope
): Promise<string> {
  const dek = await unwrapDek(wrappedDek, kek, wrappedDekAad(quizId));
  return exportDekB64Url(dek);
}

export function buildSecureShareLink(quizCode: string, dekB64Url: string): string {
  const path = `/q/${encodeURIComponent(quizCode)}#${dekB64Url}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function readDekFromLocationHash(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.location.hash.replace(/^#/, "").trim();
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

export function clearDekFragment(): void {
  if (typeof window === "undefined") return;
  if (!window.location.hash) return;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`
  );
}

const DEK_SESSION_PREFIX = "quiz_dek_";

export function storeStudentDek(quizId: string | number, dekB64Url: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${DEK_SESSION_PREFIX}${quizId}`, dekB64Url);
  } catch {
    return;
  }
}

export function readStudentDek(quizId: string | number): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(`${DEK_SESSION_PREFIX}${quizId}`);
  } catch {
    return null;
  }
}

export function clearStudentDek(quizId: string | number): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${DEK_SESSION_PREFIX}${quizId}`);
  } catch {
    return;
  }
}

export function buildDecryptedIndexFromPayloads(
  problems: Array<{
    id: number;
    payload: SecureQuestionPayload;
    options: Array<{ id: number }>;
  }>
): DecryptedQuizIndex {
  const questions: DecryptedQuizIndex["questions"] = [];
  const byId = new Map<string, DecryptedQuizIndex["questions"][number]>();
  problems.forEach((problem, index) => {
    const key = String(problem.id);
    const options = problem.payload.options.map((option, optionIndex) => ({
      id:
        problem.options[optionIndex]?.id !== undefined
          ? String(problem.options[optionIndex].id)
          : `${key}:option:${optionIndex}`,
      content: option.content,
      contentHtml: option.contentHtml ?? "",
      caption: option.caption ?? "",
      isCorrect: option.isCorrect,
    }));
    const question: DecryptedQuizIndex["questions"][number] = {
      id: key,
      serverId: key,
      type: problem.payload.type,
      title: problem.payload.title,
      description: problem.payload.topic,
      explanation: problem.payload.explanation,
      hint: problem.payload.hint,
      options,
      correctAnswer: problem.payload.correctAnswer,
      raw: problem.payload as unknown as Record<string, unknown>,
    };
    questions.push(question);
    byId.set(key, question);
    byId.set(`#${index}`, question);
  });
  return { questions, byId, problemHtml: {} };
}
