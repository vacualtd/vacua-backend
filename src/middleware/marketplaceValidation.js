import { ApiError } from '../utils/ApiError.js';

export const validateMarketFilters = (req, res, next) => {
  try {
    const { page, limit, type, category, minPrice, maxPrice, condition, sortBy } = req.query;

    // Validate numeric parameters
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

    // Validate product type
    if (type && !['product', 'service', 'giveaway'].includes(type)) {
      throw new ApiError(400, 'Invalid product type');
    }

    // Validate condition if provided
    if (condition && !['new', 'like-new', 'good', 'fair', 'poor'].includes(condition)) {
      throw new ApiError(400, 'Invalid condition value');
    }

    // Validate sort parameter
    if (sortBy && !['price', 'createdAt', 'popularity'].includes(sortBy)) {
      throw new ApiError(400, 'Invalid sort field');
    }

    // Set default values
    req.query.page = parseInt(page) || 1;
    req.query.limit = parseInt(limit) || 10;

    next();
  } catch (error) {
    next(error);
  }
}; 