import { Wishlist } from '../models/Wishlist.js';
import { Property } from '../models/Property.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export const addToWishlist = async (userId, propertyId, data = {}) => {
  try {
    // Type validation
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new ApiError(400, 'Invalid ID format');
    }

    // Convert to ObjectId if needed
    const userObjectId = userId instanceof mongoose.Types.ObjectId ? 
      userId : new mongoose.Types.ObjectId(userId);
    const propertyObjectId = propertyId instanceof mongoose.Types.ObjectId ? 
      propertyId : new mongoose.Types.ObjectId(propertyId);

    // Verify property exists
    const propertyExists = await Property.exists({ _id: propertyObjectId });
    if (!propertyExists) {
      throw new ApiError(404, 'Property not found');
    }

    // Create wishlist item
    const wishlistItem = new Wishlist({
      userId: userObjectId,
      propertyId: propertyObjectId,
      ...data,
      metadata: {
        addedAt: new Date(),
        lastUpdated: new Date()
      }
    });

    await wishlistItem.save();
    await wishlistItem.populate('propertyId');

    Logger.info('Wishlist item created:', {
      userId: userObjectId.toString(),
      propertyId: propertyObjectId.toString()
    });

    return wishlistItem.toObject();

  } catch (error) {
    Logger.error('Wishlist service error:', {
      error: error.message,
      userId: userId?.toString(),
      propertyId: propertyId?.toString()
    });

    if (error.code === 11000) {
      throw new ApiError(409, 'Property already in wishlist');
    }

    throw error instanceof ApiError ? error : new ApiError(500, error.message);
  }
};

export const getWishlist = async (userId, filters = {}, page = 1, limit = 20) => {
  try {
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID format');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Build query
    const query = { userId: userObjectId };
    
    // Add status filter if provided
    if (filters.status) {
      query.status = filters.status;
    }

    // Add priority filter if provided
    if (filters.priority) {
      query.priority = filters.priority;
    }

    // Build sort options
    const sort = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1; // Default sort by creation date
    }

    Logger.info('Fetching wishlist with query:', {
      userId: userId.toString(),
      query,
      page,
      limit
    });

    // Execute query with pagination
    const [items, total] = await Promise.all([
      Wishlist.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: 'propertyId',
          select: 'title description price location images type status'
        }),
      Wishlist.countDocuments(query)
    ]);

    return {
      docs: items,
      totalDocs: total,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      hasNextPage: (page * limit) < total,
      hasPrevPage: page > 1
    };

  } catch (error) {
    Logger.error('Wishlist fetch error:', {
      error: error.message,
      userId
    });
    throw error instanceof ApiError ? error : new ApiError(500, error.message);
  }
};

export const updateWishlistItem = async (userId, propertyId, updates) => {
  try {
    const wishlistItem = await Wishlist.findOneAndUpdate(
      { userId, propertyId },
      { $set: updates },
      { new: true }
    ).populate('propertyId');

    if (!wishlistItem) {
      throw new ApiError(404, 'Wishlist item not found');
    }

    return wishlistItem;
  } catch (error) {
    Logger.error('Failed to update wishlist item', { error: error.message });
    throw error;
  }
};

export const removeFromWishlist = async (userId, propertyId) => {
  try {
    const result = await Wishlist.deleteOne({ userId, propertyId });
    if (result.deletedCount === 0) {
      throw new ApiError(404, 'Wishlist item not found');
    }
  } catch (error) {
    Logger.error('Failed to remove from wishlist', { error: error.message });
    throw error;
  }
};

export const getWishlistStats = async (userId) => {
  try {
    const stats = await Wishlist.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      total: await Wishlist.countDocuments({ userId }),
      byPriority: stats.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {})
    };
  } catch (error) {
    Logger.error('Failed to get wishlist stats', { error: error.message });
    throw error;
  }
};