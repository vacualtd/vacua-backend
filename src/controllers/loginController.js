import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import { sendEmail } from '../utils/emailService.js';
import { emailTemplates } from '../utils/emailTemplates.js';
import { generateUserToken, upsertUser } from '../services/streamChatService.js';
import { generateVideoToken } from '../services/streamVideoService.js';

export const login = async (req, res, next) => {
  try {
    const { identifier, password, userType } = req.body;

    // Validate input
    if (!identifier || !password || !userType) {
      throw new ApiError(400, 'Email/username, password and user type are required');
    }
    

    // Build query based on user type
    let query;
    if (userType === 'landlord') {
      query = { email: identifier.toLowerCase(), role: 'landlord' };
    } else if (userType === 'student') {
      query = { username: identifier, role: 'student' };
    } else {
      throw new ApiError(400, 'Invalid user type');
    }

    // Find user based on query
    const user = await User.findOne(query).select('+password');

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user role matches the requested user type
    if (
      (userType === 'landlord' && user.role !== 'landlord') ||
      (userType === 'student' && user.role !== 'student')
    ) {
      throw new ApiError(401, 'Invalid user type for this account');
    }

    // Check if user has a password set
    if (!user.password) {
      throw new ApiError(401, 'Please complete your registration first');
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      Logger.warn('Invalid password attempt', { 
        userId: user._id.toString(),
        userType 
      });
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new ApiError(401, 'Please verify your email first');
    }

    let streamChatData = null;
    let streamVideoData = null;
    try {
      // Generate Stream Chat token
      const streamToken = await generateUserToken(user._id);
      
      // Update Stream Chat user
      await upsertUser(user);

      // Generate Stream Video token
      const videoToken = await generateVideoToken(user._id.toString());

      streamChatData = {
        token: streamToken,
        apiKey: process.env.STREAM_API_KEY
      };

      streamVideoData = {
        token: videoToken,
        apiKey: process.env.STREAM_API_KEY
      };

      Logger.info('Stream services initialized successfully', {
        userId: user._id.toString()
      });
    } catch (streamError) {
      Logger.error('Stream services initialization failed', {
        error: streamError.message,
        userId: user._id.toString()
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get device info from request headers
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const loginTime = new Date().toLocaleString();

    // Send login notification email asynchronously
    sendEmail({
      to: user.email,
      subject: 'New Login to Your Vacua Account',
      html: emailTemplates.loginNotification(user.username, loginTime, deviceInfo),
    }).catch(emailError => {
      Logger.error('Failed to send login notification email', { 
        error: emailError.message,
        userId: user._id.toString() 
      });
    });

    Logger.info('User logged in successfully', {
      userId: user._id.toString(),
      role: user.role,
    });

    // Send response
    res.status(200).json({
      success: true,
      message: streamChatData && streamVideoData ? 
        'Login successful' : 
        'Login successful (some features unavailable)',
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          role: user.role,
        },
        streamChat: streamChatData,
        streamVideo: streamVideoData
      }
    });

  } catch (error) {
    Logger.error('Login failed', {
      error: error.message,
      code: error.statusCode,
      type: error.constructor.name 
    });
    next(error);
  }
};