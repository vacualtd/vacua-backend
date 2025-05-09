import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';

export const validateVerificationRequest = [
  body('governmentIdType')
    .isIn(['passport', 'drivers_license', 'national_id'])
    .withMessage('Invalid government ID type'),

  body('governmentIdNumber')
    .notEmpty()
    .withMessage('Government ID number is required')
    .isString()
    .withMessage('Government ID number must be a string')
    .trim(),

  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s-]+$/)
    .withMessage('Invalid phone number format'),

  validateRequest
];
