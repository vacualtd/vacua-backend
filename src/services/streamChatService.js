import { StreamChat } from 'stream-chat';
import { Logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

const streamClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

// Map application roles to Stream Chat roles
const STREAM_ROLE_MAP = {
  'admin': 'admin',
  'student': 'user',
  'landlord': 'user',
  'moderator': 'moderator'
};

/**
 * Generate a user token for Stream Chat
 */
export const generateUserToken = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return streamClient.createToken(userId.toString());
  } catch (error) {
    Logger.error('Failed to generate Stream Chat token', {
      userId: userId?.toString(),
      error: error.message
    });
    throw new Error('Failed to generate chat token');
  }
};

/**
 * Create or update a user in Stream Chat
 */
export const upsertUser = async (userData) => {
  try {
    if (!userData?._id) {
      throw new Error('Invalid user data');
    }

    // Map the application role to a valid Stream Chat role
    const streamRole = STREAM_ROLE_MAP[userData.role] || 'user';

    const streamUser = {
      id: userData._id.toString(),
      name: userData.username || userData.email,
      role: streamRole, // Use mapped role instead of direct role
      // Additional user data
      extraData: {
        appRole: userData.role, // Store original role in extraData
        email: userData.email,
        avatar: userData.avatar?.url
      }
    };

    await streamClient.upsertUsers([streamUser]);
    
    Logger.info('Stream Chat user updated', {
      userId: userData._id.toString(),
      streamRole
    });

    return true;
  } catch (error) {
    Logger.error('Failed to upsert Stream Chat user', {
      userId: userData?._id?.toString(),
      error: error.message,
      role: userData?.role
    });
    throw new Error('Failed to update chat user');
  }
};

/**
 * Create a new channel
 */
export const createChannel = async (chatId, data) => {
  try {
    const channelId = `room_${chatId}`;
    let channel;

    // Try to get existing channel first
    try {
      channel = streamClient.channel('messaging', channelId);
      const query = await channel.query();
      if (query.channel) {
        return {
          id: channelId,
          type: 'messaging',
          members: data.members
        };
      }
    } catch (error) {
      // Channel doesn't exist, continue to create
    }

    // Create new channel
    channel = streamClient.channel('messaging', channelId, {
      members: data.members,
      name: data.name,
      created_by_id: data.members[0]
    });

    await channel.create();

    Logger.info('Stream channel created', {
      channelId,
      members: data.members
    });

    return {
      id: channelId,
      type: 'messaging',
      members: data.members
    };
  } catch (error) {
    Logger.error('Failed to create Stream channel', {
      error: error.message,
      chatId
    });
    throw new ApiError(500, 'Failed to create chat channel');
  }
};

/**
 * Get a channel by ID
 */
export const getChannel = async (channelId) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    await channel.query();
    return channel;
  } catch (error) {
    Logger.error('Failed to get Stream Chat channel', { error });
    throw new ApiError(500, 'Failed to get chat channel');
  }
};

/**
 * Add members to a channel
 */
export const addChannelMembers = async (channelId, memberIds) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    await channel.addMembers(memberIds.map(String));
    return channel;
  } catch (error) {
    Logger.error('Failed to add members to Stream Chat channel', { error });
    throw new ApiError(500, 'Failed to add members to chat channel');
  }
};

/**
 * Remove members from a channel
 */
export const removeChannelMembers = async (channelId, memberIds) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    await channel.removeMembers(memberIds.map(String));
    return channel;
  } catch (error) {
    Logger.error('Failed to remove members from Stream Chat channel', { error });
    throw new ApiError(500, 'Failed to remove members from chat channel');
  }
};

/**
 * Get user's channels
 */
export const getUserChannels = async (userId) => {
  try {
    const filter = { members: { $in: [userId.toString()] } };
    const sort = { last_message_at: -1 };
    
    const channels = await streamClient.queryChannels(filter, sort, {
      limit: 30,
      member: true,
      watch: true
    });

    return channels;
  } catch (error) {
    Logger.error('Failed to get user Stream Chat channels', { error });
    throw new ApiError(500, 'Failed to get user chat channels');
  }
};

/**
 * Get list of channels/groups
 */
export const getChannelList = async (userId, options = {}) => {
  try {
    const filter = { type: 'messaging' };
    const sort = { last_message_at: -1 };
    const channelOptions = {
      limit: options.limit || 30,
      offset: options.offset || 0,
      member: true,
      state: true,
      watch: true
    };

    const channels = await streamClient.queryChannels(
      filter,
      sort,
      channelOptions
    );

    Logger.info('Channel list retrieved successfully', {
      userId,
      channelCount: channels.length
    });

    return channels;
  } catch (error) {
    Logger.error('Failed to get channel list', {
      error: error.message,
      userId
    });
    throw new ApiError(500, 'Failed to get channel list');
  }
};

/**
 * Delete a channel
 */
export const deleteChannel = async (channelId) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    await channel.delete();
  } catch (error) {
    Logger.error('Failed to delete Stream Chat channel', { error });
    throw new ApiError(500, 'Failed to delete chat channel');
  }
};

/**
 * Update channel data
 */
export const updateChannel = async (channelId, data) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    await channel.update(data);
    return channel;
  } catch (error) {
    Logger.error('Failed to update Stream Chat channel', { error });
    throw new ApiError(500, 'Failed to update chat channel');
  }
};

/**
 * Send message to channel
 */
export const sendMessage = async (channelId, userId, message) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    return await channel.sendMessage({
      text: message,
      user_id: userId.toString()
    });
  } catch (error) {
    Logger.error('Failed to send Stream Chat message', { error });
    throw new ApiError(500, 'Failed to send chat message');
  }
};

/**
 * Get channel messages
 */
export const getChannelMessages = async (channelId, options = {}) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    const response = await channel.query({
      messages: {
        limit: options.limit || 50,
        id_lt: options.lastId
      }
    });
    return response.messages;
  } catch (error) {
    Logger.error('Failed to get Stream Chat messages', { error });
    throw new ApiError(500, 'Failed to get chat messages');
  }
};

/**
 * Initialize a Stream channel
 */
export const initializeStreamChannel = async (chatId, memberIds) => {
  try {
    const channelId = `room_${chatId}`;
    
    // Try to get existing channel first
    let channel = streamClient.channel('messaging', channelId);
    let channelExists = false;

    try {
      const query = await channel.query({ state: true });
      channelExists = !!query.channel;
    } catch (err) {
      // Channel doesn't exist, we'll create it
      channelExists = false;
    }

    if (!channelExists) {
      // Create new channel
      channel = await streamClient.channel('messaging', channelId, {
        members: memberIds,
        created_by_id: memberIds[0]
      });
      await channel.create();
    }

    return {
      id: channelId,
      type: 'messaging',
      members: memberIds
    };
  } catch (error) {
    Logger.error('Failed to initialize Stream channel', {
      error: error.message,
      chatId,
      memberIds
    });
    throw new ApiError(500, 'Failed to initialize chat channel');
  }
};
