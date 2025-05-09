import { body } from 'express-validator';


export const createPrivateChatValidator = [
  body('recipientId')
    .trim()
    .notEmpty()
    .withMessage('Recipient ID is required')
    .isMongoId()
    .withMessage('Invalid recipient ID format')
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
    .withMessage('Description must be less than 500 characters')
];

export const addMembersRules = [
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


