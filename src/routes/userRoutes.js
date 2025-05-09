import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getProfile, updateProfile, changePassword, requestAccountDeletion, cancelAccountDeletion, deactivateAccount, reactivateAccount } from '../controllers/userController.js';
import { updateProfileRules, changePasswordRules } from '../validations/userValidation.js';

const router = express.Router();

/**
 * @route GET /api/user/profile
 * @desc Get complete user profile including role-specific data
 * @access Private
 * @header Authorization - Bearer token
 * @returns {object} User profile data including role-specific profile
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route PUT /api/user/profile
 * @desc Update user profile information
 * @access Private
 * @header Authorization - Bearer token
 * @body {string} [username] - New username (3-30 chars, alphanumeric with _ -)
 * @body {string} [email] - New email address
 * @returns {object} Updated user data
 */
router.put('/profile', authenticateToken, updateProfileRules, validateRequest, updateProfile);

/**
 * @route POST /api/user/change-password
 * @desc Change user's password
 * @access Private
 */
router.post(
  '/change-password',
  authenticateToken,
  changePasswordRules,
  validateRequest,
  changePassword
);

/**
 * @route POST /api/user/account/delete
 * @desc Request account deletion
 * @access Private
 */
router.post(
  '/account/delete',
  authenticateToken,
  validateRequest,
  requestAccountDeletion
);

/**
 * @route POST /api/user/account/delete/cancel
 * @desc Cancel account deletion
 * @access Private
 */
router.post(
  '/account/delete/cancel',
  authenticateToken,
  validateRequest,
  cancelAccountDeletion
);

/**
 * @route POST /api/user/account/deactivate
 * @desc Deactivate account
 * @access Private
 */
router.post(
  '/account/deactivate',
  authenticateToken,
  validateRequest,
  deactivateAccount
);

/**
 * @route POST /api/user/account/reactivate
 * @desc Reactivate account
 * @access Private
 */
router.post(
  '/account/reactivate',
  authenticateToken,
  validateRequest,
  reactivateAccount
);

export const userRoutes = router;