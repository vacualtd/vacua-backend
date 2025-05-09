import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyLandlord } from '../middleware/landlordMiddleware.js';
import { handleMultipleUpload } from '../middleware/uploadMiddleware.js';
import { validatePropertyFilters } from '../middleware/propertyValidation.js';
import {
  initializePropertyListing,
  setPropertyLocation,
  updatePropertySize,
  uploadPropertyPhotos,
  setPropertyPrice,
  setPropertyFeatures,
  publishProperty,
  getAllProperties,
  getLandlordProperties,
  updatePropertyDetails,
  updatePropertyDescription,
  setPropertySize,
  setPropertyDescription,
  getPropertyById,
  updatePropertyLocation,
  updatePropertyAmenities,
  updatePropertyRules,
  updatePropertyAvailability,
  updatePropertyPricing,
  unpublishProperty,
  getStudentProperties,
  getLandlordMarketplace,
  createLandlordProfile,
  deleteProperty,
  getRelatedProperties,
  getPropertyRecommendations,
  getTopCities
} from '../controllers/propertyController.js';
import {
  initializePropertyRules,
  propertyLocationRules,
  propertyPriceRules,
  updatePropertySizeRules,
  propertyFeaturesRules,
  propertyQueryRules,
  updatePropertyDescriptionRules,
  propertySizeRules,
  propertyDescriptionRules,
  propertyAmenitiesRules,
  propertyRulesRules,
  propertyAvailabilityRules,
  propertyPricingRules,
  validateLandlordProfile
} from '../validations/propertyValidation.js';
import {
  addToWishlist,
  getWishlist,
  updateWishlistItem,
  removeFromWishlist,
  getWishlistStats
} from '../controllers/wishlistController.js';
import {
  addToWishlistRules,
  updateWishlistRules
} from '../validations/wishlistValidation.js';

const router = express.Router();

/**
 * @route GET /api/property/top-cities
 * @desc Get top cities with most property listings
 * @access Public
 * @query {number} [limit=10] - Number of top cities to return
 * @returns {object} Array of cities with stats
 */
router.get('/top-cities', getTopCities);

/**
 * @route POST /api/property/landlord/profile
 * @desc Create a new landlord profile
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @body {string} businessName - Business name
 * @body {string} phoneNumber - Phone number
 * @body {string} address - Address
 * @body {string} city - City
 * @body {string} state - State
 * @body {string} zipCode - Zip code
 * @body {string} businessLicense - Business license
 * @body {string} taxId - Tax ID
 * @body {array} propertyTypes - List of property types
 * @body {string} description - Description
 * @returns {object} Created landlord profile
 */
router.post(
  '/landlord/profile',
  authenticateToken,
  validateLandlordProfile,
  validateRequest,
  createLandlordProfile
);

/**
 * @route POST /api/property/initialize
 * @desc Initialize a new property listing draft
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @body {string} type - Property type (Studio Apartment/House/Apartment/Room)
 * @returns {object} New property draft object
 */
router.post(
  '/initialize',
  authenticateToken,
  verifyLandlord,
  initializePropertyRules,
  validateRequest,
  initializePropertyListing
);

/**
 * @route POST /api/property/location
 * @desc Set property location details
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @body {string} address - Full property address
 * @body {string} city - City name
 * @body {object} [coordinates] - Optional lat/lng coordinates
 * @body {number} coordinates.lat - Latitude
 * @body {number} coordinates.lng - Longitude
 * @returns {object} Updated property object
 */

/**
 * @route PUT /api/property/:propertyId/description
 * @desc Update property description information
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @param {string} propertyId - Property ID
 * @body {string} title - Property title
 * @body {string} overview - Property overview
 * @body {string} cancellationPolicy - Cancellation policy (flexible/moderate/strict)
 * @returns {object} Updated property
 */
