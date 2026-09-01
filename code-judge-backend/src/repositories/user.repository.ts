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

    async checkUsernameExists(username: string): Promise<boolean> {
        const query = `
            SELECT 1 FROM users WHERE username = $1 LIMIT 1
        `;
        const result = await pool.query(query, [username]);
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
            SELECT
                u.id,
                u.Username,
                u.Email,
                u.display_name, 
                u.Role_ID, 
                r.name AS role_name,
                a.url AS avatar_url,
                a.is_male AS avatar_is_male,
                u.CreatedAt, 
                u.UpdatedAt
            FROM users u
            LEFT JOIN role r ON u.Role_ID = r.id
            LEFT JOIN avatar a ON u.avatar_id = a.id
            WHERE u.id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async getUserInfo(userId: string): Promise<any> {
        const query = `
            SELECT
                u.id,
                u.Username as username,
                u.Email as email,
                u.role_id as role,
                r.name AS role_name,
                u.IsActive as is_active,
                u.LastLogin as last_login,
                u.CreatedAt as created_at,
                u.UpdatedAt as updated_at,
                u.avatar_id,
                a.url AS avatar_url,
                a.is_male AS avatar_is_male,
                u.first_name,
                u.last_name,
                u.display_name as display_name,
                u.mobile,
                u.bio,
                u.rating,
                u.max_rating,
                u.is_verified,
                u.country_id,
                cn.name AS country_name,
                u.state_id,
                s.name AS state_name,
                u.college_id,
                c.name AS college_name,
                u.company_id,
                --// co.name AS company_name,

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
            LEFT JOIN role r ON u.role_id = r.id
            LEFT JOIN avatar a ON u.avatar_id = a.id
            LEFT JOIN user_preferences up ON u.id = up.user_id
            LEFT JOIN college c ON u.college_id = c.id
            --// LEFT JOIN company co ON u.company_id = co.id
            LEFT JOIN country cn ON u.country_id = cn.id
            LEFT JOIN state s ON u.state_id = s.id
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
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role_name || null,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            displayName: user.display_name || null,
            mobile: user.mobile || null,
            avatarUrl: user.avatar_url || null,
            avatarIsMale: user.avatar_is_male ?? null,
            bio: user.bio || null,
            country: user.country_name || null,
            state: user.state_name || null,
            college: user.college_name || null,
            company: user.company_name || null,
            rating: user.rating || 0,
            maxRating: user.max_rating || 0,
            isVerified: user.is_verified || false,
            isActive: user.is_active ?? true,
            lastLogin: user.last_login || null,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            preferences,
        };
    }

    async createUser(email: string, password: string, username: string): Promise<any> {
        const query = `
            INSERT INTO users (Username, Email, Password, role_id, avatar_id)
            VALUES ($1, $2, $3, 1, 85) RETURNING *
        `;
        const result = await pool.query(query, [username, email, password]);
        return result.rows[0];
    }
}