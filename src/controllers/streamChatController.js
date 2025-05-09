import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as streamChatService from '../services/streamChatService.js';
import streamClient from '../config/streamChatConfig.js';

export const createDirectChannel = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user.id;

    const channelId = [userId, recipientId].sort().join('-');
    
    const channel = await streamChatService.createChannel(channelId, {
      name: `${userId}-${recipientId}`,
      members: [userId, recipientId],
      createdBy: userId
    });

    Logger.info('Direct channel created', {
      channelId: channel.id,
      members: [userId, recipientId]
    });

    res.json({
      success: true,
      data: {
        channel: channel.id,
        members: channel.state.members
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getChannels = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const channels = await streamClient.queryChannels(
      { members: { $in: [userId] } },
      { last_message_at: -1 },
      { limit: 30 }
    );

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    next(error);
  }
};