router.put(
  '/:propertyId/description',
  authenticateToken,
  verifyLandlord,
  updatePropertyDescriptionRules,
  validateRequest,
  updatePropertyDescription
);


router.post(
  '/size',
  authenticateToken,
  verifyLandlord,
  propertySizeRules,
  validateRequest,
  setPropertySize
);

/**
 * @route POST /api/property/description
 * @desc Set property description information
 * @access Private - Landlords only
 */
router.post(
  '/description',
  authenticateToken,
  verifyLandlord,
  propertyDescriptionRules,
  validateRequest,
  setPropertyDescription
);

router.post(
  '/location',
  authenticateToken,
  verifyLandlord,
  propertyLocationRules,
  validateRequest,
  setPropertyLocation
);

/**
 * @route PUT /api/property/:propertyId/size
 * @desc Update property size information
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @param {string} propertyId - Property ID
 * @body {number} size - Property size value
 * @body {string} [unit=sqft] - Size unit (sqft/sqm)
 * @body {object} [dimensions] - Property dimensions
 * @returns {object} Updated property
 */
router.put(
  '/:propertyId/size',
  authenticateToken,
  verifyLandlord,
  updatePropertySizeRules,
  validateRequest,
  updatePropertySize
);


/**
 * @route POST /api/property/photos
 * @desc Upload property photos
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @body {array} images - Property photos (max 5 files, 5MB each)
 * @returns {object} Updated property with new photos
 */
router.post(
  '/photos',
  authenticateToken,
  verifyLandlord,
  handleMultipleUpload,
  uploadPropertyPhotos
);

/**
 * @route POST /api/property/price
 * @desc Set property price
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @body {number} price - Monthly rent price
 * @returns {object} Updated property object
 */
router.post(
  '/price',
  authenticateToken,
  verifyLandlord,
  propertyPriceRules,
  validateRequest,
  setPropertyPrice
);

/**
 * @route POST /api/property/features
 * @desc Set property features and amenities
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @body {object} rooms - Room configuration
 * @body {number} rooms.bedroom - Number of bedrooms
 * @body {number} rooms.bathroom - Number of bathrooms
 * @body {array} amenities - List of amenities
 * @returns {object} Updated property object
 */
router.post(
  '/features',
  authenticateToken,
  verifyLandlord,
  propertyFeaturesRules,
  validateRequest,
  setPropertyFeatures
);

/**
 * @route POST /api/property/publish
 * @desc Publish property listing
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @returns {object} Published property object
 */
router.post(
  '/publish',
  authenticateToken,
  verifyLandlord,
  publishProperty
);


/**
 * @route GET /api/property
 * @desc Get all published properties with filters
 * @access Public
 * @query {number} [page=1] - Page number
 * @query {number} [limit=10] - Items per page
 * @query {string} [type] - Property type filter
 * @query {string} [city] - City filter
 * @query {number} [minPrice] - Minimum price filter
 * @query {number} [maxPrice] - Maximum price filter
 * @query {string} [sortBy=createdAt] - Sort field
 * @query {string} [sortOrder=desc] - Sort order (asc/desc)
 * @returns {object} Paginated property listings
 */
router.get('/', propertyQueryRules, validateRequest, getAllProperties);
/**
 * @route GET /api/property
 * @desc Get all published properties with filters
 * @access Public
 * @query {number} [page=1] - Page number
 * @query {number} [limit=10] - Items per page
 * @query {string} [type] - Property type filter
 * @query {string} [city] - City filter
 * @query {number} [minPrice] - Minimum price filter
 * @query {number} [maxPrice] - Maximum price filter
 * @query {string} [sortBy=createdAt] - Sort field
 * @query {string} [sortOrder=desc] - Sort order (asc/desc)
 * @returns {object} Paginated property listings
 */

