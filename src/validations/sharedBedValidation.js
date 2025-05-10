import { body, query } from 'express-validator';

export const createSharedBedRules = [
  body('type')
    .notEmpty()
    .withMessage('Bed type is required')
    .isIn(['Single Bed', 'Double Bed', 'Bunk Bed', 'Queen Bed', 'King Bed'])
    .withMessage('Invalid bed type'),

  body('description')
    .notEmpty()
    .withMessage('Description object is required')
    .isObject()
    .withMessage('Description must be an object'),

  body('description.title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('description.overview')
    .notEmpty()
    .withMessage('Overview is required')
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Overview must be between 10 and 2000 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isObject()
    .withMessage('Location must be an object'),

  body('location.address')
    .notEmpty()
    .withMessage('Address is required')
    .isString()
    .withMessage('Address must be a string'),

  body('location.coordinates')
    .optional()
    .isArray()
    .withMessage('Coordinates must be an array of [longitude, latitude]'),

  body('bedDetails')
    .notEmpty()
    .withMessage('Bed details are required')
    .isObject()
    .withMessage('Bed details must be an object'),

  body('bedDetails.bedType')
    .notEmpty()
    .withMessage('Bed type is required')
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

export const updateSharedBedRules = [
  body('type')
    .optional()
    .isIn(['Single Bed', 'Double Bed', 'Bunk Bed', 'Queen Bed', 'King Bed'])
    .withMessage('Invalid bed type'),

  body('description.title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),

  body('description.overview')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Overview must be less than 2000 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('availability')
    .optional()
    .isObject()
    .withMessage('Availability must be an object')
];
