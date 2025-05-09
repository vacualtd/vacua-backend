import { body, query } from 'express-validator';

export const createSharedBedRules = [
  body('type')
    .isIn(['Single Bed', 'Double Bed', 'Bunk Bed', 'Queen Bed', 'King Bed'])
    .withMessage('Invalid bed type'),

  body('description.title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),

  body('description.overview')
    .trim()
    .notEmpty()
    .withMessage('Overview is required')
    .isLength({ max: 2000 })
    .withMessage('Overview must be less than 2000 characters'),

  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('location')
    .isObject()
    .withMessage('Location is required'),

  body('bedDetails.bedType')
    .isIn(['Single', 'Double', 'Bunk', 'Queen', 'King'])
    .withMessage('Invalid bed type')
];

export const sharedBedQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('type')
    .optional()
    .isIn(['Single Bed', 'Double Bed', 'Bunk Bed', 'Queen Bed', 'King Bed'])
    .withMessage('Invalid bed type'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number')
];
