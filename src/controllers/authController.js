import { ApiError } from '../utils/ApiError.js';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Logger } from '../utils/logger.js';
import { sendEmail } from '../utils/emailService.js';
import { generateOTP } from '../utils/otpGenerator.js';
import * as userService from '../services/userService.js';
import { generateTempToken } from '../utils/tokenService.js';
import { emailTemplates } from '../utils/emailTemplates.js';


export const initiateEmailVerification = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    // Validate input
    if (!email || !role) {
      throw ApiError.badRequest('Email and role are required');
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if user exists
    let user = await userService.findUserByEmail(email);

    if (user && user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered and verified',
        data: { exists: true, isVerified: true }
      });
    }

    if (user) {
      // Update existing user's OTP
      user.otp = { code: otp, expiresAt: otpExpiry };
      await user.save();
    } else {
      // Create new user with OTP
      user = await User.create({
        email,
        role,
        otp: { code: otp, expiresAt: otpExpiry }
      });
    }

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'Your Verification Code',
      html: emailTemplates.verificationEmail(otp)
    });

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully',
      data: {
        exists: !!user.username,
        isVerified: false,
        email: user.email
      }
    });

  } catch (error) {
    Logger.error('Email verification failed', { error: error.message });
    next(error);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      throw ApiError.badRequest('Email and OTP are required');
    }

    const user = await userService.findUserByEmail(email);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Validate OTP
    userService.validateOTP(user, otp);

    // Mark user as verified
    user.otpVerified = true;
    user.isVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    Logger.error('OTP verification failed', { error: error.message });
    next(error);
  }
};

export const completeRegistration = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Validate input
    if (!email || !username || !password) {
      throw ApiError.badRequest('Email, username, and password are required');
    }

    // Validate password strength
    if (password.length < 6) {
      throw ApiError.badRequest('Password must be at least 8 characters long');
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      throw ApiError.badRequest('Username must be 3-20 characters and can only contain letters, numbers, underscores and hyphens');
    }

    const user = await userService.findUserByEmail(email);

    if (!user || !user.otpVerified) {
      throw ApiError.badRequest('Please verify your email first');
    }

    // Check if username is already taken
    const existingUsername = await userService.findUserByUsername(username);
    if (existingUsername) {
      throw ApiError.badRequest('Username already taken');
    }

    // Complete registration with transaction
    const registeredUser = await userService.completeRegistration(user, username, password);

    // Generate temporary token for profile completion
    const tempToken = generateTempToken({
      id: registeredUser._id,
      role: registeredUser.role,
    });

    // Send welcome email asynchronously
    sendEmail({
      to: email,
      subject: 'Welcome to Vacua!',
      html: emailTemplates.welcomeEmail(username),
    }).catch(error => {
      Logger.error('Welcome email failed to send', { error: error.message });
    });

    Logger.info('Registration completed successfully', { userId: registeredUser._id });

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        tempToken,
        user: {
          email: registeredUser.email,
          username: registeredUser.username,
          role: registeredUser.role,
        },
      },
    });
  } catch (error) {
    Logger.error('Registration failed', { error: error.message });
    next(error);
  }
};

export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      throw ApiError.badRequest('Email is required');
    }

    // Check if user exists
    const user = await userService.findUserByEmail(email);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.isVerified) {
      throw ApiError.badRequest('Email is already verified');
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user's OTP
    user.otp = { code: otp, expiresAt: otpExpiry };
    await user.save();

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'New Verification Code',
      html: emailTemplates.verificationEmail(otp),
    });

    Logger.info('New OTP sent successfully', { email });

    res.status(200).json({
      success: true,
      message: 'New OTP sent successfully',
      data: {
        message: 'Please check your email for the new verification code',
      },
    });
  } catch (error) {
    Logger.error('Resend OTP failed', { error: error.message });
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      throw ApiError.badRequest('Email is required');
    }

    const user = await userService.findUserByEmail(email);

    if (!user) {
      throw ApiError.notFound('No account found with this email');
    }

    // Generate OTP for password reset
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = { code: otp, expiresAt: otpExpiry };
    await user.save();

    // Send password reset email
    await sendEmail({
      to: email,
      subject: 'Password Reset Code',
      html: emailTemplates.passwordResetEmail(otp),
    });

    Logger.info('Password reset OTP sent', { email });

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email',
    });
  } catch (error) {
    Logger.error('Password reset request failed', { error: error.message });
    next(error);
  }
};

export const verifyPasswordResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      throw ApiError.badRequest('Email and OTP are required');
    }

    const user = await userService.findUserByEmail(email);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Validate OTP
    if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
      throw ApiError.badRequest('No OTP found. Please request a new one');
    }

    if (user.otp.code !== otp) {
      throw ApiError.badRequest('Invalid OTP');
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      throw ApiError.badRequest('OTP has expired');
    }

    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    Logger.error('OTP verification failed', { error: error.message });
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate input
    if (!email || !otp || !newPassword) {
      throw ApiError.badRequest('Email, OTP, and new password are required');
    }

    const user = await userService.findUserByEmail(email);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Validate OTP again for security
    if (!user.otp || user.otp.code !== otp || new Date() > new Date(user.otp.expiresAt)) {
      throw ApiError.badRequest('Invalid or expired OTP');
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.otp = undefined; // Clear OTP after successful reset
    await user.save();

    Logger.info('Password reset successful', { email });

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    Logger.error('Password reset failed', { error: error.message });
    next(error);
  }
};

export const resendPasswordResetOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      throw ApiError.badRequest('Email is required');
    }

    const user = await userService.findUserByEmail(email);

    if (!user) {
      throw ApiError.notFound('No account found with this email');
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user's OTP
    user.otp = { code: otp, expiresAt: otpExpiry };
    await user.save();

    // Send new password reset OTP email
    await sendEmail({
      to: email,
      subject: 'New Password Reset Code',
      html: emailTemplates.passwordResetEmail(otp),
    });

    Logger.info('New password reset OTP sent', { email });

    res.json({
      success: true,
      message: 'New password reset code sent successfully',
      data: {
        email: user.email,
        otpExpiry
      }
    });
  } catch (error) {
    Logger.error('Failed to resend password reset OTP', { error: error.message });
    next(error);
  }
};

