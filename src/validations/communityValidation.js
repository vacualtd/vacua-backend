import { query, body } from 'express-validator';


export const createCommunityValidator = [
  body('name')
      .trim()
      .notEmpty()
      .withMessage('Community name is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Community name must be between 3 and 50 characters'),
  
  body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
];

export const createCommunityRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Community name is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('avatar')
    .optional()
    .isObject()
    .withMessage('Invalid avatar format')
];

export const updateCommunityRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('avatar')
    .optional()
    .isObject()
    .withMessage('Invalid avatar format')
];

export const memberManagementRules = [
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('At least one member ID is required')
    .custom((value) => {
      if (!value.every(id => typeof id === 'string')) {
        throw new Error('Invalid member ID format');
      }
      return true;
    })
];




export const communityQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'name', 'metadata.memberCount', 'metadata.messageCount'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  query('memberCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Member count must be a non-negative integer'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

export const handleJoinRequestRules = [
  body('status')
    .isIn(['accepted', 'rejected'])
    .withMessage('Invalid status')
];