import { Server } from 'socket.io';
import { authenticateSocket } from '../middleware/socketAuthMiddleware.js';
import { initializeWishlistHandlers } from '../controllers/wishlistSocketController.js';
import { Logger } from '../utils/logger.js';

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

  io.on('connection', (socket) => {
    Logger.info('Socket connected:', {
      socketId: socket.id,
      userId: socket?.user?.id?.toString(),
      hasUser: !!socket.user,
      hasId: !!socket.user?.id
    });

    initializeWishlistHandlers(socket);

    socket.on('disconnect', () => {
      Logger.info('Socket disconnected:', { socketId: socket.id });
    });
  });

  return io;
};
