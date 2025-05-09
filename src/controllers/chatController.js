import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as chatService from '../services/chatService.js';
import mongoose from 'mongoose';
import streamClient from '../config/streamChatConfig.js';
import { User } from '../models/User.js';

export const createPrivateChat = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const initiatorId = req.user.id;

    if (!recipientId) {
      throw new ApiError(400, 'Recipient ID is required');
    }

    if (recipientId === initiatorId) {
      throw new ApiError(400, 'Cannot create chat with yourself');
    }

    const result = await chatService.createPrivateChat(initiatorId, recipientId);

    Logger.info(result.isNew ? 'Private chat created' : 'Existing chat retrieved', {
      chatId: result.chat._id,
      channelId: result.streamChannel.id,
      initiator: initiatorId,
      recipient: recipientId,
      isNew: result.isNew
    });

    res.status(result.isNew ? 201 : 200).json({
      success: true,
      message: result.isNew ? 
        'Private chat created successfully' : 
        'Chat already exists between these users',
      data: {
        chat: {
          _id: result.chat._id,
          members: result.chat.members.map(member => ({
            userId: member.userId._id,
            username: member.userId.username,
            avatar: member.userId.avatar,
            role: member.role
          })),
          type: result.chat.type,
          status: result.chat.status,
          createdAt: result.chat.createdAt,
          metadata: result.chat.metadata
        },
        streamChat: {
          channelId: result.streamChannel.id,
          channelType: result.streamChannel.type,
          members: result.streamChannel.members
        },
        isNew: result.isNew
      }
    });
  } catch (error) {
    Logger.error('Failed to create private chat', { 
      error: error.message,
      initiator: req.user?.id,
      recipient: req.body?.recipientId 
    });
    next(new ApiError(
      error.statusCode || 500,
      error.message || 'Failed to create private chat'
    ));
  }
};

export const addMembers = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { memberIds } = req.body;
    const currentUserId = req.user.id;

    // Validate input
    if (!roomId) {
      throw ApiError.badRequest('Room ID is required');
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      throw ApiError.badRequest('Member IDs must be a non-empty array');
    }

    // Prevent adding self
    if (memberIds.includes(currentUserId)) {
      throw ApiError.badRequest('Cannot add yourself to the chat');
    }

    // Check for duplicate members
    if (new Set(memberIds).size !== memberIds.length) {
      throw ApiError.badRequest('Duplicate member IDs are not allowed');
    }

    // Add members to the community chat
    const room = await chatService.addMemberToCommunity(roomId, currentUserId, memberIds);

    Logger.info('Members added to chat room successfully', { 
      roomId,
      addedMembers: memberIds
    });

    res.json({
      success: true,
      message: 'Members added successfully',
      data: room,
    });
  } catch (error) {
    Logger.error('Failed to add members to chat room', { error: error.message });
    next(error);
  }
};

export const getUserChats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 30, offset = 0 } = req.query;

    // Get channels from Stream Chat
    const filter = {
      type: 'messaging',
      members: { $in: [userId.toString()] }
    };

    const sort = { last_message_at: -1 };
    const channels = await streamClient.queryChannels(filter, sort, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      state: true,
      presence: true,
      messages: { limit: 1 }
    });

    // Get all unique user IDs from channels
    const userIds = new Set();
    channels.forEach(channel => {
      Object.values(channel.state.members || {}).forEach(member => {
        if (member.user?.id) userIds.add(member.user.id);
      });
    });

    // Fetch user details from MongoDB
    const users = await User.find(
      { _id: { $in: Array.from(userIds) } },
      'username email avatar lastSeen'
    );

    // Create users lookup map
    const usersMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    // Format channels with user details
    const formattedChannels = channels
      .filter(channel => channel.id && channel.id.startsWith('room_'))
      .map(channel => ({
        channelId: channel.cid,
        roomId: channel.id.split('room_')[1],
        members: Object.values(channel.state.members || {}).map(member => ({
          userId: member.user?.id,
          username: usersMap[member.user?.id]?.username || 'Unknown User',
          email: usersMap[member.user?.id]?.email,
          avatar: usersMap[member.user?.id]?.avatar,
          lastSeen: usersMap[member.user?.id]?.lastSeen,
          isOnline: !!member.online
        })),
        lastMessage: channel.state.messages?.[0] 
          ? {
              ...channel.state.messages[0],
              user: {
                ...channel.state.messages[0].user,
                username: usersMap[channel.state.messages[0].user?.id]?.username,
                avatar: usersMap[channel.state.messages[0].user?.id]?.avatar
              }
            }
          : null,
        unreadCount: channel.state.unreadCount || 0,
        updatedAt: channel.last_message_at || channel.created_at
      }));

    Logger.info('Room chats fetched successfully', {
      userId,
      channelCount: formattedChannels.length
    });

    return res.json({
      success: true,
      data: formattedChannels,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: channels.length === parseInt(limit)
      }
    });

  } catch (error) {
    Logger.error('Failed to fetch user chats', {
      error: error.message,
      userId: req.user?.id
    });
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getChatMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate input
    if (!roomId) {
      throw ApiError.badRequest('Room ID is required');
    }

    if (isNaN(page) || isNaN(limit)) {
      throw ApiError.badRequest('Page and limit must be valid numbers');
    }

    // Fetch chat messages
    const messages = await chatService.getChatMessages(
      roomId,
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );

    Logger.info('Chat messages fetched successfully', { roomId });

    res.json({
      success: true,
      data: messages.docs,
      pagination: {
        total: messages.totalDocs,
        page: messages.page,
        pages: messages.totalPages,
        hasNext: messages.hasNextPage,
      },
    });
  } catch (error) {
    Logger.error('Failed to fetch chat messages', { error: error.message });
    next(error);
  }
};