/**
 * @route GET /api/property/my-properties
 * @desc Get landlord's properties
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @query {number} [page=1] - Page number
 * @query {number} [limit=10] - Items per page
 * @query {string} [status] - Filter by status
 * @query {string} [sortBy=createdAt] - Sort field
 * @query {string} [sortOrder=desc] - Sort order
 * @returns {object} Paginated landlord properties
 */
router.get(
  '/my-properties',
  authenticateToken,
  verifyLandlord,
  getLandlordProperties
);



/**
 * @route PUT /api/property/:propertyId
 * @desc Update property details
 * @access Private - Landlords only
 * @header Authorization - Bearer token
 * @param {string} propertyId - Property ID
 * @body {object} updateData - Property update data
 * @returns {object} Updated property
 */
router.put(
  '/:propertyId',
  authenticateToken,
  verifyLandlord,
  handleMultipleUpload,
  updatePropertyDetails
);


// Wishlist routes
router.get('/wishlist', authenticateToken, getWishlist);
router.get('/wishlist/stats', authenticateToken, getWishlistStats);
router.post(
  '/wishlist/:propertyId',
  authenticateToken,
  addToWishlistRules,
  validateRequest,
  addToWishlist
);
router.put(
  '/wishlist/:propertyId',
  authenticateToken,
  updateWishlistRules,
  validateRequest,
  updateWishlistItem
);
router.delete(
  '/wishlist/:propertyId',
  authenticateToken,
  removeFromWishlist
);


router.get('/:detailId', getPropertyById);

// Property update endpoints
router.put('/:propertyId/location', 
  authenticateToken, 
  verifyLandlord, 
  propertyLocationRules,
  validateRequest, 
  updatePropertyLocation
);

router.put('/:propertyId/amenities', 
  authenticateToken, 
  verifyLandlord, 
  propertyAmenitiesRules, 
  validateRequest, 
  updatePropertyAmenities
);

router.put('/:propertyId/rules', 
  authenticateToken, 
  verifyLandlord, 
  propertyRulesRules, 
  validateRequest, 
  updatePropertyRules
);

router.put('/:propertyId/availability', 
  authenticateToken, 
  verifyLandlord, 
  propertyAvailabilityRules, 
  validateRequest, 
  updatePropertyAvailability
);

router.put('/:propertyId/pricing', 
  authenticateToken, 
  verifyLandlord, 
  propertyPricingRules, 
  validateRequest, 
  updatePropertyPricing
);

// Property publishing
router.post('/:propertyId/publish', 
  authenticateToken, 
  verifyLandlord, 
  publishProperty
);

router.put(
  '/:propertyId/publish',
  authenticateToken,
  verifyLandlord,
  publishProperty
);

router.put(
  '/:propertyId/unpublish',
  authenticateToken,
  verifyLandlord,
  unpublishProperty
);

/**
 * @route GET /api/property/marketplace/student
 * @desc Get properties for students with filters
 * @access Public
 */
router.get(
  '/marketplace/student',
  validatePropertyFilters,
  getStudentProperties
);

/**
 * @route GET /api/property/marketplace/landlord
 * @desc Get properties for landlords with filters
 * @access Private - Landlords only
 */
router.get(
  '/marketplace/landlord',
  authenticateToken,
  verifyLandlord,
  validatePropertyFilters,
  getLandlordMarketplace
);

/**
 * @route DELETE /api/property/:propertyId
 * @desc Delete a property
 * @access Private - Landlords only
 */
router.delete(
  '/:propertyId',
  authenticateToken,
  verifyLandlord,
  deleteProperty
);

/**
 * @route GET /api/property/:propertyId/related
 * @desc Get related properties based on type and location
 * @access Public
 */
router.get(
  '/:propertyId/related',
  getRelatedProperties
);

/**
 * @route GET /api/property/:propertyId/recommendations
 * @desc Get personalized property recommendations
 * @access Private
 */
router.get(
  '/:propertyId/recommendations',
  authenticateToken,
  getPropertyRecommendations
);

export const propertyRoutes = router;