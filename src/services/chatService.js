import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';
import { uploadToS3, getFileType, generateThumbnail } from '../utils/s3Service.js';
import { Logger } from '../utils/logger.js';
import { User } from '../models/User.js';
import * as streamChatService from './streamChatService.js';

export const findPrivateChatBetweenUsers = async (userId1, userId2) => {
  const chat = await Chat.findOne({
    type: 'private',
    'members.userId': {
      $all: [userId1, userId2]
    },
    isActive: true
  }).populate('members.userId', 'username avatar lastSeen');

  return chat;
};

export const createPrivateChat = async (initiatorId, recipientId) => {
  try {
    // Check if users exist
    const [initiator, recipient] = await Promise.all([
      User.findById(initiatorId),
      User.findById(recipientId)
    ]);

    if (!initiator || !recipient) {
      throw new ApiError(404, 'One or both users not found');
    }

    // Check for existing chat between these users
    const existingChat = await Chat.findOne({
      type: 'private',
      'members.userId': { $all: [initiatorId, recipientId] },
      isActive: true
    }).populate('members.userId', 'username avatar email');

    if (existingChat) {
      // Use createChannel instead of initializeStreamChannel
      const streamChannel = await streamChatService.createChannel(existingChat._id.toString(), {
        members: [initiatorId, recipientId],
        name: `${initiatorId}-${recipientId}`,
        type: 'messaging'
      });
      
      return {
        chat: existingChat,
        streamChannel,
        isNew: false
      };
    }

    // Create new chat if none exists
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create local chat room
      const chat = await Chat.create([{
        type: 'private',
        members: [
          { userId: initiatorId, role: 'member' },
          { userId: recipientId, role: 'member' }
        ],
        createdBy: initiatorId,
        initiator: initiatorId,
        status: 'active',
        metadata: {
          memberCount: 2,
          lastActivity: new Date()
        }
      }], { session });

      // Create Stream Chat channel
      const channelId = [initiatorId, recipientId].sort().join('-');
      const streamChannel = await streamChatService.createChannel(channelId, {
        name: channelId,
        members: [initiatorId, recipientId].map(id => id.toString()),
        createdBy: initiatorId.toString(),
        chatId: chat[0]._id.toString()
      });

      await session.commitTransaction();

      // Populate member details
      const populatedChat = await Chat.findById(chat[0]._id)
        .populate('members.userId', 'username avatar email');

      Logger.info('Private chat and channel created', {
        chatId: chat[0]._id,
        channelId: streamChannel.id || streamChannel.cid
      });

      return {
        chat: populatedChat,
        streamChannel: {
          id: streamChannel.id || streamChannel.cid,
          type: streamChannel.type || 'messaging',
          members: streamChannel.state?.members || []
        },
        isNew: true
      };

    } catch (error) {
      await session.abortTransaction();
      Logger.error('Failed to create private chat', { 
        error: error.message,
        initiatorId,
        recipientId
      });
      throw new ApiError(500, `Failed to create private chat: ${error.message}`);
    } finally {
      session.endSession();
    }
  } catch (error) {
    Logger.error('Failed to create private chat', {
      error: error.message,
      initiatorId,
      recipientId
    });
    throw error;
  }
};

