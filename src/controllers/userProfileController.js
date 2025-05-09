import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as userProfileService from '../services/userProfileService.js';
import { uploadToS3 } from '../utils/s3Service.js';

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    Logger.info('Fetching user profile', { userId });

    const profile = await userProfileService.getUserProfile(userId);
    
    if (!profile) {
      throw new ApiError(404, 'Profile not found');
    }

    Logger.info('User profile fetched successfully', { userId });

    // Send optimized response
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    Logger.error('Failed to fetch user profile', { 
      userId: req.user?.id,
      error: error.message 
    });
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = {};

    // Extract only the fields that are present in the request body
    const {
      displayName,
      username,
      bio,
      phoneNumber,
      address,
      language,
      theme,
      privacy,
      notifications,
      nationality,
      preferredLocation,
      universityName,
      matricNumber,
      propertyLocation
    } = req.body;

    // Add fields only if they are present in the request
    if (displayName !== undefined) {
      if (displayName.length < 2 || displayName.length > 50) {
        throw new ApiError(400, 'Display name must be between 2 and 50 characters');
      }
      updateData.displayName = displayName;
    }

    if (username !== undefined) {
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
        throw new ApiError(400, 'Username must be 3-20 characters and can only contain letters, numbers, underscores and hyphens');
      }
      updateData.username = username;
    }

    if (bio !== undefined) {
      if (bio.length > 500) {
        throw new ApiError(400, 'Bio must be less than 500 characters');
      }
      updateData.bio = bio;
    }

    if (phoneNumber !== undefined) {
      if (phoneNumber && !/^\+?[\d\s-]{8,}$/.test(phoneNumber)) {
        throw new ApiError(400, 'Invalid phone number format');
      }
      updateData.phoneNumber = phoneNumber;
    }

    if (address !== undefined) {
      updateData.address = address;
    }

    // Handle preferences updates
    if (language !== undefined || theme !== undefined || privacy !== undefined || notifications !== undefined) {
      updateData.preferences = {};
      
      if (language !== undefined) {
        updateData.preferences.language = language;
      }
      
      if (theme !== undefined) {
        updateData.preferences.theme = theme;
      }

      if (privacy !== undefined) {
        updateData.preferences.privacy = privacy;
      }

      if (notifications !== undefined) {
        updateData.preferences.notifications = notifications;
      }
    }

    // Handle role-specific updates
    if (req.user.role === 'student' && (nationality !== undefined || universityName !== undefined || 
        matricNumber !== undefined || preferredLocation !== undefined)) {
      updateData.studentInfo = {
        ...(nationality !== undefined && { nationality }),
        ...(universityName !== undefined && { universityName }),
        ...(matricNumber !== undefined && { matricNumber }),
        ...(preferredLocation !== undefined && { preferredLocation })
      };
    } else if (req.user.role === 'landlord' && (nationality !== undefined || 
               propertyLocation !== undefined || preferredLocation !== undefined)) {
      updateData.landlordInfo = {
        ...(nationality !== undefined && { nationality }),
        ...(propertyLocation !== undefined && { propertyLocation }),
        ...(preferredLocation !== undefined && { preferredLocation })
      };
    }

    Logger.info('Updating user profile', { userId, updateData });
    
    const profile = await userProfileService.updateUserProfile(userId, updateData);

    Logger.info('User profile updated successfully', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (error) {
    Logger.error('Failed to update user profile', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

export const updatePrivacySettings = async (req, res, next) => {
  try {
    const { showLastSeen, showStatus } = req.body;
    
    const profile = await userProfileService.updatePrivacySettings(
      req.user.id,
      { showLastSeen, showStatus }
    );

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationSettings = async (req, res, next) => {
  try {
    const { chat, calls, community } = req.body;
    
    const profile = await userProfileService.updateNotificationSettings(
      req.user.id,
      { chat, calls, community }
    );

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

export const addContact = async (req, res, next) => {
  try {
    const { contactId, relationship } = req.body;
    
    const profile = await userProfileService.addContact(
      req.user.id,
      contactId,
      relationship
    );

    res.json({
      success: true,
      message: 'Contact added successfully',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

export const removeContact = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    
    const profile = await userProfileService.removeContact(
      req.user.id,
      contactId
    );

    res.json({
      success: true,
      message: 'Contact removed successfully',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfileImage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const file = req.file; // multer puts the file here

    if (!file) {
      throw new ApiError(400, 'No image file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ApiError(400, 'Invalid file type. Only JPEG, JPG and PNG are allowed');
    }

    // Upload to S3
    const uploadResult = await uploadToS3(file, 'profile-images/');

    // Update profile with new image
    const profile = await userProfileService.updateUserProfile(userId, {
      avatar: {
        url: uploadResult.url,
        key: uploadResult.key
      }
    });

    Logger.info('Profile image updated successfully', { userId });

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        avatar: profile.avatar
      }
    });
  } catch (error) {
    Logger.error('Failed to update profile image', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};