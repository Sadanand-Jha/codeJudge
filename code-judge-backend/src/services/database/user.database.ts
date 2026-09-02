// User business logic layer. Delegates to userRepository for user lookups, existence
// checks, registration, profile updates, and avatar management.
import { userRepository } from '../../repositories/user.repository.ts';

export class UserService {
    private repository: userRepository;

    constructor() {
        this.repository = new userRepository();
    }

    async getEmailByUsername(username: string): Promise<string | null> {
        return this.repository.getEmailByUsername(username);
    }

    async checkUserExistsByEmail(email: string): Promise<boolean> {
        return this.repository.checkUserExistsByEmail(email);
    }

    async checkUsernameExists(username: string): Promise<boolean> {
        return this.repository.checkUsernameExists(username);
    }

    async getUserByEmail(email: string): Promise<any> {
        return this.repository.getUserByEmail(email);
    }

    async createUser(email: string, password: string, username?: string): Promise<any> {
        const finalUsername = username || email.split('@')[0];
        return this.repository.createUser(email, password, finalUsername);
    }

    async getUserProfileById(userId: string): Promise<any> {
        return this.repository.getUserProfileById(userId);
    }
}   
