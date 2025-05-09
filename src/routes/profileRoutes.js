import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createStudentProfile, createLandlordProfile, updateProfileImage } from '../controllers/profileController.js';
import { 
  studentProfileRules, 
  landlordProfileRules,
  profileValidation 
} from '../validations/profileValidation.js';
import {
  getUserProfile,
  updateProfile,
  updatePrivacySettings,
  updateNotificationSettings,
  addContact,
  removeContact
} from '../controllers/userProfileController.js';
import {
  privacySettingsRules,
  notificationSettingsRules,
  contactManagementRules
} from '../validations/userProfileValidation.js';
import { handleSingleUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post(
  '/student',
  authenticateToken,
  studentProfileRules,
  validateRequest,
  createStudentProfile
);

router.post(
  '/landlord',
  authenticateToken,
  landlordProfileRules,
  validateRequest,
  createLandlordProfile
);

/**
 * @route GET /api/profile
 * @desc Get user's complete profile
 * @access Private
 */
router.get(
  '/',
  authenticateToken,
  getUserProfile
);

/**
 * @route PUT /api/profile
 * @desc Update user's profile information
 * @access Private
 */
router.put(
  '/updateprofile',
  authenticateToken,
  profileValidation.updateProfile,
  validateRequest,
  updateProfile
);


/**
 * @route PUT /api/profile/privacy
 * @desc Update privacy settings
 * @access Private
 */
router.put(
  '/privacy',
  authenticateToken,
  privacySettingsRules,
  validateRequest,
  updatePrivacySettings
);

/**
 * @route PUT /api/profile/notifications
 * @desc Update notification preferences
 * @access Private
 */
router.put(
  '/notifications',
  authenticateToken,
  notificationSettingsRules,
  validateRequest,
  updateNotificationSettings
);

/**
 * @route POST /api/profile/contacts
 * @desc Add a new contact
 * @access Private
 */
router.post(
  '/contacts',
  authenticateToken,
  contactManagementRules,
  validateRequest,
  addContact
);

/**
 * @route DELETE /api/profile/contacts/:contactId
 * @desc Remove a contact
 * @access Private
 */
router.delete(
  '/contacts/:contactId',
  authenticateToken,
  removeContact
);

/**
 * @route POST /api/profile/image
 * @desc Update user's profile image
 * @access Private
 */
router.post(
  '/updateprofile/image',
  authenticateToken,
  handleSingleUpload,
  updateProfileImage
);

export const profileRoutes = router;