export const getPrivateChatDetails = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      throw new ApiError(400, 'Invalid room ID format');
    }

    try {
      const chat = await chatService.getPrivateChatById(roomId, req.user.id);
      
      Logger.info('Private chat details retrieved successfully', { 
        roomId,
        userId: req.user.id 
      });

      res.json({
        success: true,
        data: chat,
      });
    } catch (error) {
      if (error.statusCode === 404) {
        throw new ApiError(404, error.message);
      } else if (error.statusCode === 400) {
        throw new ApiError(400, error.message);
      }
      throw error;
    }
  } catch (error) {
    Logger.error('Failed to retrieve private chat details', { 
      error: error.message,
      roomId: req.params.roomId,
      userId: req.user.id
    });
    next(error);
  }
};

export const getChatById = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    // Validate input
    if (!roomId) {
      throw ApiError.badRequest('Room ID is required');
    }

    // Fetch chat details
    const chat = await chatService.getChatById(roomId, req.user.id);

    if (!chat) {
      throw ApiError.notFound('Chat not found');
    }

    Logger.info('Chat details retrieved successfully', { roomId });

    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    Logger.error('Failed to retrieve chat details', { error: error.message });
    next(error);
  }
};

export const getPrivateChatById = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.id;

    // Validate input
    if (!chatId) {
      throw ApiError.badRequest('Chat ID is required');
    }

    // Get chat with member details
    const chat = await chatService.getPrivateChatById(chatId, currentUserId);

    if (!chat) {
      throw ApiError.notFound('Chat not found or you do not have access');
    }

    Logger.info('Private chat retrieved successfully', { chatId });

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    Logger.error('Failed to retrieve private chat', { error: error.message });
    next(error);
  }
};

export const getMyChannels = async (req, res, next) => {
  try {
    const { page, limit, type } = req.query;
    
    const channels = await chatService.getMyChannels(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type
    });

    res.json({
      success: true,
      data: channels.docs,
      pagination: {
        total: channels.totalDocs,
        page: channels.page,
        pages: channels.totalPages,
        hasNext: channels.hasNextPage,
        hasPrev: channels.hasPrevPage
      }
    });
  } catch (error) {
    Logger.error('Failed to get user channels', { 
      error: error.message,
      userId: req.user.id 
    });
    next(error);
  }
};

// Update existing getChannelList function
export const getChannelList = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    
    const channels = await chatService.getChannelList(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.json({
      success: true,
      data: channels.docs,
      pagination: {
        total: channels.totalDocs,
        page: channels.page,
        pages: channels.totalPages,
        hasNext: channels.hasNextPage,
        hasPrev: channels.hasPrevPage
      }
    });
  } catch (error) {
    Logger.error('Failed to get channel list', { 
      error: error.message,
      userId: req.user.id 
    });
    next(error);
  }
};

export const getUserRooms = async (req, res, next) => {
  try {
    const { 
      page, 
      limit, 
      type,  // 'private', 'group', 'community'
      sort   // 'recent', 'created', 'name'
    } = req.query;

    const rooms = await chatService.getUserChatRooms(req.user.id, {
      page,
      limit,
      type,
      sort
    });

    res.json({
      success: true,
      data: rooms.docs.map(room => ({
        id: room._id,
        name: room.name || room.members
          .filter(m => m.userId._id.toString() !== req.user.id)
          .map(m => m.userId.username)
          .join(', '),
        type: room.type,
        avatar: room.avatar,
        memberCount: room.members.length,
        lastMessage: room.lastMessage,
        lastActivity: room.metadata?.lastActivity,
        unreadCount: room.streamChat?.unreadCount || 0,
        streamChat: room.streamChat,
        members: room.members.map(m => ({
          id: m.userId._id,
          username: m.userId.username,
          avatar: m.userId.avatar,
          role: m.role,
          lastSeen: m.userId.lastSeen
        }))
      })),
      pagination: {
        total: rooms.totalDocs,
        page: rooms.page,
        pages: rooms.totalPages,
        hasNext: rooms.hasNextPage
      }
    });
  } catch (error) {
    Logger.error('Failed to get user rooms', { 
      error: error.message,
      userId: req.user.id 
    });
    next(error);
  }
};