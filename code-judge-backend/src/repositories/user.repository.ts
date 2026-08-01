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

    async getUserInfo(userId: string): Promise<any> {
        // Fetch user with preferences in a single query
        // Note: The current users table schema only includes: id, AdminId, Username, Email, Password, Role, IsActive, LastLogin, CreatedAt, UpdatedAt
        // Additional profile fields (first_name, last_name, mobile, avatar_url, bio, rating, max_rating, is_verified)
        // and foreign keys (country_id, state_id, college_id, company_id) would need to be added to the schema
        const query = `
            SELECT
                u.id,
                u.AdminId,
                u.Username as username,
                u.Email as email,
                u.Role as role,
                u.IsActive as is_active,
                u.LastLogin as last_login,
                u.CreatedAt as created_at,
                u.UpdatedAt as updated_at,
                u.avatar,

                -- User preferences
                up.theme,
                up.accent_color,
                up.compact_mode,
                up.animation_speed,
                up.preferred_language,
                up.editor_theme,
                up.editor_font_size,
                up.tab_width,
                up.word_wrap,
                up.auto_save,
                up.vim_mode,
                up.emacs_mode

            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.id = $1
        `;

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0];

        // Format preferences with defaults
        const preferences = {
            theme: user.theme || 'system',
            accentColor: user.accent_color || 'blue',
            compactMode: user.compact_mode || false,
            animationSpeed: user.animation_speed || 'normal',
            preferredLanguage: user.preferred_language || 'cpp',
            editorTheme: user.editor_theme || 'one-dark',
            editorFontSize: user.editor_font_size || 14,
            tabWidth: user.tab_width || 4,
            wordWrap: user.word_wrap || false,
            autoSave: user.auto_save !== false,
            vimMode: user.vim_mode || false,
            emacsMode: user.emacs_mode || false,
        };

        return {
            ...user,
            preferences,
        };
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