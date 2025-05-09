import { body } from 'express-validator';

export const adminLoginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];


// Add these marketplace validations to the existing adminValidation.js

export const updateListingStatusRules = [
    body('status')
      .isIn(['active', 'sold', 'cancelled', 'deleted'])
      .withMessage('Invalid listing status')
  ];


  export const updatePropertyStatusRules = [
    body('status')
      .isIn(['draft', 'published', 'archived', 'deleted'])
      .withMessage('Invalid property status')
  ];
  
  export const updateUserStatusRules = [
    body('status')
      .isBoolean()
      .withMessage('Status must be a boolean value')
  ];
  
