import { ApiError } from '../utils/ApiError.js';

export const validatePropertyFilters = (req, res, next) => {
  try {
    const { page, limit, type, city, minPrice, maxPrice, amenities, roomType } = req.query;

    // Validate numeric parameters
    if (page && isNaN(page)) {
      throw new ApiError(400, 'Page must be a number');
    }
    if (limit && isNaN(limit)) {
      throw new ApiError(400, 'Limit must be a number');
    }
    if (minPrice && isNaN(minPrice)) {
      throw new ApiError(400, 'Minimum price must be a number');
    }
    if (maxPrice && isNaN(maxPrice)) {
      throw new ApiError(400, 'Maximum price must be a number');
    }

    // Validate property type if provided
    if (type) {
      const validTypes = [
        'A Studio Apartment',
        'House',
        'Apartment',
        'Room',
        'One Bedroom',
        'Two Bedroom',
        'Three Bedroom',
        'Shared Apartment',
        'Townhouse',
        'Duplex',
        'Condo',
        'Basement Apartment',
        'Penthouse',
        'Garden Flat',
        'Maisonette',
        'Cottage',
        'Bungalow',
        'Flat Share',
        'Student Housing'
      ];
      if (!validTypes.includes(type)) {
        throw new ApiError(400, 'Invalid property type');
      }
    }

    // Validate amenities format if provided
    if (amenities) {
      const amenitiesList = amenities.split(',');
      if (!Array.isArray(amenitiesList)) {
        throw new ApiError(400, 'Amenities must be a comma-separated list');
      }
      // Remove empty values
      req.query.amenities = amenitiesList.filter(a => a.trim()).join(',');
    }

    // Validate room type if provided
    if (roomType) {
      const validRoomTypes = ['single', 'double', 'ensuite', 'studio'];
      if (!validRoomTypes.includes(roomType.toLowerCase())) {
        throw new ApiError(400, 'Invalid room type');
      }
    }

    // Set default values
    req.query.page = parseInt(page) || 1;
    req.query.limit = parseInt(limit) || 10;

    next();
  } catch (error) {
    next(error);
  }
}; 