// Admin Quiz Service — business logic layer for the creator/admin quiz surface.
// Wraps AdminQuizRepository for all admin-specific operations.
import { AdminQuizRepository } from "../../repositories/adminQuiz.repository.ts";

export class AdminQuizService {
  private repository: AdminQuizRepository;

  constructor() {
    this.repository = new AdminQuizRepository();
  }

  async getAllQuizzes(filters: {
    page?: number; limit?: number; search?: string; status?: string;
    visibility?: number; difficulty?: number; sortBy?: string; sortOrder?: string; userId?: number;
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

  async createQuiz(data: {
    name: string; code: string; createdby: number; starttime?: Date;
    visibility?: number; difficulty?: number; subjectId?: number; examId?: number;
    duration?: number; totalMarks?: number; passingMarks?: number;
    shuffleQuestions?: boolean; shuffleOptions?: boolean;
    showResultsImmediately?: boolean; negativeMarking?: boolean;
    leaderboard?: boolean; status?: string;
  }): Promise<any> {
    return this.repository.createQuiz(data);
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

  // ==================== PROBLEMS ====================

  async getQuizProblems(quizId: string): Promise<any[]> {
    return this.repository.getQuizProblems(quizId);
  }

  async getQuizProblemById(problemId: number | string): Promise<any | null> {
    return this.repository.getQuizProblemById(problemId);
  }

  async getQuizProblemCount(quizId: string): Promise<number> {
    return this.repository.getQuizProblemCount(quizId);
  }

  async getQuizProblemOptions(problemId: string): Promise<any[]> {
    return this.repository.getQuizProblemOptions(problemId);
  }

  async createQuizProblem(data: {
    quizId: number; problemStatement: string; problemDescription?: string;
    quizProblemType?: number; questionNumber?: number; explanation?: string;
    hint?: string; difficulty?: number; referenceNotes?: string; internalComments?: string;
  }): Promise<any> {
    return this.repository.createQuizProblem(data);
  }

  async createQuizProblemOption(data: {
    problemId: number; optionStatement: string; optionDescription?: string;
    matchingTarget?: string | null; isCorrect: boolean;
  }): Promise<any> {
    return this.repository.createQuizProblemOption(data);
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

  async saveQuizProblemFull(data: any): Promise<any> {
    return this.repository.saveQuizProblemFull(data);
  }

  async reorderQuizProblems(quizId: number, problemIds: number[]): Promise<void> {
    return this.repository.reorderQuizProblems(quizId, problemIds);
  }

  // ==================== LOOKUPS ====================

  async getAllSubjects(search?: string): Promise<any[]> {
    return this.repository.getAllSubjects(search);
  }

  async getAllExamCategories(search?: string): Promise<any[]> {
    return this.repository.getAllExamCategories(search);
  }

  // ==================== COLLABORATORS ====================
  // NOTE: quiz_collaborator_request table does not exist yet.
  // All collaborator methods are temporarily disabled.

  // async isAcceptedCollaborator(userId: number, quizId: number): Promise<boolean> {
  //   return this.repository.isAcceptedCollaborator(userId, quizId);
  // }

  async resolveUserId(identifier: string): Promise<number | null> {
    return this.repository.resolveUserId(identifier);
  }

  async getUserContactById(userId: number): Promise<any | null> {
    return this.repository.getUserContactById(userId);
  }

  // async sendCollaboratorRequest(data: { quizId: number; userId: number; invitedBy: number }): Promise<any | null> {
  //   return this.repository.sendCollaboratorRequest(data);
  // }

  // async getCollaboratorRequests(quizId: number): Promise<any[]> {
  //   return this.repository.getCollaboratorRequests(quizId);
  // }

  // async getCollaboratorRequest(quizId: number, userId: number): Promise<any | null> {
  //   return this.repository.getCollaboratorRequest(quizId, userId);
  // }

  // async updateCollaboratorRequest(quizId: number, userId: number, status: "pending" | "accepted" | "rejected"): Promise<any | null> {
  //   return this.repository.updateCollaboratorRequest(quizId, userId, status);
  // }

  // async removeCollaborator(quizId: number, userId: number): Promise<boolean> {
  //   return this.repository.removeCollaborator(quizId, userId);
  // }

  // async getIncomingCollaboratorRequests(userId: number): Promise<any[]> {
  //   return this.repository.getIncomingCollaboratorRequests(userId);
  // }

  // async getQuizCollaborators(quizId: number): Promise<any[]> {
  //   return this.repository.getQuizCollaborators(quizId);
  // }

  // async getCollaborationProjects(userId: number): Promise<any[]> {
  //   return this.repository.getCollaborationProjects(userId);
  // }

  // ==================== RESPONSES / RESULTS ====================

  async getQuizResponses(quizId: number): Promise<any> {
    return this.repository.getQuizResponses(quizId);
  }

  async getStudentAttemptDetails(quizId: number, userId: number): Promise<any | null> {
    return this.repository.getStudentAttemptDetails(quizId, userId);
  }

  async getStudentQuestionReview(attemptId: number): Promise<any[]> {
    return this.repository.getStudentQuestionReview(attemptId);
  }

  // ==================== PARTICIPANTS ====================

  async replaceQuizParticipants(quizId: number, participants: any[]): Promise<number> {
    return this.repository.replaceQuizParticipants(quizId, participants);
  }

  async getQuizParticipants(quizId: string | number): Promise<any[]> {
    return this.repository.getQuizParticipants(Number(quizId));
  }

  // ==================== ANALYTICS ====================

  async getQuizAnalytics(quizId: number): Promise<any> {
    return this.repository.getQuizAnalytics(quizId);
  }

  // ==================== GAME CONFIG ====================

  async getQuizGameConfig(quizId: number): Promise<any> {
    return this.repository.getQuizGameConfig(quizId);
  }

  async upsertQuizGameConfig(quizId: number, data: {
    enabled: boolean; movementEnabled: boolean; movementSpeed: number;
    lives: number; pointsEnabled: boolean; powerupsEnabled: boolean;
    respawnEnabled: boolean; damageEnabled: boolean;
  }): Promise<any> {
    return this.repository.upsertQuizGameConfig(quizId, data);
  }

  async getAllGameMechanics(): Promise<any[]> {
    return this.repository.getAllGameMechanics();
  }

  async getQuizGameMechanics(quizId: number): Promise<any[]> {
    return this.repository.getQuizGameMechanics(quizId);
  }

  async upsertQuizGameMechanics(quizId: number, mechanics: { mechanicCode: string; enabled: boolean; quantity: number }[]): Promise<any[]> {
    return this.repository.upsertQuizGameMechanics(quizId, mechanics);
  }
}
