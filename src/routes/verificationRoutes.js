import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as verificationController from '../controllers/verificationController.js';
import { handleVerificationUpload } from '../middleware/uploadMiddleware.js';
import { validateVerificationRequest } from '../validations/verificationValidation.js';

const router = express.Router();

// Protected routes - require authentication
router.use(authenticateToken);

// Verification initiation
router.post(
  '/initiate',
  validateVerificationRequest,
  verificationController.initiateEmailVerification
);

// Upload documents with proper upload middleware
router.post(
  '/upload-documents', 
  handleVerificationUpload, 
  verificationController.uploadVerificationDocuments
);

// Property verification status - role check handled in service
router.get(
  '/property/status', 
  verificationController.getPropertyVerificationStatus
);

// Business verification status
router.get(
  '/business/status', 
  verificationController.getBusinessVerificationStatus
);

// Identity verification status
router.get(
  '/identity/status', 
  verificationController.getIdentityVerificationStatus
);

// Overall verification status
router.get(
  '/status', 
  verificationController.getAllVerificationStatus
);

export const verificationRoutes = router;
