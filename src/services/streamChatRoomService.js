import streamClient from '../config/streamChatConfig.js';
import { Logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

export const initializeChatRoom = async (userId, roomId, userData, roomData) => {
  try {
    const channelId = `room_${roomId}`;

    // Extract member IDs from the room data
    const members = roomData.members
      .filter(m => m?.userId?._id)
      .map(m => m.userId._id.toString());

    // Ensure the current user is included
    if (!members.includes(userId)) {
      members.push(userId);
    }

    // Create channel with Stream
    const channel = streamClient.channel('messaging', channelId, {
      name: `Room ${roomId}`,
      members: members,
      created_by_id: userId,
      // Add additional metadata
      room_type: roomData.type,
      initiator_id: roomData.initiator,
      created_at: roomData.createdAt
    });

    await channel.create();

    // Add members to the channel
    const memberData = members.map(memberId => ({
      user_id: memberId.toString()
    }));
    
    await channel.addMembers(memberData);

    Logger.info('Chat room initialized successfully', {
      channelId,
      userId,
      memberCount: members.length
    });

    return {
      channelId,
      members: memberData,
      channelData: {
        id: channel.id,
        type: channel.type,
        memberCount: members.length,
        createdBy: userId
      }
    };
  } catch (error) {
    Logger.error('Failed to initialize chat room', {
      error: error.message,
      userId,
      roomId
    });
    throw new ApiError(500, 'Failed to initialize chat room');
  }
};

