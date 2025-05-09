import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import * as userService from '../services/userService.js';
import { Logger } from '../utils/logger.js';
import { sendEmail } from '../utils/emailService.js';
import { emailTemplates } from '../utils/emailTemplates.js';

/**
 * Get the profile of the authenticated user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user profile
    const user = await userService.getUserProfile(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    Logger.info('User profile fetched successfully', { userId });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    Logger.error('Failed to fetch user profile', { error: error.message });
    next(error);
  }
};

/**
 * Update the profile of the authenticated user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { username, email } = req.body;

    // Validate input
    if (!username && !email) {
      throw ApiError.badRequest('At least one field (username or email) is required');
    }

    // Update user profile
    const updatedUser = await userService.updateUserProfile(userId, { username, email });

    Logger.info('User profile updated successfully', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    Logger.error('Failed to update user profile', { error: error.message });
    next(error);
  }
};

/**
 * Change the password of the authenticated user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    console.log(currentPassword, newPassword)
    const userId = req.user.id;

    const result = await userService.changePassword(userId, currentPassword, newPassword);

    Logger.info('Password changed successfully', { userId });

    res.json({
      success: true,
      message: result.message,
      data: {
        lastPasswordChange: result.lastPasswordChange
      }
    });
  } catch (error) {
    Logger.error('Failed to change password', { error: error.message });
    next(error);
  }
};

export const requestAccountDeletion = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Set deletion date to 30 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Update user status
    user.accountStatus = 'scheduled_for_deletion';
    user.deletionDetails = {
      scheduledDate: deletionDate,
      reason: reason || 'User requested deletion',
      requestedAt: new Date()
    };

    // Add to history
    user.deactivationHistory.push({
      status: 'scheduled_for_deletion',
      reason: reason || 'User requested deletion',
      date: new Date()
    });

    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Deletion Requested',
      html: emailTemplates.accountDeletionRequested(user.username, deletionDate)
    });

    // Schedule cleanup job (implement separately)
    scheduleAccountCleanup(userId, deletionDate);

    Logger.info('Account deletion requested', { userId });

    res.json({
      success: true,
      message: 'Account scheduled for deletion',
      data: {
        deletionDate,
        gracePeriod: '30 days'
      }
    });
  } catch (error) {
    Logger.error('Failed to request account deletion', { error: error.message });
    next(error);
  }
};

export const cancelAccountDeletion = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.accountStatus !== 'scheduled_for_deletion') {
      throw new ApiError(400, 'Account is not scheduled for deletion');
    }

    // Reactivate account
    user.accountStatus = 'active';
    user.deletionDetails.cancelledAt = new Date();
    
    // Add to history
    user.deactivationHistory.push({
      status: 'deletion_cancelled',
      reason: 'User cancelled deletion request',
      date: new Date()
    });

    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Deletion Cancelled',
      html: emailTemplates.accountDeletionCancelled(user.username)
    });

    Logger.info('Account deletion cancelled', { userId });

    res.json({
      success: true,
      message: 'Account deletion cancelled successfully'
    });
  } catch (error) {
    Logger.error('Failed to cancel account deletion', { error: error.message });
    next(error);
  }
};

export const deactivateAccount = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.accountStatus = 'deactivated';
    user.deactivationHistory.push({
      status: 'deactivated',
      reason: reason || 'User requested deactivation',
      date: new Date()
    });

    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Deactivated',
      html: emailTemplates.accountDeactivated(user.username)
    });

    Logger.info('Account deactivated', { userId });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    Logger.error('Failed to deactivate account', { error: error.message });
    next(error);
  }
};

export const reactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.accountStatus === 'deleted') {
      throw new ApiError(400, 'Account has been permanently deleted');
    }

    user.accountStatus = 'active';
    user.deactivationHistory.push({
      status: 'reactivated',
      reason: 'User requested reactivation',
      date: new Date()
    });

    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Reactivated',
      html: emailTemplates.accountReactivated(user.username)
    });

    Logger.info('Account reactivated', { userId });

    res.json({
      success: true,
      message: 'Account reactivated successfully'
    });
  } catch (error) {
    Logger.error('Failed to reactivate account', { error: error.message });
    next(error);
  }
};