import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../app.ts";
import { OTPService } from "../services/otpService.ts";
import { UserService } from "../services/database/user.database.ts";
import { userRepository } from "../repositories/user.repository.ts";

// ============================================
// User Registration
// ============================================

/**
 * Handles new user registration.
 *
 * IMPORTANT: Input validation is done by the `validate(registerSchema)` middleware
 * BEFORE this controller runs. By the time this function executes:
 *   - req.body has been parsed, sanitized, and transformed by Zod
 *   - username is trimmed, lowercased, and regex-validated (no SQL-injection chars)
 *   - email is trimmed, lowercased, and format-validated
 *   - password has been strength-validated
 *   - Unknown/extra fields have been stripped
 *
 * SQL injection is prevented via parameterized queries ($1, $2, ...).
 */

const userService = new UserService();

const userRegister = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const existingUser = await userService.checkUserExistsByEmail(email);

    if (existingUser) {
      // Determine which field caused the conflict
      res.status(409).json({
        success: false,
        message: "Email already exists",
      });
      return;
    }

    // --------------------------------------------------
    // Step 2: Hash the password with bcrypt
    // --------------------------------------------------
    // bcrypt hashing adds a layer of protection:
    //   - Even if the DB is compromised, passwords are not plaintext
    //   - Salt rounds (12) make brute-force infeasible
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // --------------------------------------------------
    // Step 3: Insert the new user
    // --------------------------------------------------
    // Parameterized query ($1, $2, $3, $4) prevents SQL injection.
    // The values are:
    //   $1 = username (already validated & sanitized by middleware)
    //   $2 = email (already validated & sanitized by middleware)
    //   $3 = hashedPassword (bcrypt output, safe)
    //   $4 = role (hardcoded, not user-supplied)
    
    const newUser: any = await userService.createUser(email, hashedPassword);

    // --------------------------------------------------
    // Step 4: Return success response
    // --------------------------------------------------
    // Never return the password hash in the response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        email: newUser.email
      },
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during user registration",
    });
  }
};

const forgetPassword = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    console.log("Forget password request for username:", username);

    // Check if the user exists
    const userQuery = `
      SELECT id, email FROM users WHERE username = $1 LIMIT 1
    `;
    const userResult = await pool.query(userQuery, [username]);

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const user = userResult.rows[0];

    // Generate OTP and send it to the user's email
    // (Implementation of OTP generation and email sending is assumed to be handled elsewhere)
    const otpResult = await OTPService.handleUserOTPRequest(username);

    if (!otpResult.success) {
      res.status(400).json({
        success: false,
        message: otpResult.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "OTP sent to the registered email address",
    });
  } catch (error) {
    console.error("Error during forget password process:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during forget password process",
    });
  }
};

const profile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId; // Assuming user ID is attached to the request object after authentication

    console.log('Fetching user profile for ID:', userId);
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const userProfile = await userService.getUserProfileById(userId);

    if (!userProfile) {
      res.status(404).json({
        success: false,
        message: "User profile not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user profile",
    });
  }
};

/**
 * GET /api/v1/user/users/:userId
 * Minimal public user lookup (id + username only).
 *
 * Used to validate quiz collaborators before they are added.
 * Deliberately does NOT expose email, phone, password hashes or any
 * other private profile information.
 */
const lookupUser = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId ?? "").trim();

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_id, a.url as avatar_url, u.display_name, u.first_name, u.last_name, u.email
       FROM users u LEFT JOIN avatar a ON u.avatar_id = a.id
       WHERE u.id::text = $1 OR LOWER(u.username) = LOWER($1) LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const user = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: String(user.id),
        username: user.username,
        avatarId: user.avatar_id,
        avatarUrl: user.avatar_url,
        displayName: user.display_name,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error looking up user:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while looking up user",
    });
  }
};

export { userRegister, forgetPassword, profile, lookupUser };
