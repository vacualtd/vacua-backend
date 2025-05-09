import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    Logger.error('API Error', {
      statusCode: err.statusCode,
      message: err.message,
      userId: req.user?.id,
      path: req.path
    });

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }

  // Handle Mongoose errors
  if (err.name === 'ValidationError') {
    Logger.error('Validation Error', {
      error: err.message,
      userId: req.user?.id,
      path: req.path
    });

    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Handle other errors
  Logger.error('Server Error', {
    error: err.message,
    stack: err.stack,
    userId: req.user?.id,
    path: req.path
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};