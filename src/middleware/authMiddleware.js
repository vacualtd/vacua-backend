import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js'; // Add this import

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Authentication token required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      throw new ApiError(401, 'Invalid token format');
    }

    // Fetch the user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Store user data in request
    req.user = {
      id: user._id,
      idObject: user._id,
      role: user.role,
      username: user.username,
      isVerified: user.isVerified,
      studentVerification: user.studentVerification
    };

    Logger.info('Token authenticated successfully', {
      userId: req.user.id
    });

    next();
  } catch (error) {
    Logger.error('Authentication failed:', { error: error.message });
    next(new ApiError(401, 'Authentication failed'));
  }
};

// Add authorize middleware
export const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      // Convert string to array if single role
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(req.user.role)) {
        Logger.warn('Unauthorized access attempt', {
          userId: req.user.id,
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
        throw new ApiError(403, 'You do not have permission to access this resource');
      }

      Logger.info('Authorization successful', {
        userId: req.user.id,
        role: req.user.role,
        accessType: allowedRoles.join(',')
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const verifyStudentAuthorization = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (req.user.role !== 'student') {
      throw new ApiError(403, 'Only students can perform this action');
    }
    
    if (!req.user.isVerified || req.user.studentVerification?.status !== 'verified') {
      throw new ApiError(403, 'Student verification required');
    }

    next();
  } catch (error) {
    next(error);
  }
};