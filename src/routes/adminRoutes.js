import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import { verifyAdmin } from '../middleware/adminMiddleware.js';
import {
  adminLogin,
  getDashboardStats,
  getInternationalDistribution,
  getVerificationStats,
  getAllProperties,
  getPropertyDetails,
  verifyProperty,
  updatePropertyStatus,
  getPropertyAnalytics,
  getUsersList,
  updateUserStatus,
  getPropertyStats,
  getPropertiesByHost,
  getPendingVerifications,
  getVerificationDetails,
  reviewVerification,
  getAllCommunitiesAdmin,
  deleteCommunityAdmin,
  unpublishProperty
} from '../controllers/adminController.js';
import {
  getAllListings,
  getListingDetails,
  getMarketplaceAnalytics,
  updateListingStatus,
  getListingReports,
  getFeaturedListings
} from '../controllers/adminMarketController.js';
import {adminLoginRules,
  updatePropertyStatusRules,
  updateUserStatusRules,
  updateListingStatusRules
} from '../validations/adminValidation.js';
import { validatePropertyFilters } from '../middleware/propertyValidation.js';
import { adminVerificationRoutes } from './adminVerificationRoutes.js';
import { body } from 'express-validator';

const router = express.Router();

// Authentication
router.post(
  '/login',
  adminLoginRules,
  validateRequest,
  adminLogin
);

// Dashboard Routes
router.get(
  '/dashboard',
  authenticateToken,
  verifyAdmin,
  getDashboardStats
);

router.get(
  '/international-stats',
  authenticateToken,
  verifyAdmin,
  getInternationalDistribution
);

router.get(
  '/verification-stats',
  authenticateToken,
  verifyAdmin,
  getVerificationStats
);

// Property Management Routes
router.get(
  '/properties',
  authenticateToken,
  verifyAdmin,
  validatePropertyFilters,
  getAllProperties
);

router.get(
  '/properties/:propertyId',
  authenticateToken,
  verifyAdmin,
  getPropertyDetails
);

router.get(
  '/properties/:propertyId/stats',
  authenticateToken,
  verifyAdmin,
  getPropertyStats
);

router.get(
  '/hosts/:hostId/properties',
  authenticateToken,
  verifyAdmin,
  getPropertiesByHost
);

router.post(
  '/properties/:propertyId/verify',
  authenticateToken,
  authorize(['admin']),
  [
    body('status').optional().isIn(['verified', 'rejected']),
    body('reason').optional().isString().trim()
  ],
  validateRequest,
  verifyProperty
);

router.put(
  '/properties/:propertyId/status',
  authenticateToken,
  verifyAdmin,
  updatePropertyStatusRules,
  validateRequest,
  updatePropertyStatus
);

router.post(
  '/properties/:propertyId/unpublish',
  authenticateToken,
  authorize(['admin']),
  unpublishProperty
);

router.get(
  '/properties/:propertyId/analytics',
  authenticateToken,
  verifyAdmin,
  getPropertyAnalytics
);


// User Management Routes
router.get(
  '/users',
  authenticateToken,
  verifyAdmin,
  getUsersList
);

router.put(
  '/users/:userId/status',
  authenticateToken,
  verifyAdmin,
  updateUserStatusRules,
  validateRequest,
  updateUserStatus
);

// Marketplace Management Routes
router.get(
  '/marketplace/listings',
  authenticateToken,
  verifyAdmin,
  getAllListings
);

router.get(
  '/marketplace/listings/:listingId',
  authenticateToken,
  verifyAdmin,
  getListingDetails
);

router.put(
  '/marketplace/listings/:listingId/status',
  authenticateToken,
  verifyAdmin,
  updateListingStatusRules,
  validateRequest,
  updateListingStatus
);

router.get(
  '/marketplace/analytics',
  authenticateToken,
  verifyAdmin,
  getMarketplaceAnalytics
);

router.get(
  '/marketplace/listings/:listingId/reports',
  authenticateToken,
  verifyAdmin,
  getListingReports
);

router.get(
  '/marketplace/featured',
  authenticateToken,
  verifyAdmin,
  getFeaturedListings
);

/**
 * @route GET /api/admin/communities
 * @desc Get all communities with detailed information (Admin only)
 * @access Private (Admin)
 */
router.get('/communities', 
  authenticateToken, 
  verifyAdmin, 
  getAllCommunitiesAdmin
);

/**
 * @route DELETE /api/admin/communities/:communityId
 * @desc Delete a community (Admin only)
 * @access Private (Admin)
 */
router.delete('/communities/:communityId', 
  authenticateToken, 
  verifyAdmin, 
  deleteCommunityAdmin
);

router.use('/verification', adminVerificationRoutes);

export const adminRoutes = router;
