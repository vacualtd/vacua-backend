import SharedBed from '../models/SharedBed.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export const createSharedBed = async (data) => {
  try {
    const sharedBed = new SharedBed(data);
    await sharedBed.save();

    return sharedBed;
  } catch (error) {
    Logger.error('Failed to create shared bed', { error: error.message });
    throw new ApiError(500, `Failed to create shared bed: ${error.message}`);
  }
};

export const getSharedBeds = async (filters, page = 1, limit = 10) => {
  try {
    const query = { 
      status: 'published'  // We only want published beds
    };

    // Add filters if they exist
    if (filters.type) query.type = filters.type;
    if (filters.city) query['location.city'] = new RegExp(filters.city, 'i');
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }

    Logger.info('Fetching shared beds with query:', query); // Add logging

    return await SharedBed.paginate(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: 'userId' // Changed from host.userId to userId
    });
  } catch (error) {
    Logger.error('Error fetching shared beds:', error);
    throw new ApiError(500, `Failed to fetch shared beds: ${error.message}`);
  }
};

export const getSharedBedById = async (id) => {
  try {
    const sharedBed = await SharedBed.findById(id)
      .populate('host.userId', 'username email avatar');

    if (!sharedBed) {
      throw new ApiError(404, 'Shared bed listing not found');
    }

    return sharedBed;
  } catch (error) {
    throw new ApiError(500, `Failed to fetch shared bed: ${error.message}`);
  }
};

export const updateSharedBed = async (id, updates, userId) => {
  try {
    const sharedBed = await SharedBed.findOne({
      _id: id,
      'host.userId': userId
    });

    if (!sharedBed) {
      throw new ApiError(404, 'Shared bed listing not found or unauthorized');
    }

    Object.assign(sharedBed, updates);
    await sharedBed.save();

    return sharedBed;
  } catch (error) {
    throw new ApiError(500, `Failed to update shared bed: ${error.message}`);
  }
};

export const deleteSharedBed = async (id, userId) => {
  try {
    const sharedBed = await SharedBed.findOne({
      _id: id,
      'host.userId': userId
    });

    if (!sharedBed) {
      throw new ApiError(404, 'Shared bed listing not found or unauthorized');
    }

    sharedBed.status = 'deleted';
    sharedBed.isActive = false;
    await sharedBed.save();

    return true;
  } catch (error) {
    throw new ApiError(500, `Failed to delete shared bed: ${error.message}`);
  }
};

export const getSharedBedsByUserId = async (userId, page = 1, limit = 10) => {
  try {
    return await SharedBed.paginate(
      { 'host.userId': userId, isActive: true },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
      }
    );
  } catch (error) {
    throw new ApiError(500, `Failed to fetch user's shared beds: ${error.message}`);
  }
};

export const publishSharedBed = async (bedId, userId) => {
  const sharedBed = await SharedBed.findOne({ _id: bedId, userId });
  
  if (!sharedBed) {
    throw new ApiError(404, 'Shared bed listing not found');
  }

  if (!sharedBed.isPublishable()) {
    throw new ApiError(400, 'Cannot publish incomplete listing. Please complete all required fields.');
  }

  sharedBed.status = 'published';
  await sharedBed.save();
  
  return sharedBed;
};

export const unpublishSharedBed = async (id, userId) => {
  try {
    const sharedBed = await SharedBed.findOne({
      _id: id,
      'host.userId': userId
    });

    if (!sharedBed) {
      throw new ApiError(404, 'Shared bed listing not found or unauthorized');
    }

    sharedBed.status = 'draft';
    sharedBed.metadata.unpublishedAt = new Date();
    await sharedBed.save();

    return sharedBed;
  } catch (error) {
    throw new ApiError(500, `Failed to unpublish shared bed: ${error.message}`);
  }
};
