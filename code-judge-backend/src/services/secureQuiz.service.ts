import {
  SecureQuizRepository,
  type SecureQuizPayloadInput,
  type SecureQuizPayloadMetaRow,
  type SecureQuizPayloadRow,
} from "../repositories/secureQuiz.repository.ts";

export class SecureQuizService {
  private repository: SecureQuizRepository;

  constructor() {
    this.repository = new SecureQuizRepository();
  }

  async save(
    quizId: number,
    createdBy: number,
    input: SecureQuizPayloadInput
  ): Promise<SecureQuizPayloadMetaRow> {
    return this.repository.upsert(quizId, createdBy, input);
  }

  async get(quizId: number): Promise<SecureQuizPayloadRow | null> {
    return this.repository.getByQuizId(quizId);
  }

  async getMeta(quizId: number): Promise<SecureQuizPayloadMetaRow | null> {
    return this.repository.getMetaByQuizId(quizId);
  }

  async remove(quizId: number): Promise<boolean> {
    return this.repository.deleteByQuizId(quizId);
  }
}
