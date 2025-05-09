import { Logger } from '../utils/logger.js';
import * as wishlistService from '../services/wishlistService.js';
import mongoose from 'mongoose';

export const initializeWishlistHandlers = (socket) => {
  // Validate socket authentication first
  if (!socket.user?.id) {
    Logger.error('Socket not authenticated properly', { socketId: socket.id });
    socket.emit('wishlist-error', { message: 'Authentication required' });
    return null;
  }

  // Convert/validate user ID once for all handlers
  const userId = mongoose.Types.ObjectId.isValid(socket.user.id) ?
    new mongoose.Types.ObjectId(socket.user.id) :
    null;

  if (!userId) {
    Logger.error('Invalid user ID format', { 
      id: socket.user.id,
      socketId: socket.id 
    });
    socket.emit('wishlist-error', { message: 'Invalid user ID format' });
    return null;
  }

  socket.on('add-to-wishlist', async (data = {}) => {
    try {
      if (!data.propertyId) {
        throw new Error('Property ID is required');
      }

      Logger.info('Processing wishlist add:', {
        userId: userId.toString(),
        propertyId: data.propertyId,
        socketId: socket.id
      });

      const propertyId = new mongoose.Types.ObjectId(data.propertyId);
      const item = await wishlistService.addToWishlist(userId, propertyId, {
        notes: data.notes || '',
        priority: data.priority || 'medium',
        notifications: data.notifications ?? true
      });

      socket.emit('wishlist-success', { type: 'add', data: item });

    } catch (error) {
      Logger.error('Wishlist add failed:', {
        error: error.message,
        userId: userId.toString(),
        socketId: socket.id
      });
      socket.emit('wishlist-error', { message: error.message });
    }
  });

  socket.on('get-wishlist', async (data) => {
    try {
      const { page = 1, limit = 20 } = data || {};
      const items = await wishlistService.getWishlist(userId, {}, page, limit);
      
      socket.emit('wishlist-data', items);
    } catch (error) {
      Logger.error('Failed to get wishlist', { error: error.message });
      socket.emit('wishlist-error', { message: error.message });
    }
  });

  // Join rooms
  socket.join(`user_${userId}`);
  socket.join(`wishlist_${userId}`);

  Logger.info('Wishlist handlers initialized', { userId: userId });
};
