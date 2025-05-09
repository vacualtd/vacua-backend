import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  createReview,
  getReviews,
  updateReview,
  markHelpful,
  reportReview
} from '../controllers/reviewController.js';

const router = express.Router();

router.post('/', authenticateToken, createReview);
router.get('/', getReviews);
router.put('/:reviewId', authenticateToken, updateReview);
router.post('/:reviewId/helpful', authenticateToken, markHelpful);
router.post('/:reviewId/report', authenticateToken, reportReview);

export const reviewRoutes = router; 