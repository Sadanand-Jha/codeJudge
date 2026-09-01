import { QuizRepository } from "../../repositories/quiz.repository.ts";

export class QuizService {
  private repository: QuizRepository;

  constructor() {
    this.repository = new QuizRepository();
  }

  async getAllQuizzes(filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    visibility?: number;
    difficulty?: number;
    sortBy?: string;
    sortOrder?: string;
    userId?: number;
  }): Promise<{ quizzes: any[]; total: number }> {
    return this.repository.getAllQuizzes(filters);
  }

  async getQuizById(quizId: string): Promise<any | null> {
    return this.repository.getQuizById(quizId);
  }

  async getQuizByCode(code: string): Promise<any | null> {
    return this.repository.getQuizByCode(code);
  }

  async generateUniqueCode(): Promise<string> {
    return this.repository.generateUniqueCode();
  }

  async getQuizProblems(quizId: string): Promise<any[]> {
    return this.repository.getQuizProblems(quizId);
  }

  async getQuizProblemCount(quizId: string): Promise<number> {
    return this.repository.getQuizProblemCount(quizId);
  }

  async getQuizProblemById(problemId: number | string): Promise<any | null> {
    return this.repository.getQuizProblemById(problemId);
  }

  async getQuizProblemOptions(problemId: string): Promise<any[]> {
    return this.repository.getQuizProblemOptions(problemId);
  }

  async isUserRegistered(userId: string, quizId: string): Promise<boolean> {
    return this.repository.isUserRegistered(userId, quizId);
  }

  async registerUser(userId: string, quizId: string, rollno?: string): Promise<any> {
    return this.repository.registerUser(userId, quizId, rollno);
  }

  async getUserQuizzes(userId: string): Promise<any[]> {
    return this.repository.getUserQuizzes(userId);
  }

  async createQuiz(data: {
    name: string;
    code: string;
    createdby: number;
    starttime?: Date;
    visibility?: number;
    difficulty?: number;
    subjectId?: number;
    examId?: number;
    duration?: number;
    totalMarks?: number;
    passingMarks?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResultsImmediately?: boolean;
    negativeMarking?: boolean;
    leaderboard?: boolean;
    status?: string;
  }): Promise<any> {
    return this.repository.createQuiz(data);
  }

  async createQuizProblem(data: {
    quizId: number;
    problemStatement: string;
    problemDescription?: string;
    quizProblemType?: number;
    questionNumber?: number;
    explanation?: string;
    hint?: string;
    difficulty?: number;
    referenceNotes?: string;
    internalComments?: string;
  }): Promise<any> {
    return this.repository.createQuizProblem(data);
  }

  async createQuizProblemOption(data: {
    problemId: number;
    optionStatement: string;
    optionDescription?: string;
    isCorrect: boolean;
  }): Promise<any> {
    return this.repository.createQuizProblemOption(data);
  }

  async updateQuiz(quizId: number, data: any): Promise<any> {
    return this.repository.updateQuiz(quizId, data);
  }

  async deleteQuiz(quizId: number): Promise<boolean> {
    return this.repository.deleteQuiz(quizId);
  }

  async cloneQuiz(quizId: number, newName: string, newCode: string, createdBy: number): Promise<any> {
    return this.repository.cloneQuiz(quizId, newName, newCode, createdBy);
  }

  async updateQuizProblem(problemId: number, data: any): Promise<any> {
    return this.repository.updateQuizProblem(problemId, data);
  }

  async saveQuizProblemFull(data: any): Promise<any> {
    return this.repository.saveQuizProblemFull(data);
  }

  async deleteQuizProblem(problemId: number): Promise<boolean> {
    return this.repository.deleteQuizProblem(problemId);
  }

  async duplicateQuizProblem(problemId: number): Promise<any> {
    return this.repository.duplicateQuizProblem(problemId);
  }

  async reorderQuizProblems(quizId: number, problemIds: number[]): Promise<void> {
    return this.repository.reorderQuizProblems(quizId, problemIds);
  }

  async getQuizAttempt(userId: number, quizId: number): Promise<any | null> {
    return this.repository.getQuizAttempt(userId, quizId);
  }

  async createQuizAttempt(data: {
    userId: number;
    quizId: number;
    totalQuestions: number;
  }): Promise<any> {
    return this.repository.createQuizAttempt(data);
  }

  async updateQuizAttempt(attemptId: number, data: any): Promise<any> {
    return this.repository.updateQuizAttempt(attemptId, data);
  }

  async saveStudentResponse(data: {
    userId: number;
    problemId: number;
    option?: string;
    textAnswer?: string;
    timeTaken?: number;
  }): Promise<any> {
    return this.repository.saveStudentResponse(data);
  }

  async getStudentResponses(userId: number, quizId: number): Promise<any[]> {
    return this.repository.getStudentResponses(userId, quizId);
  }

  async getQuizLeaderboard(quizId: number): Promise<any[]> {
    return this.repository.getQuizLeaderboard(quizId);
  }

  async getQuizAnalytics(quizId: number): Promise<any> {
    return this.repository.getQuizAnalytics(quizId);
  }

  async checkQuizAccess(userId: number, quizId: number): Promise<{ allowed: boolean; reason?: string; attemptId?: number }> {
    return this.repository.checkQuizAccess(userId, quizId);
  }

  async getQuizByIdForAttempt(quizId: number): Promise<any | null> {
    return this.repository.getQuizByIdForAttempt(quizId);
  }

  async getPreviousQuizzes(userId: number, filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ quizzes: any[]; total: number }> {
    return this.repository.getPreviousQuizzes(userId, filters);
  }

  async getQuizResult(attemptId: number, userId: number): Promise<any | null> {
    return this.repository.getQuizResult(attemptId, userId);
  }

  async getQuestionWiseReview(attemptId: number, userId: number): Promise<any[]> {
    return this.repository.getQuestionWiseReview(attemptId, userId);
  }

  async getAllSubjects(search?: string): Promise<any[]> {
    return this.repository.getAllSubjects(search);
  }

  async getAllExamCategories(search?: string): Promise<any[]> {
    return this.repository.getAllExamCategories(search);
  }

  async isAcceptedCollaborator(userId: number, quizId: number): Promise<boolean> {
    return this.repository.isAcceptedCollaborator(userId, quizId);
  }

  async resolveUserId(identifier: string): Promise<number | null> {
    return this.repository.resolveUserId(identifier);
  }

  async getUserContactById(userId: number): Promise<any | null> {
    return this.repository.getUserContactById(userId);
  }

  async sendCollaboratorRequest(data: { quizId: number; userId: number; invitedBy: number }): Promise<any | null> {
    return this.repository.sendCollaboratorRequest(data);
  }

  async getCollaboratorRequests(quizId: number): Promise<any[]> {
    return this.repository.getCollaboratorRequests(quizId);
  }

  async getCollaboratorRequest(quizId: number, userId: number): Promise<any | null> {
    return this.repository.getCollaboratorRequest(quizId, userId);
  }

  async updateCollaboratorRequest(quizId: number, userId: number, status: "pending" | "accepted" | "rejected"): Promise<any | null> {
    return this.repository.updateCollaboratorRequest(quizId, userId, status);
  }

  async removeCollaborator(quizId: number, userId: number): Promise<boolean> {
    return this.repository.removeCollaborator(quizId, userId);
  }

  async getIncomingCollaboratorRequests(userId: number): Promise<any[]> {
    return this.repository.getIncomingCollaboratorRequests(userId);
  }

  async getQuizCollaborators(quizId: number): Promise<any[]> {
    return this.repository.getQuizCollaborators(quizId);
  }

  async getCollaborationProjects(userId: number): Promise<any[]> {
    return this.repository.getCollaborationProjects(userId);
  }

  async getQuizResponses(quizId: number): Promise<any> {
    return this.repository.getQuizResponses(quizId);
  }

  async getStudentAttemptDetails(quizId: number, userId: number): Promise<any | null> {
    return this.repository.getStudentAttemptDetails(quizId, userId);
  }

  async getStudentQuestionReview(attemptId: number): Promise<any[]> {
    return this.repository.getStudentQuestionReview(attemptId);
  }

  // ==================== QUIZ PARTICIPANTS (audience allow-list) ====================

  async replaceQuizParticipants(
    quizId: number,
    participants: Array<{
      email: string;
      name?: string | null;
      rollNumber?: string | null;
      source?: "room" | "individual";
      roomId?: number | null;
      allowed?: boolean;
    }>
  ): Promise<number> {
    return this.repository.replaceQuizParticipants(quizId, participants);
  }

  async getQuizParticipants(quizId: string | number): Promise<any[]> {
    return this.repository.getQuizParticipants(Number(quizId));
  }

  async getQuizGameConfig(quizId: number): Promise<any> {
    return this.repository.getQuizGameConfig(quizId);
  }

  async upsertQuizGameConfig(
    quizId: number,
    data: {
      enabled: boolean;
      movementEnabled: boolean;
      movementSpeed: number;
      lives: number;
      pointsEnabled: boolean;
      powerupsEnabled: boolean;
      respawnEnabled: boolean;
      damageEnabled: boolean;
    }
  ): Promise<any> {
    return this.repository.upsertQuizGameConfig(quizId, data);
  }

  getDefaultGameConfig(quizId: number): any {
    return this.repository.getDefaultGameConfig(quizId);
  }
}
