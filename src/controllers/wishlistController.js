import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as wishlistService from '../services/wishlistService.js';
import mongoose from 'mongoose';

/**
 * Add a property to the user's wishlist.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { notes, priority, notifications, addedFromPage } = req.body;

    // Validate user ID from auth
    if (!req.user?.id) {
      throw new ApiError(401, 'User authentication required');
    }

    // Convert IDs to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const propertyObjectId = new mongoose.Types.ObjectId(propertyId);

    Logger.info('Adding to wishlist:', {
      userId: userId.toString(),
      propertyId: propertyObjectId.toString()
    });

    const wishlistItem = await wishlistService.addToWishlist(
      userId,
      propertyObjectId,
      {
        notes,
        priority,
        notifications,
        addedFromPage
      }
    );

    res.status(201).json({
      success: true,
      message: 'Property added to wishlist',
      data: wishlistItem
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Property already in wishlist'
      });
    }

    Logger.error('Wishlist add failed:', {
      error: error.message,
      userId: req.user?.id,
      propertyId: req.params.propertyId
    });

    next(error);
  }
};

/**
 * Get the user's wishlist with pagination and filtering.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const getWishlist = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      sortBy,
      sortOrder
    } = req.query;

    Logger.info('Getting wishlist:', {
      userId: req.user.id,
      page,
      limit,
      filters: { status, priority, sortBy, sortOrder }
    });

    // Convert user ID to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Get wishlist with filters
    const wishlist = await wishlistService.getWishlist(
      userId,
      { status, priority, sortBy, sortOrder },
      parseInt(page),
      parseInt(limit)
    );

    // Send response
    res.json({
      success: true,
      data: wishlist.docs,
      pagination: {
        total: wishlist.totalDocs,
        page: wishlist.page,
        pages: wishlist.totalPages,
        hasNext: wishlist.hasNextPage,
        hasPrev: wishlist.hasPrevPage,
        limit: wishlist.limit
      },
      filters: {
        status,
        priority,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    Logger.error('Failed to get wishlist:', {
      error: error.message,
      userId: req.user?.id
    });
    next(error);
  }
};

/**
 * Update a wishlist item.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const updateWishlistItem = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { notes, priority, notifications, status } = req.body;

    // Validate input
    if (!propertyId) {
      throw ApiError.badRequest('Property ID is required');
    }

    // Update wishlist item
    const wishlistItem = await wishlistService.updateWishlistItem(req.user.id, propertyId, {
      notes,
      priority,
      notifications,
      status,
    });

    Logger.info('Wishlist item updated successfully', {
      userId: req.user.id,
      propertyId,
    });

    res.json({
      success: true,
      message: 'Wishlist item updated successfully',
      data: wishlistItem,
    });
  } catch (error) {
    Logger.error('Failed to update wishlist item', { error: error.message });
    next(error);
  }
};

/**
 * Remove a property from the user's wishlist.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    // Validate input
    if (!propertyId) {
      throw ApiError.badRequest('Property ID is required');
    }

    // Remove property from wishlist
    await wishlistService.removeFromWishlist(req.user.id, propertyId);

    Logger.info('Property removed from wishlist', {
      userId: req.user.id,
      propertyId,
    });

    res.json({
      success: true,
      message: 'Property removed from wishlist',
    });
  } catch (error) {
    Logger.error('Failed to remove property from wishlist', { error: error.message });
    next(error);
  }
};

/**
 * Get wishlist statistics for the user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export const getWishlistStats = async (req, res, next) => {
  try {
    // Fetch wishlist statistics
    const stats = await wishlistService.getWishlistStats(req.user.id);

    Logger.info('Wishlist stats retrieved successfully', { userId: req.user.id });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    Logger.error('Failed to retrieve wishlist stats', { error: error.message });
    next(error);
  }
};