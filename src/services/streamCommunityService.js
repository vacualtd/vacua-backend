import streamClient from '../config/streamChatConfig.js';
import { Logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';


export const initializeCommunityChannel = async (communityData, creator) => {
  try {
    const channelId = `community_${communityData._id}`;

    // Check if channel already exists
    try {
      const existingChannel = streamClient.channel('messaging', channelId);
      const { channel } = await existingChannel.query();
      if (channel) {
        Logger.info('Stream Chat channel already exists', { channelId });
        return { channelId, streamChannel: existingChannel };
      }
    } catch (error) {
      // Channel doesn't exist, continue with creation
    }

    // Create new channel
    const channel = streamClient.channel('messaging', channelId, {
      name: communityData.name,
      description: communityData.description,
      image: communityData.avatar?.url,
      created_by_id: creator._id.toString(),
      members: [creator._id.toString()],
      created_at: new Date(),
      // Additional metadata to identify as community
      channel_type: 'community',
      community_id: communityData._id.toString(),
      creator_role: 'admin',
      custom: {
        isCommunity: true,
        communityType: 'public',
        createdBy: creator._id.toString()
      }
    });

    await channel.create();

    // Add the creator as admin
    await channel.addMembers([
      {
        user_id: creator._id.toString(),
        role: 'admin',
        is_moderator: true
      }
    ]);

    Logger.info('Community chat channel created', {
      channelId,
      communityId: communityData._id,
      creatorId: creator._id
    });

    return {
      channelId,
      streamChannel: channel
    };
  } catch (error) {
    Logger.error('Failed to initialize community chat channel', {
      error: error.message,
      communityId: communityData._id
    });
    throw new ApiError(500, 'Failed to initialize community chat');
  }
};


export const addMemberToCommunityChannel = async (channelId, userId, role = 'member') => {
  try {
    // Use 'messaging' type instead of 'community'
    const channel = streamClient.channel('messaging', channelId);

    await channel.addMembers([{
      user_id: userId.toString(),
      role: role,
      is_moderator: role === 'moderator'
    }]);

    Logger.info('Member added to community channel', {
      channelId,
      userId,
      role
    });

    return channel;
  } catch (error) {
    Logger.error('Failed to add member to community channel', {
      error: error.message,
      channelId,
      userId
    });
    throw new ApiError(500, 'Failed to add member to community chat');
  }
};
