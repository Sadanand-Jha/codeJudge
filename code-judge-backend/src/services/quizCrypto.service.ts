import {
  QuizCryptoRepository,
  type Envelope,
  type KekConfig,
  type SavedSecureQuestion,
  type SecureQuestionRow,
  type SecureQuizContentInput,
} from "../repositories/quizCrypto.repository.ts";

export class QuizNotFoundError extends Error {
  constructor() {
    super("Quiz not found");
    this.name = "QuizNotFoundError";
  }
}

export class QuizEncryptedError extends Error {
  readonly code = "QUIZ_ENCRYPTED";

  constructor() {
    super(
      "This quiz is end-to-end encrypted. Edit its questions through the encrypted content endpoint."
    );
    this.name = "QuizEncryptedError";
  }
}

export class QuizCryptoInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizCryptoInputError";
  }
}

export interface TeacherContent {
  configured: boolean;
  cryptoVersion: number;
  wrappedDek: Envelope | null;
  problems: SecureQuestionRow[];
}

export interface StudentProblem {
  id: number;
  payloadAadId: string;
  payloadCt: Envelope;
  quizProblemType: number | null;
  questionNumber: number | null;
  marks: number | null;
  negativeMarks: number | null;
  difficulty: number | null;
  options: Array<{ id: number; authoredIndex: number }>;
}

export class QuizCryptoService {
  private repository: QuizCryptoRepository;

  constructor() {
    this.repository = new QuizCryptoRepository();
  }

  async getKekConfig(userId: number): Promise<KekConfig | null> {
    return this.repository.getKekConfig(userId);
  }

  async saveKekConfig(userId: number, config: KekConfig): Promise<KekConfig> {
    return this.repository.saveKekConfig(userId, config);
  }

  async getTeacherContent(quizId: number): Promise<TeacherContent> {
    const meta = await this.repository.getQuizCryptoMeta(quizId);
    if (!meta) throw new QuizNotFoundError();
    if (Number(meta.cryptoVersion) !== 1) {
      return {
        configured: false,
        cryptoVersion: Number(meta.cryptoVersion) || 0,
        wrappedDek: null,
        problems: [],
      };
    }
    const problems = await this.repository.getSecureContent(quizId);
    return {
      configured: true,
      cryptoVersion: 1,
      wrappedDek: meta.wrappedDek ?? null,
      problems,
    };
  }

  async saveTeacherContent(
    quizId: number,
    userId: number,
    input: SecureQuizContentInput
  ): Promise<{ cryptoVersion: number; problems: SavedSecureQuestion[] }> {
    const meta = await this.repository.getQuizCryptoMeta(quizId);
    if (!meta) throw new QuizNotFoundError();
    if (Number(meta.cryptoVersion) !== 1 && !input.wrappedDek) {
      throw new QuizCryptoInputError(
        "wrappedDek is required when encrypting a quiz for the first time"
      );
    }
    const result = await this.repository.replaceSecureContent(
      quizId,
      userId,
      input
    );
    return result;
  }

  async getStudentContent(quizId: number): Promise<{
    configured: boolean;
    cryptoVersion: number;
    problems: StudentProblem[];
  }> {
    const meta = await this.repository.getQuizCryptoMeta(quizId);
    if (!meta) throw new QuizNotFoundError();
    if (Number(meta.cryptoVersion) !== 1) {
      return { configured: false, cryptoVersion: 0, problems: [] };
    }
    const rows = await this.repository.getSecureContent(quizId);
    const problems: StudentProblem[] = [];
    for (const row of rows) {
      if (!row.payloadCt) continue;
      problems.push({
        id: row.problemId,
        payloadAadId: row.payloadAadId,
        payloadCt: row.payloadCt,
        quizProblemType: row.quizProblemType,
        questionNumber: row.questionNumber,
        marks: row.marks,
        negativeMarks: row.negativeMarks,
        difficulty: row.difficulty,
        options: row.options.map((option) => ({
          id: option.id,
          authoredIndex: option.sortOrder,
        })),
      });
    }
    return { configured: true, cryptoVersion: 1, problems };
  }

  async assertPlaintextWriteAllowed(quizId: number | string): Promise<void> {
    const meta = await this.repository.getQuizCryptoMeta(Number(quizId));
    if (meta && Number(meta.cryptoVersion) === 1) {
      throw new QuizEncryptedError();
    }
  }

  async isEncrypted(quizId: number | string): Promise<boolean> {
    const meta = await this.repository.getQuizCryptoMeta(Number(quizId));
    return Boolean(meta && Number(meta.cryptoVersion) === 1);
  }
}
