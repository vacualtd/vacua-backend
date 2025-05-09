import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as reviewService from '../services/reviewService.js';

export const createReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId, itemType, rating, comment, images } = req.body;

    const review = await reviewService.createReview({
      userId,
      itemId,
      itemType,
      rating,
      comment,
      images
    });

    res.json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error) {
    Logger.error('Review creation failed', { error: error.message });
    next(error);
  }
};

export const getReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getReviews(req.query);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('Failed to fetch reviews', { error: error.message });
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { rating, comment, images } = req.body;

    const review = await reviewService.updateReview(reviewId, userId, {
      rating,
      comment,
      images
    });

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    Logger.error('Review update failed', { error: error.message });
    next(error);
  }
};

export const markHelpful = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await reviewService.markReviewHelpful(reviewId, userId);

    res.json({
      success: true,
      message: 'Review marked as helpful',
      data: review
    });
  } catch (error) {
    Logger.error('Failed to mark review as helpful', { error: error.message });
    next(error);
  }
};

export const reportReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const review = await reviewService.reportReview(reviewId, userId, reason);

    res.json({
      success: true,
      message: 'Review reported successfully',
      data: review
    });
  } catch (error) {
    Logger.error('Review report failed', { error: error.message });
    next(error);
  }
}; 