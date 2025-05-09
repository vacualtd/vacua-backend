import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { 
  initiateEmailVerification, 
  verifyOTP,
  completeRegistration ,
  resendOTP ,
  forgotPassword,
  verifyPasswordResetOTP,
  resetPassword,
  resendPasswordResetOTP
} from '../controllers/authController.js';
import { 
  emailVerificationRules, 
  otpVerificationRules,
  registrationRules ,
  resendOTPRules ,
  forgotPasswordRules,
  verifyPasswordResetRules,
  resetPasswordRules,
  resendPasswordResetOTPRules
} from '../validations/authValidation.js';

const router = express.Router();

/**
 * @route POST /api/auth/verify-email
 * @desc Initiates email verification by sending a 5-digit OTP
 * @access Public
 * @body {string} email - User's email address
 * @body {string} role - User role (student/landlord)
 * @returns {object} Success message and user verification status
 */
router.post(
  '/verify-email',
  emailVerificationRules,
  validateRequest,
  initiateEmailVerification
);

/**
 * @route POST /api/auth/verify-otp
 * @desc Verifies the OTP sent to user's email
 * @access Public
 * @body {string} email - User's email address
 * @body {string} otp - 5-digit OTP received in email
 * @returns {object} Success message and verification status
 */
// Step 2: Verify OTP
router.post(
  '/verify-otp',
  otpVerificationRules,
  validateRequest,
  verifyOTP
);

/**
 * @route POST /api/auth/register
 * @desc Completes user registration after email verification
 * @access Public
 * @body {string} email - Verified email address
 * @body {string} username - Unique username
 * @body {string} password - User password (min 8 characters)
 * @returns {object} JWT token and user data
 */
// // Step 3: Complete registration
router.post(
  '/register',
  registrationRules,
  validateRequest,
  completeRegistration
);


/**
 * @route POST /api/auth/resend-otp
 * @desc Generates and sends a new 5-digit OTP
 * @access Public
 * @body {string} email - User's email address
 * @returns {object} Success message
 */
// Resend OTP route
router.post(
  '/resend-otp',
  resendOTPRules,
  validateRequest,
  resendOTP
);


/**
 * @route POST /api/password/forgot
 * @desc Request password reset by sending OTP to email
 * @access Public
 * @body {string} email - User's email address
 * @returns {object} Success message
 */
router.post(
  '/forgot',
  forgotPasswordRules,
  validateRequest,
  forgotPassword
);

/**
 * @route POST /api/password/verify-reset-otp
 * @desc Verify OTP for password reset
 * @access Public
 * @body {string} email - User's email address
 * @body {string} otp - 5-digit OTP received in email
 * @returns {object} Success message and reset token
 */
router.post(
  '/verify-reset-otp',
  verifyPasswordResetRules,
  validateRequest,
  verifyPasswordResetOTP
);

/**
 * @route POST /api/password/reset
 * @desc Reset password using verified OTP
 * @access Public
 * @body {string} email - User's email address
 * @body {string} otp - Verified OTP
 * @body {string} newPassword - New password
 * @returns {object} Success message
 */
router.post(
  '/reset',
  resetPasswordRules,
  validateRequest,
  resetPassword
);

/**
 * @route POST /api/auth/resend-password-reset-otp
 * @desc Resend password reset OTP
 * @access Public
 */
router.post(
  '/resend-password-reset-otp',
  resendPasswordResetOTPRules,
  validateRequest,
  resendPasswordResetOTP
);

export const authRoutes = router;