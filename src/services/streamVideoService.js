import streamVideoClient from '../config/streamVideoConfig.js';
import { Logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Generate a user token for Stream Video
 */
export const generateVideoToken = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return streamVideoClient.createToken(userId.toString());
  } catch (error) {
    Logger.error('Failed to generate Stream Video token', {
      userId: userId?.toString(),
      error: error.message
    });
    throw new Error('Failed to generate video token');
  }
};

/**
 * Create a video call
 */
export const createCall = async (callId, options = {}) => {
  try {
    const channel = streamVideoClient.channel('default', callId);
    await channel.create();
    return channel;
  } catch (error) {
    Logger.error('Failed to create video call', {
      callId,
      error: error.message
    });
    throw new ApiError(500, 'Failed to create video call');
  }
};

/**
 * Get call details
 */
export const getCall = async (callId) => {
  try {
    const channel = streamVideoClient.channel('default', callId);
    await channel.query();
    return channel;
  } catch (error) {
    Logger.error('Failed to get video call', {
      callId,
      error: error.message
    });
    throw new ApiError(500, 'Failed to get video call');
  }
};

/**
 * End a video call
 */
export const endCall = async (callId) => {
  try {
    const channel = streamVideoClient.channel('default', callId);
    await channel.delete();
    return true;
  } catch (error) {
    Logger.error('Failed to end video call', {
      callId,
      error: error.message
    });
    throw new ApiError(500, 'Failed to end video call');
  }
};

/**
 * Get user's ongoing calls
 */
export const getUserCalls = async (userId) => {
  try {
    const filter = { members: { $in: [userId.toString()] } };
    const channels = await streamVideoClient.queryChannels(filter);
    return channels;
  } catch (error) {
    Logger.error('Failed to get user calls', {
      userId,
      error: error.message
    });
    throw new ApiError(500, 'Failed to get user calls');
  }
};
