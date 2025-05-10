import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyStudent } from '../middleware/studentMiddleware.js';
import { handleMultipleUpload } from '../middleware/uploadMiddleware.js';
import { 
  createSharedBedRules, 
  sharedBedQueryRules,
  updateSharedBedRules 
} from '../validations/sharedBedValidation.js';
import {
  createSharedBed,
  getSharedBeds,
  getSharedBedById,
  updateSharedBed,
  deleteSharedBed,
  getMySharedBeds,
  publishSharedBed,
  unpublishSharedBed,
  initializeSharedBed,
  setSharedBedLocation,
  uploadSharedBedPhotos,
  setSharedBedDetails,
  setSharedBedPricing
} from '../controllers/sharedBedController.js';
import { body } from 'express-validator';

const router = express.Router();

// Apply authentication and student verification middleware globally
router.use(authenticateToken);
router.use(verifyStudent);

// Step-by-step creation routes
router.post('/initialize', [
  body('type')
    .notEmpty()
    .withMessage('Bed type is required')
    .isIn(['Single Bed', 'Double Bed', 'Bunk Bed', 'Queen Bed', 'King Bed'])
], validateRequest, initializeSharedBed);

router.post('/location', [
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('zipCode').notEmpty().withMessage('Zip code is required')
], validateRequest, setSharedBedLocation);

router.post('/photos', 
  handleMultipleUpload, 
  uploadSharedBedPhotos
);

router.post('/details', [
  body('bedDetails').isObject().withMessage('Bed details are required'),
  body('bedDetails.bedType').isIn(['Single', 'Double', 'Bunk', 'Queen', 'King']),
  body('bedDetails.isTopBunk').isBoolean().optional(),
  body('bedDetails.hasCurtains').isBoolean().optional(),
  body('bedDetails.hasStorage').isBoolean().optional()
], validateRequest, setSharedBedDetails);

// Set price and availability (Step 5)
router.post('/pricing', [
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('availability').isObject().withMessage('Availability details required'),
  body('availability.availableFrom').isISO8601(),
  body('availability.availableTo').isISO8601()
], validateRequest, setSharedBedPricing);

// Create shared bed
router.post('/',
  handleMultipleUpload,
  createSharedBedRules,
  validateRequest,
  createSharedBed
);

// Update shared bed
router.put('/:id',
  handleMultipleUpload,
  updateSharedBedRules,
  validateRequest,
  updateSharedBed
);

// Delete shared bed
router.delete('/:id', deleteSharedBed);

// Publish shared bed
router.post('/:id/publish', publishSharedBed);

// Unpublish shared bed
router.post('/:id/unpublish', unpublishSharedBed);

// Get student's own shared bed listings
router.get('/my-listings', getMySharedBeds);

// Public routes - Move these to the end and exclude them from authentication
router.get('/', 
  (req, res, next) => { 
    req.skipAuth = true; 
    next(); 
  }, 
  sharedBedQueryRules, 
  validateRequest, 
  getSharedBeds
);

router.get('/:id', 
  (req, res, next) => { 
    req.skipAuth = true; 
    next(); 
  }, 
  getSharedBedById
);

export default router;
