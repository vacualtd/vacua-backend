import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Logger } from '../utils/logger.js';

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.headers.token;
    console.log('token', token);
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      throw new Error('Invalid user ID in token');
    }

    const userId = new mongoose.Types.ObjectId(decoded.id);

    // Set immutable user object
    Object.defineProperty(socket, 'user', {
      value: Object.freeze({
        id: userId,
        idString: userId.toString(),
        role: decoded.role || 'user'
      }),
      configurable: false,
      writable: false
    });

    Logger.info('Socket authenticated:', {
      userId: socket.user.id.toString(),
      socketId: socket.id
    });

    next();
  } catch (error) {
    Logger.error('Socket auth failed:', error);
    next(new Error(error.message));
  }
};
