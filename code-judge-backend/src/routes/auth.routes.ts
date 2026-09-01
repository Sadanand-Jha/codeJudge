import { Router } from 'express';
import {
  sendOtpController,
  verifyOtpController,
  registerController,
  loginController,
  meController,
  logoutController,
  checkUsernameController,
} from '../controllers/auth.controller.js';

const router = Router();

/**
 * GET /api/auth/check-username?username=xxx
 * Returns whether the username is available
 */
router.get('/check-username', checkUsernameController);

/**
 * POST /api/auth/send-otp
 * Body: { "email": "user@example.com" }
 * Response: 200 OK on success
 */
router.post('/send-otp', sendOtpController);

/**
 * POST /api/auth/verify-otp
 * Body: { "email": "user@example.com", "otp": "123456" }
 * Response: { "registration_token": "..." } on success
 */
router.post('/verify-otp', verifyOtpController);

/**
 * POST /api/auth/register
 * Body: { "email": "user@example.com", "password": "SecurePassword123", "registration_token": "..." }
 * Response: 201 Created with user data and JWT session token set as cookie
 */
router.post('/register', registerController);

/**
 * POST /api/auth/login
 * Body: { "email": "user@example.com", "password": "SecurePassword123" }
 * Response: 200 OK with session_token cookie set on success
 */
router.post('/login', loginController);

/**
 * POST /api/auth/me
 * Body: { "session_token": "<jwt>" }
 * Verifies the session_token and returns the user's identity
 */
router.post('/me', meController);

/**
 * POST /api/auth/logout
 * Clears the session_token cookie and revokes the current JWT token
 */
router.post('/logout', logoutController);

export default router;
