import { initializeChatRoom } from '../services/streamChatRoomService.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';

export const initializeRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { roomData } = req.body;

    if (!roomData || !roomData.members) {
      throw new ApiError(400, 'Invalid room data');
    }

    Logger.info('Initializing chat room', {
      roomId,
      userId: req.user.id,
      memberCount: roomData.members.length
    });

    const chatRoom = await initializeChatRoom(
      req.user.id,
      roomId,
      req.user, // Using authenticated user data instead of passed userData
      roomData
    );

    res.json({
      success: true,
      data: chatRoom
    });
  } catch (error) {
    Logger.error('Failed to initialize chat room', {
      error: error.message,
      roomId: req.params.roomId,
      userId: req.user?.id
    });
    next(error);
  }
};
