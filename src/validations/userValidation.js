import { body } from 'express-validator';
import { User } from '../models/User.js';

export const updateProfileRules = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores and hyphens')
    .custom(async (value, { req }) => {
      const existingUser = await User.findOne({ username: value });
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        throw new Error('Username is already taken');
      }
      return true;
    }),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .custom(async (value, { req }) => {
      const existingUser = await User.findOne({ email: value });
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        throw new Error('Email is already registered');
      }
      return true;
    })
];

export const changePasswordRules = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];