export const getPrivateChatById = async (chatId, userId) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const chat = await Chat.findOne({
      _id: chatId,
      type: 'private',
      'members.userId': userObjectId,
      isActive: true
    })
    .populate({
      path: 'members.userId',
      select: 'username avatar lastSeen email'
    })
    .lean();

    if (!chat) {
      throw new ApiError(404, 'Chat not found or access denied');
    }

    // Get the current user's member object
    const currentUserMember = chat.members.find(m => 
      m.userId && m.userId._id.toString() === userObjectId.toString()
    );

    if (!currentUserMember) {
      throw new ApiError(403, 'You are not a member of this chat');
    }

    // Get the other member
    const otherMember = chat.members.find(m => 
      m.userId?._id?.toString() !== userObjectId.toString()
    );

    return {
      ...chat,
      otherUser: otherMember?.userId || {
        _id: null,
        username: 'Deleted User',
        avatar: null
      },
      unreadCount: otherMember?.userId ? await Message.countDocuments({
        chatId,
        sender: otherMember.userId._id,
        readBy: { $ne: userObjectId }
      }) : 0
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error retrieving chat: ${error.message}`);
  }
};

export const getPrivateChatMessages = async (chatId, userId, page = 1, limit = 20) => {
  // Verify user has access to this chat
  const chat = await Chat.findOne({
    _id: chatId,
    type: 'private',
    'members.userId': userId
  });

  if (!chat) {
    throw new ApiError(404, 'Chat not found or access denied');
  }

  const options = {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: {
      path: 'sender',
      select: 'username avatar'
    }
  };

  return await Message.paginate({ chatId }, options);
};

export const sendMessage = async (roomId, userId, messageData) => {
  try {
    // Handle multiple content types in one message
    const message = new Message({
      roomId,
      sender: new mongoose.Types.ObjectId(userId),
      content: messageData.content,
      type: messageData.type,
      metadata: {
        ...messageData.metadata,
        attachments: messageData.attachments || []
      },
      readBy: [{ userId: new mongoose.Types.ObjectId(userId), readAt: new Date() }]
    });

    await message.save();

    // Get current chat to increment message count
    const chat = await Chat.findById(roomId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Update chat's last message and metadata
    await Chat.findByIdAndUpdate(
      roomId,
      {
        $set: {
          lastMessage: {
            content: messageData.type === 'text' ? messageData.content : 'Sent an attachment',
            sender: new mongoose.Types.ObjectId(userId),
            type: messageData.type,
            timestamp: new Date()
          },
          'metadata.lastActivity': new Date()
        },
        $inc: { 'metadata.messageCount': 1 }
      },
      { new: true }
    );

    // Populate the sender information before returning
    await message.populate('sender', 'username email avatar');

    return message;
  } catch (error) {
    Logger.error('Failed to send message', { error: error.message });
    throw error;
  }
};

export const getUserChats = async (userId, page = 1, limit = 10, options = {}) => {
  const { includeRecentMessages = false, recentMessagesLimit = 20 } = options;

  const query = {
    'members.userId': userId,
    isActive: true
  };

  const populateOptions = [
    {
      path: 'members.userId',
      select: 'email avatar username'
    }
  ];

  // Add messages population if requested
  if (includeRecentMessages) {
    populateOptions.push({
      path: 'messages',
      options: {
        sort: { createdAt: -1 },
        limit: recentMessagesLimit
      },
      populate: {
        path: 'sender',
        select: 'username avatar'
      }
    });
  }

  const chats = await Chat.paginate(query, {
    page,
    limit,
    populate: populateOptions,
    sort: { 'metadata.lastActivity': -1 }
  });

  return chats;
};

export const getChatMessages = async (chatId, userId, page = 1, limit = 50) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  if (!chat.isMember(userId)) {
    throw new ApiError(403, 'You are not a member of this chat');
  }

  return await Message.paginate(
    { roomId: chatId },
    {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'sender', select: 'username email avatar' },
        { path: 'replyTo', select: 'content sender' }
      ]
    }
  );
};

export const getPrivateChatDetails = async (chatId, userId) => {
  const chat = await Chat.findById(chatId)
    .populate('members.userId', 'username email phoneNumber profilePicture joinDate') // Populate user details
    .select('-messages'); // Exclude messages if needed

  // Check if user is a member of the chat
  if (!chat || !chat.members.some(m => m.userId.toString() === userId)) {
    throw new ApiError(403, 'You are not a member of this chat');
  }

  return chat;
};

export const getChatById = async (chatId) => {
  const chat = await Chat.findById(chatId)
    .populate('members.userId', 'username avatar')
    .populate('messages');

  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  return chat;
};

export const addMemberToCommunity = async (chatId, currentUserId, memberIds) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const chat = await Chat.findById(chatId).session(session);
    
    if (!chat) {
      throw new ApiError(404, 'Chat not found');
    }

    const currentMember = chat.members.find(m => 
      m.userId.toString() === currentUserId && 
      ['admin', 'moderator'].includes(m.role)
    );

    if (!currentMember) {
      throw new ApiError(403, 'Only admins and moderators can add members');
    }

    const existingMembers = chat.members.map(m => m.userId.toString());
    const newMemberIds = memberIds.filter(id => !existingMembers.includes(id.toString()));

    if (newMemberIds.length === 0) {
      throw new ApiError(400, 'All members are already in the chat');
    }

    
    const newMembers = newMemberIds.map(userId => ({
      userId,
      role: 'member',
      joinedAt: new Date()
    }));

    chat.members.push(...newMembers);
    chat.metadata.memberCount = chat.members.length;

    await chat.save({ session });
    await session.commitTransaction();

    await chat.populate('members.userId', 'username email avatar');

    return chat;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const cleanupInvalidChats = async () => {
  try {
    const chatsWithNullMembers = await Chat.find({
      'members.userId': null
    });

    for (const chat of chatsWithNullMembers) {
      chat.members = chat.members.filter(member => member.userId != null);
      chat.metadata.memberCount = chat.members.length;
      
      if (chat.members.length < 2) {
        chat.isActive = false;
      }
      
      await chat.save();
    }
  } catch (error) {
    Logger.error('Failed to cleanup invalid chats', { error: error.message });
  }
};

export const updateChatStatus = async (chatId, status, metadata = {}) => {
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      status,
      'metadata.statusUpdatedAt': new Date(),
      'metadata.statusUpdatedBy': metadata.updatedBy,
      'metadata.statusReason': metadata.reason,
      'metadata.lastActivity': new Date()
    },
    { new: true }
  );

  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  return chat;
};

export const getChannelList = async (userId, options = {}) => {
  try {
    const query = {
      'members.userId': userId,
      isActive: true
    };

    const channels = await Chat.paginate(
      query,
      {
        page: options.page || 1,
        limit: options.limit || 20,
        sort: { updatedAt: -1 },
        populate: [
          {
            path: 'members.userId',
            select: 'username email avatar lastSeen'
          },
          {
            path: 'lastMessage'
          }
        ]
      }
    );

    // Get Stream Chat details for each channel
    const enhancedChannels = await Promise.all(
      channels.docs.map(async (channel) => {
        try {
          const streamChannel = await streamChatService.getChannel(`room_${channel._id}`);
          return {
            ...channel.toObject(),
            streamData: {
              id: streamChannel.id,
              type: streamChannel.type,
              memberCount: Object.keys(streamChannel.state.members).length,
              lastMessage: streamChannel.state.lastMessage
            }
          };
        } catch (error) {
          Logger.warn('Failed to get Stream channel details', {
            channelId: channel._id,
            error: error.message
          });
          return channel;
        }
      })
    );

    return {
      ...channels,
      docs: enhancedChannels
    };
  } catch (error) {
    Logger.error('Failed to get channel list', {
      error: error.message,
      userId
    });
    throw new ApiError(500, 'Failed to get channel list');
  }
};

export const getMyChannels = async (userId, options = {}) => {
  try {
    const query = {
      'members.userId': userId,
      isActive: true
    };

    // Add type filter if specified
    if (options.type) {
      query.type = options.type;
    }

    const channels = await Chat.paginate(
      query,
      {
        page: options.page || 1,
        limit: options.limit || 20,
        sort: { updatedAt: -1 },
        populate: [
          {
            path: 'members.userId',
            select: 'username email avatar lastSeen'
          },
          {
            path: 'lastMessage'
          }
        ]
      }
    );

    Logger.info('User channels retrieved successfully', {
      userId,
      channelCount: channels.totalDocs
    });

    return channels;
  } catch (error) {
    Logger.error('Failed to get user channels', {
      error: error.message,
      userId
    });
    throw new ApiError(500, 'Failed to get user channels');
  }
};

export const getUserChatRooms = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 20, type, sort = 'recent' } = options;

    const query = {
      'members.userId': userId,
      isActive: true
    };

    // Add type filter if specified (private, group, community)
    if (type) {
      query.type = type;
    }

    // Define sort options
    let sortOption = {};
    switch (sort) {
      case 'recent':
        sortOption = { 'metadata.lastActivity': -1 };
        break;
      case 'created':
        sortOption = { createdAt: -1 };
        break;
      case 'name':
        sortOption = { name: 1 };
        break;
      default:
        sortOption = { 'metadata.lastActivity': -1 };
    }

    const rooms = await Chat.paginate(
      query,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: sortOption,
        populate: [
          {
            path: 'members.userId',
            select: 'username avatar lastSeen email'
          },
          {
            path: 'lastMessage',
            populate: {
              path: 'sender',
              select: 'username avatar'
            }
          }
        ],
        select: '-__v'
      }
    );

    // Get Stream Chat details for each room
    const enhancedRooms = await Promise.all(
      rooms.docs.map(async (room) => {
        try {
          const channelId = room.type === 'community' ? 
            `community_${room._id}` : 
            room.members.map(m => m.userId._id).sort().join('-');

          const streamChannel = await streamChatService.getChannel(channelId);
          return {
            ...room.toObject(),
            streamChat: {
              channelId: streamChannel.id,
              type: streamChannel.type,
              memberCount: Object.keys(streamChannel.state.members).length,
              unreadCount: streamChannel.state.unreadCount || 0
            }
          };
        } catch (error) {
          Logger.warn('Failed to get Stream channel details', {
            roomId: room._id,
            error: error.message
          });
          return room;
        }
      })
    );

    return {
      ...rooms,
      docs: enhancedRooms
    };
  } catch (error) {
    Logger.error('Failed to get user chat rooms', {
      error: error.message,
      userId
    });
    throw new ApiError(500, 'Failed to get chat rooms');
  }
};