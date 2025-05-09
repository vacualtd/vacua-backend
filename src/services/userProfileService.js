import { UserProfile } from '../models/UserProfile.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';
import { Logger } from '../utils/logger.js';

export const createUserProfile = async (userId) => {
  const profile = await UserProfile.create({ userId });
  return profile;
};

export const getUserProfile = async (userId) => {
  try {
    // Get user and profile with a single query using population
    const user = await User.findById(userId)
      .populate({
        path: 'profile',
        select: '-__v -userId' // Exclude redundant fields
      })
      .select('-password -refreshToken'); // Exclude sensitive data

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Restructure the response to avoid duplication
    const response = {
      personalInfo: {
        userId: user._id,
        email: user.email,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatar: user.profile?.avatar || { 
          url: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop"
          // Modern, professional headshot style with blue background
        },
        role: user.role,
        isVerified: user.isVerified,
        accountStatus: user.accountStatus,
        lastLoginAt: user.lastLoginAt
      },
      verification: {
        identity: user.identityVerification,
        business: user.businessVerification,
        student: user.studentVerification,
        property: user.propertyOwnership
      },
      preferences: user.profile?.preferences || {
        notifications: {
          chat: true,
          calls: true,
          community: true,
          email: true,
          push: true
        },
        privacy: {
          showLastSeen: true,
          showStatus: true,
          showProfilePhoto: true,
          showBio: true
        },
        theme: "system",
        language: "en"
      },
      stats: user.profile?.stats || {
        totalMessages: 0,
        totalCalls: 0,
        communities: 0
      },
      subscription: {
        status: user.subscriptionStatus,
        tier: user.subscriptionTier
      },
      contacts: user.profile?.contacts || [],
      lastSeen: user.profile?.lastSeen,
      status: user.profile?.status || 'offline'
    };

    // Add role-specific information
    if (user.role === 'student') {
      response.studentInfo = {
        universityName: user.profile?.studentInfo?.universityName,
        matricNumber: user.profile?.studentInfo?.matricNumber,
        graduationYear: user.profile?.studentInfo?.graduationYear,
        verificationStatus: user.studentVerification?.status
      };
    } else if (user.role === 'landlord') {
      response.landlordInfo = {
        businessName: user.profile?.landlordInfo?.businessName,
        propertyCount: user.propertyOwnership?.properties?.length || 0,
        verificationStatus: user.businessVerification?.status
      };
    }

    return response;
  } catch (error) {
    Logger.error('Error in getUserProfile service:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, updateData) => {
  let session = null;
  try {
    // First check if user and profile exist
    const [user, profile] = await Promise.all([
      User.findById(userId),
      UserProfile.findOne({ userId })
    ]);

    if (!profile) {
      throw new ApiError(404, 'Profile not found');
    }

    // Start transaction only for the update operations
    session = await mongoose.startSession();
    session.startTransaction();

    // Handle each field separately
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        switch (key) {
          case 'username':s
            user.username = value;
            break;
          case 'displayName':
          case 'bio':
          case 'phoneNumber':
          case 'address':
            profile[key] = value;
            break;
          case 'preferences':
            // Merge preferences instead of replacing
            if (value.privacy) {
              profile.preferences.privacy = {
                ...profile.preferences.privacy,
                ...value.privacy
              };
            }
            if (value.notifications) {
              profile.preferences.notifications = {
                ...profile.preferences.notifications,
                ...value.notifications
              };
            }
            if (value.language !== undefined) {
              profile.preferences.language = value.language;
            }
            if (value.theme !== undefined) {
              profile.preferences.theme = value.theme;
            }
            break;
          case 'studentInfo':
          case 'landlordInfo':
            if (user.role === (key === 'studentInfo' ? 'student' : 'landlord')) {
              profile[key] = {
                ...profile[key],
                ...value
              };
            }
            break;
        }
      }
    });

    // Save with transaction
    await Promise.all([
      user.save({ session }),
      profile.save({ session })
    ]);

    await session.commitTransaction();
    await profile.populate('userId', 'username email avatar role');

    return profile;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    Logger.error('Error in updateUserProfile', { userId, error: error.message });
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const updateUserStatus = async (userId, status) => {
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        status,
        lastSeen: status === 'offline' ? new Date() : undefined
      }
    },
    { new: true }
  );

  return profile;
};

export const addContact = async (userId, contactId, relationship = 'friend') => {
  const profile = await UserProfile.findOne({ userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found');
  }

  // Check if contact already exists
  const existingContact = profile.contacts.find(
    c => c.userId.toString() === contactId
  );

  if (existingContact) {
    existingContact.relationship = relationship;
  } else {
    profile.contacts.push({
      userId: contactId,
      relationship
    });
  }

  await profile.save();
  return profile;
};

export const removeContact = async (userId, contactId) => {
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $pull: { contacts: { userId: contactId } } },
    { new: true }
  );

  return profile;
};

export const updatePrivacySettings = async (userId, settings) => {
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: { 'preferences.privacy': settings } },
    { new: true }
  );

  return profile;
};

export const updateNotificationSettings = async (userId, settings) => {
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: { 'preferences.notifications': settings } },
    { new: true }
  );

  return profile;
};