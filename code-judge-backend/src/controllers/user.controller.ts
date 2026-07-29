import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../app.ts";
import { OTPService } from "../services/otpService.ts";
import { UserService } from "../services/database/user.database.ts";

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

export { userRegister, forgetPassword };
