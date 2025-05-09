import { body } from 'express-validator';

export const initiateCallRules = [
  body('type')
    .isIn(['audio', 'video'])
    .withMessage('Invalid call type'),
  
  body('participants')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required')
    .custom((value) => {
      if (!value.every(id => typeof id === 'string')) {
        throw new Error('Invalid participant ID format');
      }
      return true;
    }),
  
  body('roomId')
    .optional()
    .isString()
    .withMessage('Invalid room ID')
];