import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyLandlord } from '../middleware/landlordMiddleware.js';
import { checkVerificationStatus } from '../middleware/verificationMiddleware.js';
import { handleMultipleUpload } from '../middleware/uploadMiddleware.js';
import { 
  getUploadURL, 
  createListing, 
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  getMyListings,
  searchListings,
  getStudentMarketplace,
  getLandlordMarketplace,
  getRelatedListings,
  getRecommendations
} from '../controllers/marketplaceController.js';
import { 
  createListingRules,
  updateListingRules,
  searchListingRules,
  validateMarketFilters,
  listingQueryRules
} from '../validations/marketplaceValidation.js';

const router = express.Router();

/**
 * @route GET /api/marketplace/listings
 * @desc Get all active listings with optional filters and search
 * @access Public
 * @query {string} [search] - Search term for listings
 * @query {string} [type] - Filter by listing type (product/service/giveaway)
 * @query {string} [location] - Filter by location
 * @query {string} [category] - Filter by category
 * @query {string} [condition] - Filter by condition
 * @query {number} [minPrice] - Minimum price filter
 * @query {number} [maxPrice] - Maximum price filter
 * @query {boolean} [availability] - Filter by availability
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=10] - Items per page (max 50)
 * @query {string} [sortBy=createdAt] - Sort field
 * @query {string} [sortOrder=desc] - Sort order (asc/desc)
 * 
 * @query {boolean} [shuffle=false] - Random sorting
 * @returns {object} Paginated listings data with metadata
 */
router.get('/listings', listingQueryRules, validateRequest, getListings);

/**
 * @route GET /api/marketplace/listings/search
 * @desc Search listings with advanced filters
 * @access Public
 * @query {string} [query] - Search text
 * @query {string} [type] - Listing type
 * @query {string} [location] - Location
 * @query {number} [minPrice] - Minimum price
 * @query {number} [maxPrice] - Maximum price
 * @query {string} [sortBy=createdAt] - Sort field
 * @query {string} [sortOrder=desc] - Sort order
 * @returns {object} Paginated search results
 */
router.get('/listings/search', searchListingRules, validateRequest, searchListings);

/**
 * @route GET /api/marketplace/listings/:id
 * @desc Get single listing by ID
 * @access Public
 * @param {string} id - Listing ID
 * @returns {object} Listing details
 */
router.get('/listings/:id', getListingById);

/**
 * @route GET /api/marketplace/upload-url
 * @desc Get pre-signed URL for image upload
 * @access Private
 * @header Authorization - Bearer token
 * @returns {object} Upload URL and image key
 */
router.get('/upload-url', authenticateToken, getUploadURL);

/**
 * @route GET /api/marketplace/my-listings
 * @desc Get authenticated user's listings
 * @access Private
 * @header Authorization - Bearer token
 * @query {string} [status] - Filter by status
 * @query {number} [page=1] - Page number
 * @query {number} [limit=10] - Items per page
 * @returns {object} Paginated user listings
 */
router.get('/my-listings', authenticateToken, getMyListings);

/**
 * @route POST /api/marketplace/listings
 * @desc Create new listing
 * @access Private
 * @header Authorization - Bearer token
 * @body {string} name - Listing name
 * @body {string} description - Listing description
 * @body {number} price - Price
 * @body {string} location - Location
 * @body {string} type - Listing type
 * @body {array} images - Image files
 * @returns {object} Created listing
 */
router.post(
  '/listings',
  authenticateToken,
  checkVerificationStatus,
  handleMultipleUpload,
  createListingRules,
  validateRequest,
  createListing
);

/**
 * @route PUT /api/marketplace/listings/:id
 * @desc Update existing listing
 * @access Private
 * @header Authorization - Bearer token
 * @param {string} id - Listing ID
 * @body {string} [name] - New name
 * @body {string} [description] - New description
 * @body {number} [price] - New price
 * @body {string} [location] - New location
 * @body {string} [type] - New type
 * @body {array} [images] - New images
 * @returns {object} Updated listing
 */
router.put(
  '/listings/:id',
  authenticateToken,
  checkVerificationStatus,
  handleMultipleUpload,
  updateListingRules,
  validateRequest,
  updateListing
);

/**
 * @route DELETE /api/marketplace/listings/:id
 * @desc Delete a listing
 * @access Private
 */
router.delete(
  '/listings/:id',
  authenticateToken,
  deleteListing
);

/**
 * @route GET /api/marketplace/student
 * @desc Get marketplace products for students with filters
 * @access Public
 */
router.get(
  '/student',
  validateMarketFilters,
  getStudentMarketplace
);

/**
 * @route GET /api/marketplace/landlord
 * @desc Get marketplace products for landlords with filters
 * @access Private - Landlords only
 */
router.get(
  '/landlord',
  authenticateToken,
  checkVerificationStatus,
  validateMarketFilters,
  getLandlordMarketplace
);

/**
 * @route GET /api/marketplace/listings/:id/related
 * @desc Get related products/services based on category and type
 * @access Public
 */
router.get(
  '/listings/:id/related',
  getRelatedListings
);

/**
 * @route GET /api/marketplace/listings/:id/recommendations
 * @desc Get personalized recommendations based on user history
 * @access Private
 */
router.get(
  '/listings/:id/recommendations',
  authenticateToken,
  getRecommendations
);

export const marketplaceRoutes = router;