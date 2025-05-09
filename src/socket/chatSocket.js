import { Server } from 'socket.io';
import { Logger } from '../utils/logger.js';
import * as chatService from '../services/chatService.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { uploadToS3, generateThumbnail } from '../utils/fileUpload.js';

// Track online users and their status
const onlineUsers = new Map();

// Rate limiter for socket events
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 1
});

// Rate limiter specifically for chat messages
const chatRateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 1
});

// Active typing users in each room
const typingUsers = new Map();

// Clean up typing status after inactivity
const cleanupTyping = (roomId, userId) => {
  setTimeout(() => {
    const roomTyping = typingUsers.get(roomId);
    if (roomTyping?.has(userId)) {
      roomTyping.delete(userId);
      if (roomTyping.size === 0) {
        typingUsers.delete(roomId);
      }
    }
  }, 5000);
};

export const handleChatEvents = (io, socket) => {
  const userId = socket.user.id;

  // Track user presence
  onlineUsers.set(userId, {
    socketId: socket.id,
    lastActive: new Date(),
    status: 'online'
  });

  // Broadcast online status
  io.emit('users-online', {
    users: Array.from(onlineUsers.entries()).map(([id, data]) => ({
      userId: id,
      status: data.status,
      lastActive: data.lastActive
    }))
  });

  // Handle user presence
  socket.on('set-presence', (status) => {
    const userPresence = onlineUsers.get(userId);
    if (userPresence) {
      userPresence.status = status;
      userPresence.lastActive = new Date();
      
      io.emit('presence-update', {
        userId,
        status,
        lastActive: userPresence.lastActive
      });
    }
  });

  // Join chat room
  socket.on('joinRoom', async ({ roomId }) => {
    try {
      const chat = await Chat.findOne({
        _id: roomId,
        'members.userId': userId,
        isActive: true
      });

      if (!chat) {
        socket.emit('error', { message: 'Access denied to chat room' });
        return;
      }

      socket.join(roomId);
      Logger.info('User joined chat room', { userId, roomId });

      // Get online status of room members
      const onlineMembers = chat.members
        .map(member => ({
          userId: member.userId,
          isOnline: onlineUsers.has(member.userId.toString()),
          lastActive: onlineUsers.get(member.userId.toString())?.lastActive
        }));

      // Notify room about user joining and online status
      io.to(roomId).emit('room-update', {
        type: 'user-joined',
        userId,
        timestamp: new Date(),
        onlineMembers
      });

    } catch (error) {
      Logger.error('Join room failed', { error: error.message });
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle new messages with attachments
  socket.on('sendMessage', async (data) => {
    try {
      if (!data.roomId) {
        socket.emit('error', { 
          message: 'roomId is required',
          code: 'ROOM_REQUIRED'
        });
        return;
      }

      await chatRateLimiter.consume(socket.id);
      const { roomId, content, files, type = 'text' } = data;

      // Use the authenticated user object from socket
      const sender = socket.user;
      if (!sender) {
        throw new Error('User not authenticated');
      }

      // Handle file uploads if present
      let attachments = [];
      if (files && files.length > 0) {
        attachments = await Promise.all(files.map(async (file) => {
          const uploadResult = await uploadToS3(file);
          
          let attachment = {
            url: uploadResult.url,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name,
            size: file.size,
            mimeType: file.type,
            uploadedBy: {
              userId: sender._id,
              username: sender.username
            }
          };

          if (file.type.startsWith('image/')) {
            const thumbnail = await generateThumbnail(file);
            if (thumbnail) {
              const thumbUpload = await uploadToS3(thumbnail, 'thumbnails/');
              attachment.thumbnailUrl = thumbUpload.url;
            }
          }

          return attachment;
        }));
      }

      // Create message
      const message = await chatService.sendMessage(roomId, sender._id, {
        content,
        type: attachments.length > 0 ? 'mixed' : type,
        attachments,
        metadata: {
          hasAttachments: attachments.length > 0,
          attachmentCount: attachments.length,
          deviceInfo: data.deviceInfo || {},
          clientTimestamp: data.timestamp,
          edited: false
        }
      });

      // Prepare sender information
      const senderInfo = {
        _id: sender._id,
        username: sender.username,
        displayName: sender.profile?.displayName || sender.username,
        avatar: sender.avatar,
        role: sender.role,
        status: sender.status,
        lastSeen: sender.lastSeen,
        isOnline: true
      };

      // Emit to room
      io.to(roomId).emit('newMessage', {
        ...message.toJSON(),
        sender: senderInfo,
        room: { id: roomId },
        metadata: {
          ...message.metadata,
          deliveredAt: new Date(),
          clientId: data.clientId
        }
      });

      // Send acknowledgment
      socket.emit('messageSent', {
        success: true,
        message: {
          ...message.toJSON(),
          sender: senderInfo
        },
        roomId: message.roomId,
        timestamp: new Date(),
        messageId: message._id,
        clientId: data.clientId
      });

      // Update room's last activity
      await Chat.findByIdAndUpdate(roomId, {
        lastMessage: {
          content: content.length > 50 ? `${content.substring(0, 50)}...` : content,
          sender: sender._id,
          type: message.type,
          timestamp: new Date()
        },
        'metadata.lastActivity': new Date()
      });

    } catch (error) {
      Logger.error('Send message failed', { 
        error: error.message,
        userId: socket.user?._id,
        data 
      });
      socket.emit('error', { 
        message: 'Failed to send message',
        error: error.message,
        code: error.code || 'MESSAGE_SEND_FAILED'
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove user from online tracking
    onlineUsers.delete(userId);

    // Broadcast offline status
    io.emit('presence-update', {
      userId,
      status: 'offline',
      lastActive: new Date()
    });

    // Remove from all typing indicators
    for (const [roomId, typingSet] of typingUsers.entries()) {
      if (typingSet.has(userId)) {
        typingSet.delete(userId);
        if (typingSet.size === 0) {
          typingUsers.delete(roomId);
        }
        // Notify room about typing status change
        io.to(roomId).emit('typingStatus', {
          roomId,
          users: Array.from(typingSet)
        });
      }
    }

    Logger.info('User disconnected from chat', { userId });
  });

  // Join user's rooms
  socket.on('join-rooms', async (rooms) => {
    if (!Array.isArray(rooms)) {
      return socket.emit('error', { message: 'Invalid rooms format' });
    }

    rooms.forEach((room) => {
      socket.join(room);
      Logger.info('User joined room', { userId, roomId: room });
    });
  });

  // Handle file upload and message sending
  socket.on('send-message', async (data, callback) => {
    try {
      // Validate input
      if (!data.roomId) {
        return callback({ success: false, message: 'Room ID is required' });
      }

      // Rate limit message sending
      await rateLimiter.consume(socket.handshake.address, 1);

      let messageData = {
        content: data.content,
        type: 'text',
        replyTo: data.replyTo
      };

      // Handle file uploads if present
      if (data.files && data.files.length > 0) {
        messageData.files = data.files;
      }

      const message = await chatService.sendMessage(
        data.roomId,
        userId,
        messageData
      );

      // Broadcast to room
      io.to(data.roomId).emit('new-message', {
        roomId: data.roomId,
        message,
      });

      // Send acknowledgment
      callback({ 
        success: true, 
        messageId: message._id,
        attachments: message.attachments 
      });
    } catch (error) {
      Logger.error('Failed to send message', { error: error.message });
      callback({ success: false, message: error.message });
    }
  });

  // Typing indicator
  socket.on('typing-start', (roomId) => {
    if (!roomId) return;

    socket.to(roomId).emit('user-typing', {
      roomId,
      userId,
    });
  });

  socket.on('typing-stop', (roomId) => {
    if (!roomId) return;

    socket.to(roomId).emit('user-stopped-typing', {
      roomId,
      userId,
    });
  });

  // Mark messages as read
  socket.on('mark-read', async (data, callback) => {
    try {
      const { roomId, messageIds } = data;

      // Validate input
      if (!roomId || !messageIds || !Array.isArray(messageIds)) {
        return callback({ success: false, message: 'Invalid input' });
      }

      // Update message read status
      await chatService.markMessagesAsRead(roomId, messageIds, userId);

      // Notify other users
      socket.to(roomId).emit('messages-read', {
        roomId,
        messageIds,
        userId,
      });

      callback({ success: true });
    } catch (error) {
      Logger.error('Error marking messages as read', { error: error.message });
      callback({ success: false, message: error.message });
    }
  });

  // Message editing
  socket.on('edit-message', async (data, callback) => {
    try {
      const { messageId, content } = data;
      const editedMessage = await chatService.editMessage(messageId, userId, content);
      
      io.to(editedMessage.roomId).emit('message-edited', {
        messageId,
        content,
        editedAt: new Date()
      });
      
      callback({ success: true });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // Message deletion
  socket.on('delete-message', async (data, callback) => {
    try {
      const { messageId } = data;
      await chatService.deleteMessage(messageId, userId);
      
      io.to(data.roomId).emit('message-deleted', { messageId });
      callback({ success: true });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // Voice messages
  socket.on('voice-message', async (data, callback) => {
    try {
      const { roomId, audioBlob } = data;
      const message = await chatService.sendVoiceMessage(roomId, userId, audioBlob);
      
      io.to(roomId).emit('new-voice-message', {
        roomId,
        message
      });
      
      callback({ success: true, messageId: message._id });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // User is viewing a chat room
  socket.on('view-room', (roomId) => {
    socket.viewing = roomId;
    socket.to(roomId).emit('user-viewing', {
      roomId,
      userId,
    });
  });

  // Leave room view
  socket.on('leave-room-view', (roomId) => {
    socket.viewing = null;
    socket.to(roomId).emit('user-left-view', {
      roomId,
      userId,
    });
  });

  // Message reactions
  socket.on('add-reaction', async (data, callback) => {
    try {
      const { messageId, reaction } = data;
      await chatService.addReaction(messageId, userId, reaction);
      
      io.to(data.roomId).emit('message-reaction-added', {
        messageId,
        userId,
        reaction
      });
      
      callback({ success: true });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // User activity tracking
  socket.on('activity-update', (data) => {
    const { roomId, activity } = data;
    
    if (!roomActivity.has(roomId)) {
      roomActivity.set(roomId, new Map());
    }
    
    roomActivity.get(roomId).set(userId, {
      activity,
      timestamp: new Date()
    });

    socket.to(roomId).emit('user-activity', {
      roomId,
      userId,
      activity
    });
  });

  // Message forwarding
  socket.on('forward-message', async (data, callback) => {
    try {
      const { messageId, targetRoomIds } = data;
      const forwardedMessages = await chatService.forwardMessage(
        messageId,
        targetRoomIds,
        userId
      );
      
      // Notify each target room
      forwardedMessages.forEach(msg => {
        io.to(msg.roomId).emit('new-message', {
          roomId: msg.roomId,
          message: msg
        });
      });
      
      callback({ success: true });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // Handle user idle state
  let idleTimeout;
  socket.on('active', () => {
    clearTimeout(idleTimeout);
    if (socket.presence === 'idle') {
      socket.presence = 'online';
      socket.broadcast.emit('user-presence', {
        userId,
        status: 'online'
      });
    }
  });

  socket.on('inactive', () => {
    idleTimeout = setTimeout(() => {
      socket.presence = 'idle';
      socket.broadcast.emit('user-presence', {
        userId,
        status: 'idle'
      });
    }, 300000); // 5 minutes
  });

  // Handle private chat initialization
  socket.on('init-private-chat', async (data, callback) => {
    try {
      const { recipientId } = data;
      
      if (!recipientId) {
        return callback({ 
          success: false, 
          message: 'Recipient ID is required',
          code: 'RECIPIENT_REQUIRED'
        });
      }

      if (!socket.user?.id) {
        return callback({ 
          success: false, 
          message: 'User not authenticated',
          code: 'AUTH_REQUIRED'
        });
      }

      // Create or get existing private chat room
      const chat = await chatService.createPrivateChat(socket.user.id, recipientId);

      // Join the room
      socket.join(chat._id.toString());

      // Notify the recipient if they're online
      const recipientSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.user?.id === recipientId);

      if (recipientSocket) {
        recipientSocket.join(chat._id.toString());
        recipientSocket.emit('private-chat-created', {
          roomId: chat._id,
          initiator: {
            id: socket.user.id,
            username: socket.user.username
          }
        });
      }

      // Send success response with updated structure
      callback({
        success: true,
        data: {
          roomId: chat._id,
          members: chat.members.map(m => ({
            userId: m.userId._id,
            username: m.userId.username,
            avatar: m.userId.avatar
          })),
          messages: chat.messages || [],
          createdBy: chat.createdBy.username,
          createdAt: chat.createdAt
        }
      });

      Logger.info('Private chat initialized', {
        roomId: chat._id,
        initiator: socket.user.id,
        recipient: recipientId
      });
    } catch (error) {
      Logger.error('Failed to initialize private chat', { error: error.message });
      callback({ 
        success: false, 
        message: 'Failed to initialize private chat',
        error: error.message,
        code: 'CHAT_INIT_FAILED'
      });
    }
  });

  // Handle private chat acceptance
  socket.on('accept-private-chat', async (data, callback) => {
    try {
      const { roomId } = data;

      if (!roomId) {
        return callback({ success: false, message: 'Room ID is required' });
      }

      // Verify user is part of the chat
      const chat = await chatService.getChatById(roomId);
      if (!chat.isMember(userId)) {  // Use the new isMember method
        throw new Error('Unauthorized to join this chat');
      }

      // Join the room
      socket.join(roomId);

      // Notify other participants
      socket.to(roomId).emit('user-joined-chat', {
        roomId,
        user: {
          id: userId,
          username: socket.user.username
        }
      });

      callback({ success: true });

      Logger.info('User joined private chat', {
        roomId,
        userId,
      });
    } catch (error) {
      Logger.error('Failed to accept private chat', { error: error.message });
      callback({ success: false, message: error.message });
    }
  });

  // Handle private chat rejection
  socket.on('reject-private-chat', async (data, callback) => {
    try {
      const { roomId, reason } = data;

      if (!roomId) {
        return callback({ success: false, message: 'Room ID is required' });
      }

      // Update chat room status
      await chatService.updateChatStatus(roomId, 'rejected', {
        rejectedBy: userId,
        reason
      });

      // Notify other participants
      socket.to(roomId).emit('private-chat-rejected', {
        roomId,
        user: {
          id: userId,
          username: socket.user.username
        },
        reason
      });

      // Leave the room
      socket.leave(roomId);

      callback({ success: true });

      Logger.info('Private chat rejected', {
        roomId,
        userId,
        reason
      });
    } catch (error) {
      Logger.error('Failed to reject private chat', { error: error.message });
      callback({ success: false, message: error.message });
    }
  });

  // Handle get messages request
  socket.on('get-messages', async (data, callback) => {
    try {
      const { roomId, page = 1, limit = 50 } = data;

      if (!roomId) {
        return callback({ success: false, message: 'Room ID is required' });
      }

      // Validate numeric inputs
      if (isNaN(page) || isNaN(limit)) {
        return callback({ success: false, message: 'Invalid page or limit value' });
      }

      // Get messages with pagination
      const messages = await chatService.getChatMessages(
        roomId,
        userId,
        parseInt(page),
        parseInt(limit)
      );

      // Send success response with messages
      callback({
        success: true,
        data: {
          messages: messages.docs,
          pagination: {
            total: messages.totalDocs,
            page: messages.page,
            pages: messages.totalPages,
            hasNext: messages.hasNextPage,
            hasPrev: messages.hasPrevPage
          }
        }
      });

      // Mark messages as read
      if (messages.docs.length > 0) {
        const messageIds = messages.docs
          .filter(msg => !msg.readBy.includes(userId))
          .map(msg => msg._id);

        if (messageIds.length > 0) {
          await chatService.markMessagesAsRead(roomId, messageIds, userId);

          // Notify other users that messages were read
          socket.to(roomId).emit('messages-read', {
            roomId,
            messageIds,
            userId,
          });
        }
      }

      Logger.info('Messages fetched successfully', {
        roomId,
        userId,
        count: messages.docs.length
      });
    } catch (error) {
      Logger.error('Failed to fetch messages', { error: error.message });
      callback({
        success: false,
        message: error.message || 'Failed to fetch messages'
      });
    }
  });

  // Handle create private chat
  socket.on('create-private-chat', async (data) => {
    try {
      console.log('Creating private chat:', data);
      const { recipientId, initialMessage } = data;

      if (!recipientId) {
        socket.emit('error', { 
          message: 'Recipient ID is required',
          code: 'RECIPIENT_REQUIRED'
        });
        return;
      }

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        socket.emit('error', { 
          message: 'Invalid recipient ID format',
          code: 'INVALID_ID'
        });
        return;
      }

      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        socket.emit('error', {
          message: 'Recipient user not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Check if chat already exists between these users
      const existingChat = await Chat.findOne({
        type: 'private',
        members: {
          $all: [
            { $elemMatch: { userId: socket.user.id } },
            { $elemMatch: { userId: recipientId } }
          ]
        },
        isActive: true
      });

      if (existingChat) {
        socket.emit('private-chat-created', {
          success: true,
          data: {
            chatId: existingChat._id,
            members: existingChat.members,
            initialMessage: null,
            createdAt: existingChat.createdAt,
            type: existingChat.type,
            status: existingChat.status
          }
        });
        return;
      }

      // Create new chat room
      const chat = new Chat({
        type: 'private',
        members: [
          { userId: socket.user.id, role: 'member' },
          { userId: recipientId, role: 'member' }
        ],
        isActive: true,
        createdBy: socket.user.id,
        initiator: socket.user.id,
        metadata: {
          messageCount: 0,
          lastActivity: new Date()
        },
        status: 'active',
        lastMessage: {
          content: initialMessage || '',
          sender: socket.user.id,
          type: 'text',
          timestamp: new Date()
        }
      });

      await chat.save();
      console.log('Created private chat:', chat);

      // Join the room
      socket.join(chat._id.toString());

      // Send initial message if provided
      let message;
      if (initialMessage) {
        message = await chatService.sendMessage(chat._id, socket.user.id, {
          content: initialMessage,
          type: 'text'
        });
        console.log('Sent initial message:', message);

        // Update chat's last message
        await Chat.findByIdAndUpdate(chat._id, {
          lastMessage: {
            content: initialMessage,
            sender: socket.user.id,
            type: 'text',
            timestamp: new Date()
          },
          'metadata.messageCount': 1,
          'metadata.lastActivity': new Date()
        });
      }

      // Populate member details
      await chat.populate('members.userId', 'username email avatar');

      // Emit success event to creator
      socket.emit('private-chat-created', {
        success: true,
        data: {
          chatId: chat._id,
          members: chat.members.map(member => ({
            userId: member.userId._id,
            username: member.userId.username,
            avatar: member.userId.avatar,
            role: member.role
          })),
          initialMessage: message,
          createdAt: chat.createdAt,
          type: chat.type,
          status: chat.status
        }
      });

      // Notify the recipient
      socket.to(recipientId.toString()).emit('private-chat-received', {
        chatId: chat._id,
        initiator: {
          id: socket.user.id,
          username: socket.user.username
        },
        initialMessage: message,
        createdAt: chat.createdAt,
        type: chat.type,
        status: chat.status
      });

      Logger.info('Private chat created successfully', {
        chatId: chat._id,
        initiator: socket.user.id,
        recipient: recipientId
      });

    } catch (error) {
      console.error('Private chat creation error:', error);
      Logger.error('Failed to create private chat', { 
        error: error.message,
        initiator: socket.user.id,
        recipient: data?.recipientId 
      });
      
      let errorMessage = 'Failed to create private chat';
      let errorCode = 'CHAT_CREATION_FAILED';

      if (error.name === 'ValidationError') {
        errorMessage = Object.values(error.errors)
          .map(err => err.message)
          .join(', ');
        errorCode = 'VALIDATION_ERROR';
      }
      
      socket.emit('error', {
        message: errorMessage,
        error: error.message,
        code: errorCode
      });
    }
  });

  // Handle typing status
  socket.on('typing', async ({ roomId, isTyping }) => {
    try {
      await chatRateLimiter.consume(socket.id);

      let roomTyping = typingUsers.get(roomId);
      if (!roomTyping) {
        roomTyping = new Set();
        typingUsers.set(roomId, roomTyping);
      }

      if (isTyping) {
        roomTyping.add(userId);
      } else {
        roomTyping.delete(userId);
      }

      // Notify room about typing status
      socket.to(roomId).emit('typingStatus', {
        roomId,
        users: Array.from(roomTyping)
      });

      if (isTyping) {
        cleanupTyping(roomId, userId);
      }
    } catch (error) {
      Logger.error('Typing status update failed', { error: error.message });
    }
  });

  // Handle read receipts
  socket.on('markRead', async ({ roomId, messageIds }) => {
    try {
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          roomId: roomId
        },
        {
          $addToSet: {
            'readBy': {
              userId,
              readAt: new Date()
            }
          }
        }
      );

      // Notify room about read status
      io.to(roomId).emit('messagesRead', {
        userId,
        messageIds,
        timestamp: new Date()
      });
    } catch (error) {
      Logger.error('Mark read failed', { error: error.message });
    }
  });

  // Leave chat room
  socket.on('leaveRoom', ({ roomId }) => {
    socket.leave(roomId);
    
    // Remove from typing users
    const roomTyping = typingUsers.get(roomId);
    if (roomTyping) {
      roomTyping.delete(userId);
      if (roomTyping.size === 0) {
        typingUsers.delete(roomId);
      }
    }

    // Notify room about user leaving
    socket.to(roomId).emit('userLeft', {
      userId,
      timestamp: new Date()
    });

    Logger.info('User left chat room', { userId, roomId });
  });

  // Create chat room
  socket.on('createRoom', async (data, callback) => {
    try {
      console.log('Creating room with data:', data); // Debug log

      const { name, members } = data;
      
      // Create new chat room
      const chat = new Chat({
        name,
        members: [
          { userId: socket.user.id }, // Add current user
          ...(members || []).map(memberId => ({ userId: memberId }))
        ],
        type: 'group',
        isActive: true,
        createdBy: socket.user.id
      });

      await chat.save();

      console.log('Created chat room:', chat); // Debug log

      // Join the room
      socket.join(chat._id.toString());

      // Notify members
      chat.members.forEach(member => {
        io.to(member.userId.toString()).emit('roomCreated', {
          roomId: chat._id,
          name: chat.name,
          members: chat.members,
          createdBy: chat.createdBy
        });
      });

      if (callback) {
        callback({
          success: true,
          roomId: chat._id,
          message: 'Room created successfully'
        });
      }

    } catch (error) {
      console.error('Room creation error:', error); // Debug log
      Logger.error('Failed to create room', { error: error.message });
      if (callback) {
        callback({ success: false, message: 'Failed to create room' });
      }
    }
  });
};

// Export utility function to check online status
export const getOnlineUsers = () => Array.from(onlineUsers.entries());