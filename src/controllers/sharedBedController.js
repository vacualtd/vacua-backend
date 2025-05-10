import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as sharedBedService from '../services/sharedBedService.js';
import { uploadToS3 } from '../utils/s3Service.js';
import SharedBed from '../models/SharedBed.js';

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

export const getMySharedBeds = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const result = await sharedBedService.getSharedBedsByUserId(userId, page, limit);
    
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

export const publishSharedBed = async (req, res, next) => {
  try {
    const bedId = req.params.id;
    const userId = req.user.id;

    const publishedBed = await sharedBedService.publishSharedBed(bedId, userId);

    res.json({
      success: true,
      data: publishedBed
    });
  } catch (error) {
    next(error);
  }
};

export const unpublishSharedBed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const sharedBed = await sharedBedService.unpublishSharedBed(id, userId);
    
    res.json({
      success: true,
      message: 'Shared bed listing unpublished successfully',
      data: sharedBed
    });
  } catch (error) {
    next(error);
  }
};

export const initializeSharedBed = async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.id;

    const sharedBed = await SharedBed.create({
      type,
      userId,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      data: sharedBed
    });
  } catch (error) {
    console.error('Error creating shared bed:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing shared bed',
      error: error.message
    });
  }
};

export const setSharedBedLocation = async (req, res) => {
  try {
    const { address, city, state, zipCode } = req.body;
    const { bedId } = req.query;

    const sharedBed = await SharedBed.findOneAndUpdate(
      { _id: bedId, userId: req.user.id },
      { location: { address, city, state, zipCode } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: sharedBed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting location',
      error: error.message
    });
  }
};

export const uploadSharedBedPhotos = async (req, res) => {
  try {
    const { bedId } = req.query;
    
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'No images provided');
    }

    // Upload all images to S3
    const uploadedImages = await Promise.all(
      req.files.map(file => uploadToS3(file, 'shared-beds/'))
    );

    // Get existing bed
    const existingBed = await SharedBed.findOne({ _id: bedId, userId: req.user.id });
    if (!existingBed) {
      throw new ApiError(404, 'Shared bed not found or unauthorized');
    }

    // Format images array
    const images = uploadedImages.map((img, index) => ({
      url: img.url,
      key: img.key,
      main: index === 0 // First image is main
    }));

    // Update the shared bed document
    existingBed.images = images;
    await existingBed.save();

    res.status(200).json({
      success: true,
      data: existingBed
    });
  } catch (error) {
    Logger.error('Error uploading photos:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error uploading photos',
      error: error.message
    });
  }
};

export const setSharedBedDetails = async (req, res) => {
  try {
    const { bedDetails } = req.body;
    const { bedId } = req.query;

    const sharedBed = await SharedBed.findOneAndUpdate(
      { _id: bedId, userId: req.user.id },
      { bedDetails },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: sharedBed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting bed details',
      error: error.message
    });
  }
};

export const setSharedBedPricing = async (req, res) => {
  try {
    const { price, availability } = req.body;
    const { bedId } = req.query;

    const sharedBed = await SharedBed.findOneAndUpdate(
      { _id: bedId, userId: req.user.id },
      { 
        price,
        availability,
        status: 'completed'
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: sharedBed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting pricing',
      error: error.message
    });
  }
};
