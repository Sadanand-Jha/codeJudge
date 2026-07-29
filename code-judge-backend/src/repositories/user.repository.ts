import { pool } from "./../app.ts";

export class userRepository {
    async getEmailByUsername(username: string): Promise<string | null> {
        const query = `
            select email from users where username = $1
        `;
        const result = await pool.query(query, [username]);
        if (result.rows.length > 0) {
            return result.rows[0].email;
        }
        return null;
    }
    
    async checkUserExistsByEmail(email: string): Promise<boolean> {
        const query = `
            select 1 from users where email = $1 limit 1
        `;
        const result = await pool.query(query, [email]);
        return result.rows.length > 0;
    }

    async getUserByEmail(email: string): Promise<any> {
        const query = `
            SELECT * FROM users WHERE email = $1 LIMIT 1
        `;
        const result = await pool.query(query, [email]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async getUserProfileById(userId: string): Promise<any> {
        const query = `
            SELECT id, AdminId, Username, Email, Role, CreatedAt, UpdatedAt
            FROM users
            WHERE id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async createUser(email: string, password: string, username: string): Promise<any> {
        // Get the current maximum AdminId and increment by 1
        const maxQuery = `
            SELECT COALESCE(MAX(CAST(AdminId AS INTEGER)), 0) AS max_admin_id
            FROM users
        `;
        const maxResult = await pool.query(maxQuery);
        const nextAdminId = String((maxResult.rows[0].max_admin_id || 0) + 1);

        const query = `
            INSERT INTO users (AdminId, Username, Email, Password)
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const result = await pool.query(query, [nextAdminId, username, email, password]);
        return result.rows[0];
    }
}