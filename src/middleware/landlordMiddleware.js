import { ApiError } from '../utils/ApiError.js';
import { LandlordProfile } from '../models/LandlordProfile.js';
import { User } from '../models/User.js';

export const verifyLandlord = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (req.user.role !== 'landlord') {
      throw new ApiError(403, 'Access denied. Landlord access required');
    }

    // Check verification status
    const user = await User.findById(req.user.id);
    
    const verificationStatus = {
      identity: user.identityVerification?.status === 'verified',
      business: user.businessVerification?.status === 'verified',
      property: user.propertyVerification?.status === 'verified'
    };

    // Check profile completion
    const profile = await LandlordProfile.findOne({ userId: req.user.id });

    // Return detailed verification status if any verification is pending
    if (!verificationStatus.identity || !verificationStatus.business || !profile) {
      const missingItems = [];
      if (!verificationStatus.identity) missingItems.push('identity verification');
      if (!verificationStatus.business) missingItems.push('business verification');
      if (!profile) missingItems.push('landlord profile');

      throw new ApiError(403, `Please complete: ${missingItems.join(', ')}`);
    }

    next();
  } catch (error) {
    next(error);
  }
};