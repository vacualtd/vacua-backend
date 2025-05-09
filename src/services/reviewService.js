import { Review } from '../models/Review.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export const createReview = async (reviewData) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Check if user has already reviewed this item
    const existingReview = await Review.findOne({
      userId: reviewData.userId,
      itemId: reviewData.itemId,
      itemType: reviewData.itemType
    }).session(session);

    if (existingReview) {
      throw new ApiError(400, 'You have already reviewed this item');
    }

    // Create the review
    const review = await Review.create([{
      ...reviewData,
      status: 'pending'
    }], { session });

    // Update average rating on the item
    const Model = mongoose.model(reviewData.itemType);
    const stats = await Review.aggregate([
      {
        $match: {
          itemId: new mongoose.Types.ObjectId(reviewData.itemId),
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          numberOfReviews: { $sum: 1 }
        }
      }
    ]).session(session);

    await Model.findByIdAndUpdate(
      reviewData.itemId,
      {
        $set: {
          averageRating: stats[0]?.averageRating || reviewData.rating,
          numberOfReviews: (stats[0]?.numberOfReviews || 0) + 1
        }
      },
      { session }
    );

    await session.commitTransaction();
    return review[0];
  } catch (error) {
    await session.abortTransaction();
    Logger.error('Review creation failed', { error: error.message });
    throw error;
  } finally {
    session.endSession();
  }
};

export const getReviews = async (query) => {
  try {
    const {
      itemId,
      itemType,
      userId,
      status = 'approved',
      sort = '-createdAt',
      page = 1,
      limit = 10,
      rating
    } = query;

    const filter = { status };
    if (itemId) filter.itemId = itemId;
    if (itemType) filter.itemType = itemType;
    if (userId) filter.userId = userId;
    if (rating) filter.rating = rating;

    const reviews = await Review.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'username avatar')
      .lean();

    const total = await Review.countDocuments(filter);

    return {
      reviews,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        totalReviews: total
      }
    };
  } catch (error) {
    Logger.error('Failed to fetch reviews', { error: error.message });
    throw error;
  }
};

export const updateReview = async (reviewId, userId, updateData) => {
  try {
    const review = await Review.findOne({ _id: reviewId, userId });
    
    if (!review) {
      throw new ApiError(404, 'Review not found or unauthorized');
    }

    Object.assign(review, updateData);
    await review.save();

    return review;
  } catch (error) {
    Logger.error('Review update failed', { error: error.message });
    throw error;
  }
};

export const markReviewHelpful = async (reviewId, userId) => {
  try {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    const helpfulIndex = review.helpful.indexOf(userId);
    if (helpfulIndex === -1) {
      review.helpful.push(userId);
    } else {
      review.helpful.splice(helpfulIndex, 1);
    }

    await review.save();
    return review;
  } catch (error) {
    Logger.error('Failed to mark review as helpful', { error: error.message });
    throw error;
  }
};

export const reportReview = async (reviewId, userId, reason) => {
  try {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (review.reported.some(report => report.userId.equals(userId))) {
      throw new ApiError(400, 'You have already reported this review');
    }

    review.reported.push({ userId, reason });
    await review.save();

    return review;
  } catch (error) {
    Logger.error('Review report failed', { error: error.message });
    throw error;
  }
}; 