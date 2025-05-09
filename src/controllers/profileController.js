import { ApiError } from '../utils/ApiError.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { LandlordProfile } from '../models/LandlordProfile.js';
import { Logger } from '../utils/logger.js';
import { uploadToS3 } from '../utils/s3Service.js';
import * as userService from '../services/userService.js';
import { User } from '../models/User.js';

export const createStudentProfile = async (req, res, next) => {
  try {
    const { nationality, universityName, preferredLocation, matricNumber } = req.body;
    const userId = req.user.id;

    // Check if profile exists
    const existingProfile = await StudentProfile.findOne({ userId });
    
    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await StudentProfile.findOneAndUpdate(
        { userId },
        {
          nationality,
          universityName,
          preferredLocation,
          matricNumber
        },
        { new: true } // Return updated document
      );
      Logger.info('Student profile updated', { userId });
    } else {
      // Create new profile
      profile = await StudentProfile.create({
        userId,
        nationality,
        universityName,
        preferredLocation,
        matricNumber
      });
      Logger.info('Student profile created', { userId });
    }

    res.status(200).json({
      success: true,
      message: existingProfile ? 'Profile updated successfully' : 'Profile created successfully',
      data: profile
    });
  } catch (error) {
    Logger.error('Failed to handle student profile', { error: error.message });
    next(error);
  }
};

export const createLandlordProfile = async (req, res, next) => {
  try {
    const userId = req.user.id; // Get userId from authenticated user

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if profile already exists
    const existingProfile = await LandlordProfile.findOne({ userId });
    if (existingProfile) {
      throw new ApiError(400, 'Landlord profile already exists for this user');
    }

    // Create profile with validated data
    const profileData = {
      userId, // Set userId explicitly
      ...req.body,
      isComplete: false
    };

    // Create new profile
    const profile = await LandlordProfile.create(profileData);

    Logger.info('Landlord profile created successfully', { 
      userId, 
      profileId: profile._id 
    });

    res.status(201).json({
      success: true,
      message: 'Landlord profile created successfully',
      data: profile
    });

  } catch (error) {
    Logger.error('Failed to handle landlord profile', {
      error: error.message,
      userId: req.user?.id
    });

    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return next(new ApiError(400, 'Profile already exists for this user'));
    }

    next(error);
  }
};

export const updateProfileImage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      throw ApiError.badRequest('No image file provided');
    }

    // Upload image to S3 first
    const uploadedImage = await uploadToS3(req.file);
    
    if (!uploadedImage || !uploadedImage.url) {
      throw ApiError.internal('Failed to upload image');
    }

    // Use updateOne instead of findByIdAndUpdate
    const result = await User.updateOne(
      { _id: userId },
      { avatar: uploadedImage.url }
    );

    if (result.matchedCount === 0) {
      throw ApiError.notFound('User not found');
    }

    // Get updated user
    const updatedUser = await User.findById(userId).select('-password');

    Logger.info('Profile image updated successfully', {
      userId,
      imageUrl: uploadedImage.url
    });

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        avatar: updatedUser.avatar
      }
    });
  } catch (error) {
    Logger.error('Failed to update profile image', { error: error.message });
    next(error);
  }
};

export const updateLandlordProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find existing profile or create new one
    let profile = await LandlordProfile.findOne({ user: userId });
    
    if (!profile) {
      profile = new LandlordProfile({
        user: userId
      });
    }

    // Validate and filter update data
    const validUpdates = LandlordProfile.validateProfileUpdate(req.body);

    // Apply updates
    Object.assign(profile, validUpdates);

    // Save profile
    await profile.save();

    Logger.info('Landlord profile updated successfully', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });

  } catch (error) {
    Logger.error('Failed to handle landlord profile', { error: error.message });
    next(error);
  }
};