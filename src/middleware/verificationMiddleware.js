import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

export const checkVerificationStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check identity verification status
    if (user.identityVerification.status !== 'verified') {
      throw new ApiError(403, 'Please complete your identity verification first');
    }

    // Additional checks for landlords
    if (user.role === 'landlord') {
      // Check business verification
      if (user.businessVerification.status !== 'verified') {
        throw new ApiError(403, 'Please complete your business verification first');
      }
      
      // Check property ownership verification
      if (user.propertyOwnership.status !== 'verified') {
        throw new ApiError(403, 'Please complete your property ownership verification first');
      }
    }

    // Additional checks for students
    if (user.role === 'student') {
      // Check if student verification is complete
      if (!user.studentVerification || user.studentVerification.status !== 'verified') {
        throw new ApiError(403, 'Please complete your student verification first');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}; 