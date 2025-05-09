import { body, query } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export const createListingRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom(value => value >= 0)
    .withMessage('Price cannot be negative'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('type')
    .isIn(['product', 'service', 'giveaway'])
    .withMessage('Invalid listing type')
];

export const updateListingRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .custom(value => value >= 0)
    .withMessage('Price cannot be negative'),
  body('location')
    .optional()
    .trim(),
  body('type')
    .optional()
    .isIn(['product', 'service', 'giveaway'])
    .withMessage('Invalid listing type'),
  body('status')
    .optional()
    .isIn(['active', 'sold', 'cancelled'])
    .withMessage('Invalid status')
];

export const searchListingRules = [
  query('query')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),
  query('type')
    .optional()
    .isIn(['product', 'service', 'giveaway'])
    .withMessage('Invalid listing type'),
  query('minPrice')
    .optional()
    .isNumeric()
    .withMessage('Minimum price must be a number')
    .custom(value => value >= 0)
    .withMessage('Minimum price cannot be negative'),
  query('maxPrice')
    .optional()
    .isNumeric()
    .withMessage('Maximum price must be a number')
    .custom(value => value >= 0)
    .withMessage('Maximum price cannot be negative'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price', 'name'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

export const listingQueryRules = [
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),

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
    .isIn(['product', 'service', 'giveaway'])
    .withMessage('Invalid listing type'),

  query('category')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Invalid category'),

  query('condition')
    .optional()
    .isIn(['new', 'like-new', 'good', 'fair', 'poor'])
    .withMessage('Invalid condition'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price', 'title', 'random'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order'),

  query('availability')
    .optional()
    .isBoolean()
    .withMessage('Availability must be true or false')
];

export const validateMarketFilters = (req, res, next) => {
  try {
    const { page, limit, type, category, minPrice, maxPrice, condition, sortBy } = req.query;

    if (page && isNaN(page)) {
      throw new ApiError(400, 'Page must be a number');
    }
    if (limit && isNaN(limit)) {
      throw new ApiError(400, 'Limit must be a number');
    }
    if (minPrice && isNaN(minPrice)) {
      throw new ApiError(400, 'Minimum price must be a number');
    }
    if (maxPrice && isNaN(maxPrice)) {
      throw new ApiError(400, 'Maximum price must be a number');
    }

    if (type && !['product', 'service', 'giveaway'].includes(type)) {
      throw new ApiError(400, 'Invalid product type');
    }

    const validCategories = [
      'furniture',
      'electronics',
      'books',
      'clothing',
      'kitchenware',
      'sports',
      'other'
    ];
    if (category && !validCategories.includes(category)) {
      throw new ApiError(400, 'Invalid category');
    }

    if (condition && !['new', 'like-new', 'good', 'fair', 'poor'].includes(condition)) {
      throw new ApiError(400, 'Invalid condition value');
    }

    if (sortBy && !['price', 'createdAt', 'popularity'].includes(sortBy)) {
      throw new ApiError(400, 'Invalid sort field');
    }

    req.query.page = parseInt(page) || 1;
    req.query.limit = parseInt(limit) || 10;

    next();
  } catch (error) {
    next(error);
  }
};