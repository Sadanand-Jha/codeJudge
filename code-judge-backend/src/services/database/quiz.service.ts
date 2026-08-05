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

  async getQuizProblems(quizId: string): Promise<any[]> {
    return this.repository.getQuizProblems(quizId);
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
    endtime?: Date;
    visibility?: number;
    difficulty?: number;
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
}
