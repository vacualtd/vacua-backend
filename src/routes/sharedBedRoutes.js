import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyStudent } from '../middleware/studentMiddleware.js';
import { handleMultipleUpload } from '../middleware/uploadMiddleware.js';
import { createSharedBedRules, sharedBedQueryRules } from '../validations/sharedBedValidation.js';
import {
  createSharedBed,
  getSharedBeds,
  getSharedBedById,
  updateSharedBed,
  deleteSharedBed
} from '../controllers/sharedBedController.js';

const router = express.Router();

// Create shared bed (Student only)
router.post('/',
  authenticateToken,
  verifyStudent,
  handleMultipleUpload,
  createSharedBedRules,
  validateRequest,
  createSharedBed
);

// Get all shared beds
router.get('/',
  sharedBedQueryRules,
  validateRequest,
  getSharedBeds
);

// Get shared bed by id
router.get('/:id',
  getSharedBedById
);

// Update shared bed (Student only)
router.put('/:id',
  authenticateToken,
  verifyStudent,
  handleMultipleUpload,
  updateSharedBed
);

// Delete shared bed (Student only)
router.delete('/:id',
  authenticateToken,
  verifyStudent,
  deleteSharedBed
);

export default router;
