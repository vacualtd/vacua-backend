import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as sharedBedService from '../services/sharedBedService.js';
import { uploadToS3 } from '../utils/s3Service.js';

export const createSharedBed = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sharedBedData = {
      ...req.body,
      host: {
        userId,
        name: req.user.username,
        isStudent: true
      }
    };

    // Handle image uploads if present
    if (req.files?.length) {
      const uploadedImages = await Promise.all(
        req.files.map(file => uploadToS3(file))
      );
      sharedBedData.images = uploadedImages.map(img => ({
        url: img.url,
        key: img.key,
        main: false
      }));
      if (sharedBedData.images.length > 0) {
        sharedBedData.images[0].main = true;
      }
    }

    const sharedBed = await sharedBedService.createSharedBed(sharedBedData);

    res.status(201).json({
      success: true,
      message: 'Shared bed listing created successfully',
      data: sharedBed
    });
  } catch (error) {
    Logger.error('Failed to create shared bed listing', { error: error.message });
    next(error);
  }
};

export const getSharedBeds = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, minPrice, maxPrice } = req.query;
    
    const filters = {
      type,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined
    };

    const result = await sharedBedService.getSharedBeds(filters, page, limit);
    
    res.json({
      success: true,
      data: result.docs,
      pagination: {
        total: result.totalDocs,
        page: result.page,
        pages: result.totalPages,
        hasNext: result.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSharedBedById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sharedBed = await sharedBedService.getSharedBedById(id);

    res.json({
      success: true,
      data: sharedBed
    });
  } catch (error) {
    next(error);
  }
};

export const updateSharedBed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const updatedBed = await sharedBedService.updateSharedBed(id, updates, userId);

    res.json({
      success: true,
      message: 'Shared bed listing updated successfully',
      data: updatedBed
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSharedBed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await sharedBedService.deleteSharedBed(id, userId);

    res.json({
      success: true,
      message: 'Shared bed listing deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
