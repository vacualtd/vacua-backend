import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyAdmin } from '../middleware/adminMiddleware.js';
import {
  getPendingVerifications,
  getVerificationDetails,
  reviewVerification,
  getVerificationStats,
  getPendingStudentVerifications,
  reviewStudentVerification,
  getStudentVerificationDetails,
  
} from '../controllers/adminController.js';
import { reviewLandlordVerification, getPendingLandlordVerifications, getLandlordVerificationDetails } from '../services/verificationService.js';

const router = express.Router();

/**
 * Admin Verification Routes
 * Base URL: /api/admin/verification
 * All routes require admin authentication
 */

router.use(authenticateToken, verifyAdmin);

// Get all pending verifications
router.get('/pending',
  getPendingVerifications
);

// Get verification details by ID
router.get('/:userId',
  getVerificationDetails
);

// Approve or reject verification
router.post('/:userId/review',
  reviewVerification
);

// Get verification statistics
router.get('/stats',
  getVerificationStats
);

// Student Verification Routes
router.get('/students/pending',
  getPendingStudentVerifications
);

router.get('/students/:userId',
  getStudentVerificationDetails
);

router.post('/students/:userId/review',
  reviewStudentVerification
);

// Landlord Verification Routes
router.post('/landlords/:userId/review',
  reviewLandlordVerification
);

router.get('/landlords/pending',
  getPendingLandlordVerifications
);

router.get('/landlords/:userId',
  getLandlordVerificationDetails
);


export const adminVerificationRoutes = router;