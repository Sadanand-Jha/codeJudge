import { QuizRepository } from "../../repositories/quiz.repository.ts";

export class QuizService {
  private repository: QuizRepository;

  constructor() {
    this.repository = new QuizRepository();
  }

  async getAllQuizzes(): Promise<any[]> {
    return this.repository.getAllQuizzes();
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
  }): Promise<any> {
    return this.repository.createQuiz(data);
  }

  async createQuizProblem(data: {
    quizId: number;
    problemStatement: string;
    problemDescription?: string;
    quizProblemType?: number;
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
}