import { ApiError } from '../utils/ApiError.js';

export const verifyStudent = (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      throw new ApiError(403, 'Only students can perform this action');
    }
    if (!req.user.isVerified || !req.user.studentVerification?.status === 'verified') {
      throw new ApiError(403, 'Student verification required');
    }
    next();
  } catch (error) {
    next(error);
  }
};
