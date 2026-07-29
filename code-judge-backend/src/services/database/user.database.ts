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

    async getUserByEmail(email: string): Promise<any> {
        return this.repository.getUserByEmail(email);
    }

    async createUser(email: string, password: string): Promise<any> {
        // Generate username from email (everything before @)
        const username = email.split('@')[0];
        return this.repository.createUser(email, password, username);
    }

    async getUserProfileById(userId: string): Promise<any> {
        return this.repository.getUserProfileById(userId);
    }
}   
