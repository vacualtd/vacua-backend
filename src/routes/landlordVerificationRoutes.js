import express from 'express';
import * as landlordVerificationController from '../controllers/landlordVerificationController.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import { handleMultipleUpload, handleBusinessVerificationUpload, handlePropertyVerificationUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(authorize(['landlord']));

router.post('/business', 
  handleBusinessVerificationUpload, 
  landlordVerificationController.submitBusinessVerification
);

router.post('/property', 
  handlePropertyVerificationUpload, 
  landlordVerificationController.submitPropertyOwnership
);

router.get('/status', landlordVerificationController.getVerificationStatus);

export const landlordVerificationRoutes = router; 