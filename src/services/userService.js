import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { LandlordProfile } from '../models/LandlordProfile.js';
import { UserProfile } from '../models/UserProfile.js';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/emailService.js';
import { emailTemplates } from '../utils/emailTemplates.js';
import { Logger } from '../utils/logger.js';

export const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

export const findUserByUsername = async (username) => {
  return await User.findOne({ username });
};

export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-password -otp');
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Get role-specific profile
  let roleProfile = null;
  if (user.role === 'student') {
    roleProfile = await StudentProfile.findOne({ userId });
  } else if (user.role === 'landlord') {
    roleProfile = await LandlordProfile.findOne({ userId });
  }

  return {
    ...user.toJSON(),
    profile: roleProfile
  };
};

export const updateUserById = async (userId, updateData) => {
  try {
    const result = await User.updateOne(
      { _id: userId },
      updateData
    );

    if (result.matchedCount === 0) {
      throw new ApiError(404, 'User not found');
    }

    const updatedUser = await User.findById(userId).select('-password');
    return updatedUser;
  } catch (error) {
    Logger.error('Failed to update user', { error: error.message });
    throw error;
  }
};

export const validateOTP = (user, otp) => {
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isVerified) {
    throw new ApiError(400, 'Email already verified');
  }

  if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
    throw new ApiError(400, 'No OTP found. Please request a new one');
  }

  if (user.otp.code !== otp) {
    throw new ApiError(400, 'Invalid OTP');
  }

  if (new Date() > new Date(user.otp.expiresAt)) {
    throw new ApiError(400, 'OTP has expired');
  }
};

export const completeRegistration = async (user, username, password) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user profile
    const userProfile = await UserProfile.create([{
      userId: user._id,
      displayName: username // Use username as initial display name
    }], { session });

    // Update user
    user.username = username;
    user.password = hashedPassword;
    user.isVerified = true;
    user.otpVerified = true;
    user.profile = userProfile[0]._id;
    user.otp = undefined; // Clear OTP after successful registration

    await user.save({ session });
    await session.commitTransaction();

    return user;
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(500, 'Registration failed: ' + error.message);
  } finally {
    session.endSession();
  }
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId)
      .select('+password +passwordHistory')
      .session(session);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new ApiError(400, 'New password must be different from current password');
    }

    // Check password history (last 3 passwords)
    const recentPasswords = user.passwordHistory.slice(-3);
    for (const historyEntry of recentPasswords) {
      const isPasswordReused = await bcrypt.compare(newPassword, historyEntry.password);
      if (isPasswordReused) {
        throw new ApiError(400, 'Cannot reuse any of your last 3 passwords');
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Add current password to history
    user.passwordHistory.push({
      password: user.password,
      changedAt: user.lastPasswordChange
    });

    // Keep only last 5 password entries
    if (user.passwordHistory.length > 5) {
      user.passwordHistory = user.passwordHistory.slice(-5);
    }

    // Update password and lastPasswordChange
    user.password = hashedPassword;
    user.lastPasswordChange = new Date();

    await user.save({ session });
    await session.commitTransaction();

    // Send password change notification email
    await sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully',
      html: emailTemplates.passwordChangeNotification(user.username)
    });

    return {
      message: 'Password changed successfully',
      lastPasswordChange: user.lastPasswordChange
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};