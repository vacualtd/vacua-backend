import { Logger } from '../utils/logger.js';
import * as wishlistService from '../services/wishlistService.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter for wishlist operations
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 1
});

export const handleWishlistEvents = (io, socket) => {
  const userId = socket.user.id;

  // Add to wishlist
  socket.on('add-to-wishlist', async (data, callback) => {
    try {
      await rateLimiter.consume(socket.id);
      
      const { propertyId, notes, priority, notifications, addedFromPage } = data;

      if (!propertyId) {
        return callback({ 
          success: false, 
          message: 'Property ID is required' 
        });
      }

      const wishlistItem = await wishlistService.addToWishlist(
        userId,
        propertyId,
        { notes, priority, notifications, addedFromPage }
      );

      // Notify user's other sessions
      socket.to(`user:${userId}`).emit('wishlist-updated', {
        type: 'added',
        item: wishlistItem
      });

      Logger.info('Property added to wishlist via socket', {
        userId,
        propertyId
      });

      callback({
        success: true,
        message: 'Property added to wishlist',
        data: wishlistItem
      });

    } catch (error) {
      Logger.error('Socket: Failed to add to wishlist', { error: error.message });
      
      if (error.code === 11000) {
        return callback({
          success: false,
          message: 'Property is already in your wishlist'
        });
      }

      callback({ 
        success: false, 
        message: 'Failed to add to wishlist',
        error: error.message
      });
    }
  });

  // Get wishlist
  socket.on('get-wishlist', async (data, callback) => {
    try {
      await rateLimiter.consume(socket.id);
      
      const { page = 1, limit = 10, status, priority, sortBy, sortOrder } = data;

      if (isNaN(page) || isNaN(limit)) {
        return callback({
          success: false,
          message: 'Page and limit must be valid numbers'
        });
      }

      const wishlist = await wishlistService.getWishlist(
        userId,
        { status, priority, sortBy, sortOrder },
        parseInt(page),
        parseInt(limit)
      );

      callback({
        success: true,
        data: wishlist.docs,
        pagination: {
          total: wishlist.totalDocs,
          page: wishlist.page,
          pages: wishlist.totalPages,
          hasNext: wishlist.hasNextPage
        }
      });

    } catch (error) {
      Logger.error('Socket: Failed to get wishlist', { error: error.message });
      callback({ 
        success: false, 
        message: 'Failed to retrieve wishlist',
        error: error.message
      });
    }
  });

  // Update wishlist item
  socket.on('update-wishlist-item', async (data, callback) => {
    try {
      await rateLimiter.consume(socket.id);
      
      const { propertyId, notes, priority, notifications, status } = data;

      if (!propertyId) {
        return callback({
          success: false,
          message: 'Property ID is required'
        });
      }

      
      const updatedItem = await wishlistService.updateWishlistItem(
        userId,
        propertyId,
        { notes, priority, notifications, status }
      );

      // Notify user's other sessions
      socket.to(`user:${userId}`).emit('wishlist-updated', {
        type: 'updated',
        item: updatedItem
      });

      callback({
        success: true,
        message: 'Wishlist item updated successfully',
        data: updatedItem
      });

    } catch (error) {
      Logger.error('Socket: Failed to update wishlist item', { error: error.message });
      callback({ 
        success: false, 
        message: 'Failed to update wishlist item',
        error: error.message
      });
    }
  });

  // Remove from wishlist
  socket.on('remove-from-wishlist', async (data, callback) => {
    try {
      await rateLimiter.consume(socket.id);
      
      const { propertyId } = data;

      if (!propertyId) {
        return callback({
          success: false,
          message: 'Property ID is required'
        });
      }

      await wishlistService.removeFromWishlist(userId, propertyId);

      // Notify user's other sessions
      socket.to(`user:${userId}`).emit('wishlist-updated', {
        type: 'removed',
        propertyId
      });

      callback({
        success: true,
        message: 'Property removed from wishlist'
      });

    } catch (error) {
      Logger.error('Socket: Failed to remove from wishlist', { error: error.message });
      callback({ 
        success: false, 
        message: 'Failed to remove from wishlist',
        error: error.message
      });
    }
  });

  // Get wishlist stats
  socket.on('get-wishlist-stats', async (callback) => {
    try {
      await rateLimiter.consume(socket.id);
      
      const stats = await wishlistService.getWishlistStats(userId);

      callback({
        success: true,
        data: stats
      });

    } catch (error) {
      Logger.error('Socket: Failed to get wishlist stats', { error: error.message });
      callback({ 
        success: false, 
        message: 'Failed to retrieve wishlist stats',
        error: error.message
      });
    }
  });

  // Subscribe to wishlist updates
  socket.on('subscribe-to-wishlist', () => {
    socket.join(`wishlist:${userId}`);
    Logger.info('User subscribed to wishlist updates', { userId });
  });

  // Unsubscribe from wishlist updates
  socket.on('unsubscribe-from-wishlist', () => {
    socket.leave(`wishlist:${userId}`);
    Logger.info('User unsubscribed from wishlist updates', { userId });
  });
};
