import { Server } from 'socket.io';
import { Logger } from '../utils/logger.js';
import { verifyToken } from '../utils/tokenService.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { handleChatEvents } from './chatSocket.js';
import { handleWishlistEvents } from './wishlistSocket.js';
import { User } from '../models/User.js';

let io;

// Track connection attempts and active connections
const connectionAttempts = new Map();
const activeConnections = new Map();

// Rate limiter for socket events
const rateLimiter = new RateLimiterMemory({
  points: 50,
  duration: 1
});

// Updated socket middleware to authenticate users
const authenticateSocket = async (socket, next) => {
  try {
    // Get token from multiple possible locations
    const token = 
      socket.handshake.auth?.token ||
      socket.handshake.headers?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    Logger.info('Auth attempt', { 
      socketId: socket.id,
      hasToken: !!token,
      headers: socket.handshake.headers,
      auth: socket.handshake.auth,
      query: socket.handshake.query
    });

    if (!token) {
      Logger.error('No token provided');
      return next(new Error('Authentication required'));
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      Logger.error('Invalid token', { decoded });
      return next(new Error('Invalid token'));
    }

    // Get user from database
    const user = await User.findById(decoded.id)
      .select('_id username email avatar role profile status lastSeen')
      .lean(); // Use lean() for better performance

    if (!user) {
      Logger.error('User not found', { userId: decoded.id });
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = user;
    Logger.info('Socket authenticated', { 
      userId: user._id,
      socketId: socket.id 
    });

    next();
  } catch (error) {
    Logger.error('Socket authentication failed', {
      error: error.message,
      stack: error.stack
    });
    next(new Error('Authentication failed'));
  }
};

// Handle rate limiting
const handleRateLimit = async (socket, next) => {
  try {
    await rateLimiter.consume(socket.id);
    next();
  } catch (error) {
    Logger.warn('Rate limit exceeded', { socketId: socket.id });
    next(new Error('Too many requests'));
  }
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Be more specific in production
      methods: ['GET', 'POST'],
      allowedHeaders: ['token', 'authorization', 'content-type'],
      credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowUpgrades: true,
    cookie: false
  });

  // Log all engine level events
  io.engine.on("initial_headers", (headers, req) => {
    Logger.info('Socket initial headers', {
      url: req.url,
      method: req.method,
      headers: req.headers
    });
  });

  io.engine.on("headers", (headers, req) => {
    Logger.info('Socket headers', {
      url: req.url,
      method: req.method,
      headers: req.headers
    });
  });

  io.engine.on("connection_error", (err) => {
    Logger.error('Socket connection error', {
      error: err.message,
      code: err.code,
      context: err.context,
      timestamp: new Date()
    });
  });

  // Apply middleware
  io.use(authenticateSocket);
  // Comment out rate limiting for testing
  // io.use(handleRateLimit);

  io.on('connection', async (socket) => {
    try {
      const user = socket.user;
      Logger.info('Client connected', {
        socketId: socket.id,
        userId: user._id,
        username: user.username
      });

      // Add to active connections
      activeConnections.set(socket.id, {
        userId: user._id,
        user: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar
        },
        connectedAt: new Date(),
        status: 'online'
      });

      Logger.info('Client connected', {
        socketId: socket.id,
        userId: user._id,
        username: user.username
      });

      // Log current connection stats
      Logger.info('Connection statistics', {
        totalAttempts: connectionAttempts.size,
        activeConnections: activeConnections.size,
        timestamp: new Date()
      });

      // Join user's personal room
      socket.join(user._id.toString());

      // Add a simple ping event for testing
      socket.on('ping', (callback) => {
        Logger.info('Ping received', { 
          socketId: socket.id,
          userId: user._id
        });
        
        if (typeof callback === 'function') {
          callback({
            status: 'success',
            message: 'pong',
            timestamp: new Date(),
            socketId: socket.id
          });
        } else {
          socket.emit('pong', {
            timestamp: new Date(),
            socketId: socket.id
          });
        }
      });

      // Handle user presence
      socket.on('setPresence', async (status) => {
        try {
          io.to(user._id.toString()).emit('presenceUpdate', {
            userId: user._id,
            status: status,
            lastSeen: new Date()
          });
        } catch (error) {
          Logger.error('Presence update failed', { error: error.message });
        }
      });

      // Setup chat event handlers
      handleChatEvents(io, socket);

      // Add wishlist handlers
      handleWishlistEvents(io, socket);

      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          // Remove from tracking
          connectionAttempts.delete(socket.id);
          activeConnections.delete(socket.id);

          Logger.info('Client disconnected', { 
            socketId: socket.id,
            userId: user._id,
            ip: socket.handshake.address,
            disconnectedAt: new Date(),
            connectionDuration: `${(new Date() - socket.handshake.issued) / 1000}s`
          });

          // Log updated stats
          Logger.info('Connection statistics after disconnect', {
            totalAttempts: connectionAttempts.size,
            activeConnections: activeConnections.size,
            timestamp: new Date()
          });

        } catch (error) {
          Logger.error('Disconnect handling failed', { error: error.message });
        }
      });
    } catch (error) {
      Logger.error('Connection handler error', { 
        error: error.message,
        socketId: socket.id 
      });
      socket.disconnect(true);
    }
  });

  return io;
};

// Export utility functions for monitoring
export const getConnectionStats = () => ({
  totalAttempts: connectionAttempts.size,
  activeConnections: activeConnections.size,
  attemptDetails: Array.from(connectionAttempts.entries()),
  activeDetails: Array.from(activeConnections.entries())
});

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const closeSocket = async () => {
  if (io) {
    // Close all client connections
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }
    
    // Close server
    await new Promise(resolve => {
      io.close(() => {
        Logger.info('All socket connections closed');
        io = null;
        resolve();
      });
    });
  }
};

// Helper functions for socket operations
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToRoom = (roomId, event, data) => {
  if (!io) return;
  io.to(roomId).emit(event, data);
};

export const broadcastToAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

export { io };