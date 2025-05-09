import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { handleCommunityUpload } from '../middleware/uploadMiddleware.js';
import {
  createPrivateChat,
  addMembers,
  getUserChats,
  getChatMessages,
  getPrivateChatDetails,
  getChatById,
  getChannelList,
  getMyChannels,
  getUserRooms
} from '../controllers/chatController.js';
import {
  createPrivateChatValidator,
  addMembersRules
} from '../validations/chatValidation.js';
import { initializeRoom } from '../controllers/chatRoomController.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();

// Debug route for token verification
router.get('/debug-token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user,
    tokenInfo: {
      exists: !!req.headers.authorization,
      type: req.headers.authorization?.split(' ')[0],
      preview: req.headers.authorization ? 
        `${req.headers.authorization.split(' ')[1].substr(0, 10)}...` : 
        null
    }
  });
});

// Add this route near the top of your routes
router.get(
  '/rooms',
  authenticateToken,
  getUserRooms
);

// Chat initialization route with logging
router.post(
  '/rooms/:roomId/initialize',
  (req, res, next) => {
    Logger.info('Initializing chat room request received', {
      roomId: req.params.roomId,
      hasAuth: !!req.headers.authorization,
      authHeader: req.headers.authorization ? 'Bearer ...' : 'None'
    });
    next();
  },
  authenticateToken,
  initializeRoom
);

// Regular chat routes
router.post(
  '/private',
  authenticateToken,
  createPrivateChatValidator,
  validateRequest,
  createPrivateChat
);

router.post(
  '/room/:roomId/members',
  authenticateToken,
  addMembersRules,
  validateRequest,
  addMembers
);

// Update the chat list route
router.get(
  '/list',
  authenticateToken,
  getUserChats
);

router.get(
  '/room/:roomId/messages',
  authenticateToken,
  getChatMessages
);

router.get(
  '/private/:roomId',
  authenticateToken,
  getPrivateChatDetails
);

router.get(
  '/room/:roomId',
  authenticateToken,
  getChatById
);

// Get channel list route
router.get(
  '/channels',
  authenticateToken,
  getChannelList
);

// Get list of channels where user is a member
router.get(
  '/my-channels',
  authenticateToken,
  getMyChannels
);


export default router;