import { body } from 'express-validator';

export const loginRules = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required')
    .custom((value, { req }) => {
      const userType = req.body.userType;
      if (!userType) {
        throw new Error('User type is required');
      }
      
      if (userType === 'landlord') {
        if (!value.includes('@')) {
          throw new Error('Landlords must login with email');
        }
      } else if (userType === 'student') {
        if (value.includes('@')) {
          throw new Error('Students must login with username');
        }
      } else {
        throw new Error('Invalid user type');
      }
      return true;
    }),
  body('userType')
    .notEmpty()
    .withMessage('User type is required')
    .isIn(['student', 'landlord'])
    .withMessage('Invalid user type'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];