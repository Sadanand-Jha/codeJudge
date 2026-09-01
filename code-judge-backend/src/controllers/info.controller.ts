import type { Request, Response } from "express";
import { userRepository } from "../repositories/user.repository.ts";

// Use an instance of the repository class
const userRepo = new userRepository();

/**
 * GET /api/v1/user/info
 * Returns the authenticated user's profile information.
 *
 * NOTE: This controller uses raw SQL queries via the pg library,
 * following the existing project pattern. Prisma is not used in this project.
 *
 * Database schema notes:
 * - The users table currently has: id, Username, Email, Password, Role, IsActive, LastLogin, CreatedAt, UpdatedAt
 * - Foreign key columns (country_id, state_id, college_id, company_id) are NOT present in the current schema
 * - User preferences are stored in the user_preferences table
 *
 * To add support for country, state, college, and company:
 * 1. Add foreign key columns to the users table:
 *    - country_id INTEGER REFERENCES countries(id)
 *    - state_id INTEGER REFERENCES states(id)
 *    - college_id INTEGER REFERENCES colleges(id)
 *    - company_id INTEGER REFERENCES companies(id)
 * 2. Create the referenced tables (countries, states, colleges, companies)
 * 3. Update the query below to JOIN these tables
 */

const getUserInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    // Fetch user with preferences
    // Note: country, state, college, company relations are not yet implemented
    // as the foreign key columns don't exist in the current schema
    const userInfo = await userRepo.getUserInfo(userId);

    if (!userInfo) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Format the response to match the expected frontend structure
    const formattedResponse = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      // Additional profile fields will be available once the schema is updated
      firstName: null,
      lastName: null,
      mobile: null,
      avatarUrl: null,
      bio: null,

      // These will be populated when foreign key columns are added to the users table
      // country: { id, name }
      // state: { id, name }
      // college: { id, name }
      // company: { id, name }
      country: null,
      state: null,
      college: null,
      company: null,

      rating: 0, // Not in current schema
      maxRating: 0, // Not in current schema
      role: userInfo.role || "USER",
      isVerified: false, // Not in current schema
      isActive: userInfo.is_active !== undefined ? userInfo.is_active : true,
      lastLogin: userInfo.last_login || null,

      preferences: userInfo.preferences || {
        theme: "system",
        accentColor: "blue",
        compactMode: false,
        animationSpeed: "normal",
        preferredLanguage: "cpp",
        editorTheme: "one-dark",
        editorFontSize: 14,
        tabWidth: 4,
        wordWrap: false,
        autoSave: true,
        vimMode: false,
        emacsMode: false,
      },
    };

    res.status(200).json({
      success: true,
      data: formattedResponse,
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user info",
    });
  }
};

export { getUserInfo };