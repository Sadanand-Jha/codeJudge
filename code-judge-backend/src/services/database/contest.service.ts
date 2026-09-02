// Contest business logic layer. Delegates to ContestRepository for listing, fetching,
// checking registration, and registering users for contests.
import { ContestRepository } from "../../repositories/contest.repository.ts";

export class ContestService {
  private repository: ContestRepository;

  constructor() {
    this.repository = new ContestRepository();
  }

  async getAllContests(): Promise<any[]> {
    return this.repository.getAllContests();
  }

  async getContestById(contestId: string): Promise<any | null> {
    return this.repository.getContestById(contestId);
  }

  async getContestProblems(contestId: string): Promise<any[]> {
    return this.repository.getContestProblems(contestId);
  }

  async isUserRegistered(userId: string): Promise<boolean> {
    return this.repository.isUserRegistered(userId);
  }

  async registerUser(userId: string, rated: boolean = false): Promise<any> {
    return this.repository.registerUser(userId, rated);
  }

  async getUserContests(userId: string): Promise<any[]> {
    return this.repository.getUserContests(userId);
  }
}