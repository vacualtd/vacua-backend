import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import { User } from '../models/User.js';

export const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'admin') {
      Logger.warn('Unauthorized admin access attempt', {
        userId: user._id,
        attemptedAction: req.originalUrl,
        method: req.method
      });
      throw new ApiError(403, 'Admin access required');
    }

    // Add admin info to request for future middleware/controllers
    req.admin = {
      id: user._id,
      role: user.role,
      permissions: user.permissions || []
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Alias for backward compatibility
export const isAdmin = verifyAdmin;

// Helper function to check specific admin permissions
export const hasAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin || !req.admin.permissions.includes(permission)) {
      return next(new ApiError(403, 'Insufficient admin permissions'));
    }
    next();
  };
};