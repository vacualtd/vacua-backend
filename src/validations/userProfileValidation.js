import { body } from 'express-validator';

export const updateProfileRules = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  
  body('avatar')
    .optional()
    .isObject()
    .withMessage('Invalid avatar format')
];

export const privacySettingsRules = [
  body('showLastSeen')
    .optional()
    .isBoolean()
    .withMessage('Show last seen must be a boolean'),
  
  body('showStatus')
    .optional()
    .isBoolean()
    .withMessage('Show status must be a boolean')
];

export const notificationSettingsRules = [
  body('chat')
    .optional()
    .isBoolean()
    .withMessage('Chat notifications must be a boolean'),
  
  body('calls')
    .optional()
    .isBoolean()
    .withMessage('Call notifications must be a boolean'),
  
  body('community')
    .optional()
    .isBoolean()
    .withMessage('Community notifications must be a boolean')
];

export const contactManagementRules = [
  body('contactId')
    .notEmpty()
    .withMessage('Contact ID is required'),
  
  body('relationship')
    .optional()
    .isIn(['friend', 'blocked', 'muted'])
    .withMessage('Invalid relationship type')
];