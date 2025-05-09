import { Server } from 'socket.io';
import { Logger } from '../utils/logger.js';
import * as wishlistService from './wishlistService.js';

let io;

export const initializeWishlistSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  io.on('connection', (socket) => {
    Logger.info('Client connected to wishlist socket', {
      socketId: socket.id
    });

    // Join user's personal room
    socket.on('join-wishlist-room', (userId) => {
      socket.join(`wishlist_${userId}`);
      Logger.info('User joined wishlist room', { userId, socketId: socket.id });
    });

    // Handle wishlist item addition
    socket.on('add-to-wishlist', async ({ userId, propertyId, data }) => {
      try {
        const wishlistItem = await wishlistService.addToWishlist(userId, propertyId, data);
        io.to(`wishlist_${userId}`).emit('wishlist-item-added', wishlistItem);
      } catch (error) {
        socket.emit('wishlist-error', {
          action: 'add',
          message: error.message
        });
      }
    });
    

    // Handle wishlist item update
    socket.on('update-wishlist-item', async ({ userId, propertyId, updates }) => {
      try {
        const updatedItem = await wishlistService.updateWishlistItem(userId, propertyId, updates);
        io.to(`wishlist_${userId}`).emit('wishlist-item-updated', updatedItem);
      } catch (error) {
        socket.emit('wishlist-error', {
          action: 'update',
          message: error.message
        });
      }
    });

    // Handle wishlist item removal
    socket.on('remove-from-wishlist', async ({ userId, propertyId }) => {
      try {
        await wishlistService.removeFromWishlist(userId, propertyId);
        io.to(`wishlist_${userId}`).emit('wishlist-item-removed', { propertyId });
      } catch (error) {
        socket.emit('wishlist-error', {
          action: 'remove',
          message: error.message
        });
      }
    });

    // Handle wishlist data request
    socket.on('get-wishlist', async ({ userId, filters, page, limit }) => {
      try {
        const wishlist = await wishlistService.getWishlist(userId, filters, page, limit);
        socket.emit('wishlist-data', wishlist);
      } catch (error) {
        socket.emit('wishlist-error', {
          action: 'get',
          message: error.message
        });
      }
    });

    // Handle wishlist stats request
    socket.on('get-wishlist-stats', async ({ userId }) => {
      try {
        const stats = await wishlistService.getWishlistStats(userId);
        socket.emit('wishlist-stats', stats);
      } catch (error) {
        socket.emit('wishlist-error', {
          action: 'stats',
          message: error.message
        });
      }
    });

    socket.on('disconnect', () => {
      Logger.info('Client disconnected from wishlist socket', {
        socketId: socket.id
      });
    });
  });

  return io;
};

export const emitWishlistUpdate = (userId, event, data) => {
  if (io) {
    io.to(`wishlist_${userId}`).emit(event, data);
  }
};
