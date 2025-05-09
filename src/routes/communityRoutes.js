import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import { handleCommunityUpload, handleCommunityEventUpload } from '../middleware/uploadMiddleware.js';
import {
  getCommunityDetails,
  updateCommunity,
  deleteCommunity,
  addMembers,
  removeMembers,
  promoteToModerator,
  getCommunityMembers,
  getCommunityActivities,
  createCommunityRoom,
  getAllCommunities,
  getTrendingCommunities,
  getRecommendedCommunities,
  getUserCommunities,
  getCommunityStats,
  requestToJoin,
  getPendingJoinRequests,
  handleJoinRequest,
  getPublicCommunities,
  getUserMemberships,
  getAllJoinRequests,
  getPendingRequests,
  getJoinRequestStats,
  cancelJoinRequest,
  getMyActiveCommunities,
  getMyPendingRequests,
  createEvent,
  reviewEvent,
  joinEvent,
  getCommunityEvents,
  getPendingEvents,
  getEventDetails,
  listCommunityEvents
} from '../controllers/communityController.js';
import {
  createCommunityRules,
  updateCommunityRules,
  memberManagementRules,
  createCommunityValidator,
  communityQueryRules,
  handleJoinRequestRules
} from '../validations/communityValidation.js';

const router = express.Router();

// Place static routes before dynamic routes
router.get('/memberships', authenticateToken, getUserMemberships);
router.get('/public', authenticateToken, communityQueryRules, validateRequest, getPublicCommunities);
router.get('/trending', getTrendingCommunities);
router.get('/recommended', authenticateToken, getRecommendedCommunities);
router.get('/user', authenticateToken, getUserCommunities);

// Create community route
router.post(
  '/',
  authenticateToken,
  handleCommunityUpload,
  createCommunityValidator,
  validateRequest,
  createCommunityRoom
);

// Add these routes before dynamic routes
router.get('/join-requests/all', authenticateToken, authorize(['admin']), getAllJoinRequests);
router.get('/join-requests/pending', authenticateToken, authorize(['admin']), getPendingRequests);
router.get('/join-requests/stats', authenticateToken, authorize(['admin']), getJoinRequestStats);
router.post('/:communityId/join', authenticateToken, requestToJoin);
router.put('/join-requests/:requestId', authenticateToken, handleJoinRequest);
router.delete('/join-requests/:requestId', authenticateToken, cancelJoinRequest);

// Add these routes before your dynamic routes
router.get('/my/active', authenticateToken, getMyActiveCommunities);
router.get('/my/pending-requests', authenticateToken, getMyPendingRequests);

// Add these new routes before your existing routes
router.post(
  '/:communityId/events',
  authenticateToken,
  handleCommunityEventUpload,
  createEvent
);

router.put(
  '/events/:eventId/review',
  authenticateToken,
  reviewEvent
);

router.post(
  '/events/:eventId/join',
  authenticateToken,
  joinEvent
);

router.get(
  '/:communityId/events',
  authenticateToken,
  getCommunityEvents
);

router.get(
  '/:communityId/events/pending',
  authenticateToken,
  getPendingEvents
);

// Add these event-related routes
router.get(
  '/:communityId/events/:eventId',
  authenticateToken,
  getEventDetails
);

router.get(
  '/:communityId/events',
  authenticateToken,
  listCommunityEvents
);

// Place dynamic routes (with parameters) last
router.get('/:communityId', authenticateToken, getCommunityDetails);
router.put(
  '/:communityId',
  authenticateToken,
  handleCommunityUpload,
  updateCommunityRules,
  validateRequest,
  updateCommunity
);

router.delete(
  '/:communityId',
  authenticateToken,
  deleteCommunity
);

router.post(
  '/:communityId/members',
  authenticateToken,
  memberManagementRules,
  validateRequest,
  addMembers
);

router.delete(
  '/:communityId/members',
  authenticateToken,
  memberManagementRules,
  validateRequest,
  removeMembers
);

router.post(
  '/:communityId/moderators',
  authenticateToken,
  memberManagementRules,
  validateRequest,
  promoteToModerator
);

router.get(
  '/:communityId/members',
  authenticateToken,
  getCommunityMembers
);

router.get(
  '/:communityId/activities',
  authenticateToken,
  getCommunityActivities
);

/**
 * @route GET /api/community
 * @desc Get all communities with filters and search
 * @access Public
 */
router.get(
  '/',
  communityQueryRules,
  validateRequest,
  getAllCommunities
);

/**
 * @route GET /api/community/:communityId/stats
 * @desc Get community statistics
 * @access Private
 */
router.get(
  '/:communityId/stats',
  authenticateToken,
  getCommunityStats
);

// Existing join request routes
router.post(
  '/:communityId/join',
  authenticateToken,
  requestToJoin
);

router.get(
  '/:communityId/join-requests',
  authenticateToken,
  getPendingJoinRequests
);

router.put(
  '/join-requests/:requestId',
  authenticateToken,
  handleJoinRequestRules,
  validateRequest,
  handleJoinRequest
);

export const communityRoutes = router;