import { Server } from 'socket.io';
import { authenticateSocket } from '../middleware/socketAuthMiddleware.js';
import { Logger } from '../utils/logger.js';
import { initializeWishlistHandlers } from '../controllers/wishlistSocketController.js';

export const initializeSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  // Add authentication middleware
  io.use(authenticateSocket);

  // Handle connection
  io.on('connection', (socket) => {
    Logger.info('Client connected', { socketId: socket.id, userId: socket.user?.id });

    // Initialize wishlist handlers
    initializeWishlistHandlers(socket);

    socket.on('disconnect', () => {
      Logger.info('Client disconnected', { socketId: socket.id });
    });
  });

  return io;
};
