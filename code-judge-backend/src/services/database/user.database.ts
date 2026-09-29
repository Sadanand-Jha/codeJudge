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

    async getUserByIdentifier(identifier: string): Promise<any> {
        return this.repository.getUserByIdentifier(identifier);
    }

    async createUser(email: string, password: string, username: string, avatarUrl: string): Promise<any> {
        const finalUsername = username || email.split('@')[0];
        return this.repository.createUser(email, password, finalUsername, avatarUrl);
    }

    async updatePasswordByEmail(email: string, hashedPassword: string): Promise<boolean> {
        return this.repository.updatePasswordByEmail(email, hashedPassword);
    }

    async getUserProfileById(userId: string): Promise<any> {
        return this.repository.getUserProfileById(userId);
    }
}   
