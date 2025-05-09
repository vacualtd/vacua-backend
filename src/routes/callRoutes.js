import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  initiateCall,
  endCall,
  getCallHistory,
  getActiveCall
} from '../controllers/callController.js';
import { initiateCallRules } from '../validations/callValidation.js';

const router = express.Router();

router.post(
  '/initiate',
  authenticateToken,
  initiateCallRules,
  validateRequest,
  initiateCall
);

router.post(
  '/:callId/end',
  authenticateToken,
  endCall
);

router.get(
  '/history',
  authenticateToken,
  getCallHistory
);

router.get(
  '/active',
  authenticateToken,
  getActiveCall
);

export const callRoutes = router;