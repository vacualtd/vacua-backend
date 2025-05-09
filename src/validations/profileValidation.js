import { body } from 'express-validator';

export const studentProfileRules = [
  body('nationality').notEmpty().withMessage('Nationality is required'),
  body('universityName').notEmpty().withMessage('University/College name is required'),
  body('preferredLocation').notEmpty().withMessage('Preferred location is required'),
  body('matricNumber').optional().trim()
];

export const landlordProfileRules = [
  body('nationality')
    .notEmpty()
    .withMessage('Nationality is required')
    .trim(),
  
  body('preferredLocation')
    .notEmpty()
    .withMessage('Preferred location is required')
    .trim(),
  
  body('propertyLocation')
    .notEmpty()
    .withMessage('Property location is required')
    .trim()
];

// Profile validation rules
const updateProfile = [
  // Basic Info
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters'),
  
  body('username')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9_-]{3,20}$/)
    .withMessage('Username must be 3-20 characters and can only contain letters, numbers, underscores and hyphens'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),

  // Contact Info
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-]{8,}$/)
    .withMessage('Invalid phone number format'),

  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),

  // Avatar
  body('avatar')
    .optional()
    .isObject()
    .withMessage('Invalid avatar format')
    .custom((value) => {
      if (value && (!value.url || !value.key)) {
        throw new Error('Avatar must have url and key');
      }
      return true;
    }),

  // Preferences
  body('preferences.language')
    .optional()
    .isString()
    .withMessage('Invalid language selection'),

  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Invalid theme selection'),

  // Privacy Settings
  body('privacy.showLastSeen').optional().isBoolean(),
  body('privacy.showStatus').optional().isBoolean(),
  body('privacy.showProfilePhoto').optional().isBoolean(),
  body('privacy.showBio').optional().isBoolean(),

  // Notification Settings
  body('notifications.chat').optional().isBoolean(),
  body('notifications.calls').optional().isBoolean(),
  body('notifications.community').optional().isBoolean(),
  body('notifications.email').optional().isBoolean(),
  body('notifications.push').optional().isBoolean(),

  // Role-specific validations
  body('studentInfo.nationality').optional().isString(),
  body('studentInfo.universityName').optional().isString(),
  body('studentInfo.matricNumber').optional().isString(),
  body('studentInfo.preferredLocation').optional().isString(),
  body('studentInfo.yearOfStudy').optional().isInt({ min: 1 }),
  body('studentInfo.course').optional().isString(),

  body('landlordInfo.nationality').optional().isString(),
  body('landlordInfo.propertyLocation').optional().isArray(),
  body('landlordInfo.preferredLocation').optional().isString(),
  body('landlordInfo.businessName').optional().isString()
];

export const validateLandlordProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
    .withMessage('Invalid phone number format'),

  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Address must be between 5 and 100 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),

  body('zipCode')
    .optional()
    .trim()
    .matches(/^[0-9]{5}(-[0-9]{4})?$/)
    .withMessage('Invalid zip code format'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),

  body('socialLinks')
    .optional()
    .isObject()
    .withMessage('Social links must be an object'),

  body('businessHours')
    .optional()
    .isObject()
    .withMessage('Business hours must be an object'),

  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
];

export const profileValidation = {
  updateProfile
};