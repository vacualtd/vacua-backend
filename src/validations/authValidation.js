import { body } from 'express-validator';

export const emailVerificationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['student', 'landlord', 'admin'])
    .withMessage('Role must be either student or landlord')
];

export const otpVerificationRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').notEmpty().isLength({ min: 5, max: 5 }).withMessage('Valid 5-digit OTP is required')
];


export const registrationRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be between 3-30 characters and can contain letters, numbers, underscores and hyphens'),
  body('password')
    .isLength({ min: 6 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/)
    .withMessage('Password must be at least 8 characters and contain at least one letter and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];


export const resendOTPRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];


export const forgotPasswordRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

export const verifyPasswordResetRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 5, max: 5 })
    .withMessage('OTP must be 5 digits')
    .matches(/^[0-9]+$/)
    .withMessage('OTP must contain only numbers')
];

export const resetPasswordRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 5, max: 5 })
    .withMessage('OTP must be 5 digits')
    .matches(/^[0-9]+$/)
    .withMessage('OTP must contain only numbers'),
  body('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

export const resendPasswordResetOTPRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];