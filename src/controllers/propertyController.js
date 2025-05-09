import { Property } from '../models/Property.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import { uploadToS3, deleteFromS3 } from '../utils/s3Service.js';
import { Wishlist } from '../models/Wishlist.js';
import { LandlordProfile } from '../models/LandlordProfile.js';
import mongoose from 'mongoose';
import { getCityImages } from '../utils/cityImages.js';

// Helper function to validate required fields
const validateRequiredFields = (property) => {
  const requiredFields = [
    'type',
    'location.address',
    'location.city',
    'price',
    'description.descrptionname',
    'description.overview'
  ];

  return requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], property);
    return !value;
  });
};

export const updatePropertySize = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { size, unit = 'sqft', dimensions } = req.body;

    const property = await Property.findOne({
      _id: propertyId,
      'host.userId': req.user.id
    });

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    property.size = {
      value: size,
      unit,
      dimensions: dimensions || {}
    };

    await property.save();

    Logger.info('Property size updated', {
      propertyId,
      size: property.size
    });

    res.json({
      success: true,
      message: 'Property size updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property size', { error: error.message });
    next(error);
  }
};

export const updatePropertyDescription = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { title, overview, cancellationPolicy } = req.body;

    const property = await Property.findOne({
      _id: propertyId,
      'host.userId': req.user.id
    });

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Initialize description object if it doesn't exist
    if (!property.description) {
      property.description = {};
    }

    // Update description fields
    property.description.title = title;
    property.description.overview = overview;
    if (cancellationPolicy) {
      property.description.cancellationPolicy = cancellationPolicy;
    }

    await property.save();

    Logger.info('Property description updated', {
      propertyId,
      description: property.description
    });

    res.json({
      success: true,
      message: 'Property description updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property description', { error: error.message });
    next(error);
  }
};

export const setPropertyPrice = async (req, res, next) => {
  try {
    const landlordId = req.user.id;
    const { price } = req.body;

    if (!price || price <= 0) {
      throw new ApiError(400, 'Valid price is required');
    }

    const property = await Property.findOne({
      'host.userId': landlordId,
      status: 'draft'
    });

    if (!property) {
      throw new ApiError(404, 'No draft property found');
    }

    property.price = price;
    
    // Update deposit amount after price is set
    if (property.rentalTerms) {
      property.rentalTerms.depositAmount = price * 1.5;
    }

    property.currentStep = 6;
    await property.save();

    res.json({
      success: true,
      message: 'Property price updated',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property price', { error: error.message });
    next(error);
  }
};

export const setPropertyFeatures = async (req, res, next) => {
  try {
    const landlordId = req.user.id;
    const { rooms, amenities } = req.body;

    // Validate input
    if (!rooms || !amenities) {
      throw new ApiError(400, 'Rooms and amenities are required');
    }

    // Validate rooms data
    const roomTypes = ['bedroom', 'bathroom', 'balcony', 'livingroom', 'kitchen'];
    for (const type of roomTypes) {
      if (rooms[type] && (isNaN(rooms[type]) || rooms[type] < 0)) {
        throw new ApiError(400, `Invalid ${type} count`);
      }
    }

    const property = await Property.findOne({
      'host.userId': landlordId,
      status: 'draft'
    });

    if (!property) {
      throw new ApiError(404, 'No draft property found');
    }

    // Update rooms with proper validation
    property.rooms = {
      bedrooms: parseInt(rooms.bedroom) || 0,
      bathrooms: parseInt(rooms.bathroom) || 0,
      balconys: parseInt(rooms.balcony) || 0,
      livingrooms: parseInt(rooms.livingroom) || 0,
      kitchens: parseInt(rooms.kitchen) || 0
    };

    // Define valid amenities and their mappings
    const validAmenities = {
      'wifi': 'wifi',
      'tv': 'tv',
      'air-conditioner': 'airConditioner',
      'fire-alarm': 'fireAlarm',
      'bath-tub': 'bathTub',
      'washer': 'washer',
      'car-park': 'carPark',
      'gym': 'gym',
      'first-aid': 'firstAid',
      'smoke-alarm': 'smokeAlarm',
      'fire-extinguisher': 'FireExtinguisher'
    };

    // Initialize amenities object with all false values
    const updatedAmenities = Object.values(validAmenities).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {});

    // Validate and update amenities
    if (Array.isArray(amenities)) {
      amenities.forEach(amenity => {
        const normalizedAmenity = amenity.toLowerCase().trim();
        if (validAmenities[normalizedAmenity]) {
          updatedAmenities[validAmenities[normalizedAmenity]] = true;
        }
      });
    } else if (typeof amenities === 'object') {
      // Handle case where amenities is sent as an object
      Object.entries(amenities).forEach(([key, value]) => {
        const normalizedKey = key.toLowerCase().trim();
        if (validAmenities[normalizedKey]) {
          updatedAmenities[validAmenities[normalizedKey]] = Boolean(value);
        }
      });
    }

    // Update property amenities
    property.amenities = updatedAmenities;
    property.currentStep = 7;

    // Save with validation
    const updatedProperty = await property.save();

    Logger.info('Property features updated', {
      propertyId: property._id,
      rooms: property.rooms,
      amenities: property.amenities
    });

    res.json({
      success: true,
      message: 'Property features updated successfully',
      data: {
        property: updatedProperty,
        amenities: updatedProperty.amenities
      }
    });
  } catch (error) {
    Logger.error('Failed to update property features', { error: error.message });
    next(error);
  }
};

export const getLandlordProperties = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      'host.userId': userId
    };

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get properties with pagination
    const properties = await Property.paginate(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        { path: 'location.city' },
        { path: 'amenities' }
      ],
      select: '-__v'
    });

    // Get basic stats without using $function
    const stats = {
      total: await Property.countDocuments({ 'host.userId': userId }),
      published: await Property.countDocuments({ 'host.userId': userId, status: 'published' }),
      draft: await Property.countDocuments({ 'host.userId': userId, status: 'draft' }),
      underReview: await Property.countDocuments({ 'host.userId': userId, status: 'under_review' })
    };

    Logger.info('Landlord properties retrieved successfully', {
      userId,
      count: properties.docs.length
    });

    res.json({
      success: true,
      message: 'Properties retrieved successfully',
      data: {
        properties: properties.docs,
        pagination: {
          total: properties.totalDocs,
          page: properties.page,
          pages: properties.totalPages,
          hasNext: properties.hasNextPage
        },
        stats
      }
    });
  } catch (error) {
    Logger.error('Failed to retrieve landlord properties', { error: error.message });
    next(error);
  }
};

export const updatePropertyDetails = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const updateData = req.body;

    const property = await Property.findOne({
      _id: propertyId,
      'host.userId': req.user.id
    });

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Update allowed fields
    const allowedFields = [
      'title',
      'description',
      'price',
      'location',
      'rooms',
      'amenities',
      'availability',
      'cancellationPolicy'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        property[field] = updateData[field];
      }
    });

    // Handle images if provided
    if (req.files?.length) {
      const uploadedImages = await Promise.all(
        req.files.map(file => uploadToS3(file))
      );

      property.images = [
        ...property.images,
        ...uploadedImages.map(img => ({
          url: img.url,
          key: img.key,
          main: false
        }))
      ];
    }

    await property.save();

    Logger.info('Property details updated', {
      propertyId,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'Property details updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property details', { error: error.message });
    next(error);
  }
};

// Initialize a new property listing
export const initializePropertyListing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;  // Get type from request body

    if (!type) {
      throw new ApiError(400, 'Property type is required');
    }

    // Count existing draft properties for this user
    const draftCount = await Property.countDocuments({
      'host.userId': userId,
      status: 'draft'
    });

    // Check if user has reached the maximum draft limit
    if (draftCount >= 4) {
      throw ApiError.badRequest(
        'You have reached the maximum limit of 4 draft properties. Please complete or delete existing drafts first.'
      );
    }

    // Create new property draft with proper host information
    const property = await Property.create({
      type, // Add the property type
      host: {
        userId: userId,
        name: req.user.username || 'Anonymous'
      },
      status: 'draft',
      currentStep: 1,
      // Initialize with default values
      location: {
        address: '',
        city: '',
        state: '',
        zipCode: '',
        coordinates: {}
      },
      availability: {
        isAvailable: true,
        availableFrom: new Date(),
        availableTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      metadata: {
        createdAt: new Date(),
        lastUpdated: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Property draft initialized successfully',
      data: {
        propertyId: property._id,
        remainingDrafts: 4 - (draftCount + 1),
        message: draftCount === 3 ? 
          'This is your last available draft slot.' : 
          `You can create ${3 - draftCount} more draft properties.`,
        property
      }
    });

  } catch (error) {
    Logger.error('Failed to initialize property', { error: error.message });
    next(error);
  }
};

// Set property location
export const setPropertyLocation = async (req, res, next) => {
  try {
    const landlordId = req.user.id;
    const { address, city, state, zipCode, coordinates } = req.body;

    // Validate input
    if (!address || !city || !state || !zipCode) {
      throw ApiError.badRequest('Address, city, state, and zipCode are required');
    }

    const property = await Property.findOne({
      'host.userId': landlordId,
      status: 'draft',
    });

    if (!property) {
      throw ApiError.notFound('No draft property found');
    }

    // Update location with all required fields
    property.location = {
      address,
      city,
      state,
      zipCode,
      coordinates: coordinates || {} // Make coordinates optional
    };

    property.currentStep = 2;
    await property.save();

    Logger.info('Property location updated', { 
      propertyId: property._id,
      location: property.location 
    });

    res.json({
      success: true,
      message: 'Property location updated',
      data: property,
    });
  } catch (error) {
    Logger.error('Failed to set property location', { error: error.message });
    next(error);
  }
};

// Upload property photos
export const uploadPropertyPhotos = async (req, res, next) => {
  try {
    const landlordId = req.user.id;
    const files = req.files;

    // Validate input
    if (!files?.length) {
      throw ApiError.badRequest('At least one photo is required');
    }

    const property = await Property.findOne({
      'host.userId': landlordId,
      status: 'draft',
    });

    if (!property) {
      throw ApiError.notFound('No draft property found');
    }

    // Upload photos to S3
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const result = await uploadToS3(file);
        return {
          url: result.url,
          key: result.key,
          main: false,
        };
      })
    );

    // Set first image as main if no images exist
    if (!property.images?.length && uploadedImages.length > 0) {
      uploadedImages[0].main = true;
    }

    property.images = [...(property.images || []), ...uploadedImages];
    property.currentStep = 3;
    await property.save();

    Logger.info('Property photos uploaded', {
      propertyId: property._id,
      imageCount: property.images.length,
    });

    res.json({
      success: true,
      message: 'Photos uploaded successfully',
      data: property,
    });
  } catch (error) {
    Logger.error('Failed to upload property photos', { error: error.message });
    next(error);
  }
};

// Set property size
export const setPropertySize = async (req, res, next) => {
  try {
    const landlordId = req.user.id;
    const { value, unit, dimensions } = req.body;

    // Validate input
    if (!value || !unit) {
      throw ApiError.badRequest('Size value and unit are required');
    }

    const property = await Property.findOne({
      'host.userId': landlordId,
      status: 'draft',
    });

    if (!property) {
      throw ApiError.notFound('No draft property found');
    }

    // Update size
    property.size = {
      value,
      unit,
      dimensions: dimensions || {},
    };

    property.currentStep = 4;
    await property.save();

    Logger.info('Property size updated', {
      propertyId: property._id,
      size: property.size,
    });

    res.json({
      success: true,
      message: 'Property size updated',
      data: property,
    });
  } catch (error) {
    Logger.error('Failed to set property size', { error: error.message });
    next(error);
  }
};

// Set property description
export const setPropertyDescription = async (req, res, next) => {
  try {
    const landlordId = req.user.id;
    const { descrptionname, overview, cancellationPolicy } = req.body;

    const property = await Property.findOne({
      'host.userId': landlordId,
      status: 'draft'
    });

    if (!property) {
      throw new ApiError(404, 'No draft property found');
    }

    // Update description
    property.description = {
      descrptionname,
      overview,
      cancellationPolicy
    };

    // Initialize rental terms with safe defaults
    if (!property.rentalTerms) {
      property.rentalTerms = {
        minimumStay: 6,
        maximumStay: 12,
        leaseType: 'Long-term',
        depositAmount: 0, // Will be calculated after price is set
        petsAllowed: {
          allowed: false,
          deposit: 0,
          restrictions: []
        },
        utilities: {
          included: false,
          water: false,
          electricity: false,
          gas: false,
          internet: false,
          estimated_cost: 0
        }
      };
    }

    property.currentStep = 2;
    await property.save();

    Logger.info('Property description updated', {
      propertyId: property._id,
      description: property.description
    });

    res.json({
      success: true,
      message: 'Property description updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property description', { error: error.message });
    next(error);
  }
};

// Publish property
export const publishProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;

    // Find the property and verify ownership
    const property = await Property.findOne({
      _id: propertyId,
      'host.userId': userId
    });

    if (!property) {
      throw new ApiError(404, 'Property not found or unauthorized');
    }

    // Check if all required fields are filled
    const missingFields = validateRequiredFields(property);
    if (missingFields.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    // Initialize metadata if it doesn't exist
    if (!property.metadata) {
      property.metadata = {};
    }

    // Update property status and metadata
    property.status = 'published';
    property.metadata = {
      ...property.metadata,
      publishedAt: new Date(),
      lastUpdated: new Date()
    };
    
    await property.save();

    Logger.info('Property published successfully', {
      propertyId,
      userId,
      status: 'published'
    });

    res.json({
      success: true,
      message: 'Property published successfully',
      data: {
        property,
        publishedAt: property.metadata.publishedAt
      }
    });

  } catch (error) {
    Logger.error('Failed to publish property', { error: error.message });
    next(error);
  }
};

// Unpublish property
export const unpublishProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;

    // Find the property and verify ownership
    const property = await Property.findOne({
      _id: propertyId,
      'host.userId': userId,
      status: 'published'
    });

    if (!property) {
      throw new ApiError(404, 'Published property not found or unauthorized');
    }

    // Initialize metadata if it doesn't exist
    if (!property.metadata) {
      property.metadata = {};
    }

    // Update property status and metadata
    property.status = 'draft';
    property.metadata = {
      ...property.metadata,
      unpublishedAt: new Date(),
      lastUpdated: new Date()
    };
    
    await property.save();

    Logger.info('Property unpublished successfully', {
      propertyId,
      userId,
      status: 'draft'
    });

    res.json({
      success: true,
      message: 'Property unpublished successfully',
      data: {
        property,
        unpublishedAt: property.metadata.unpublishedAt
      }
    });

  } catch (error) {
    Logger.error('Failed to unpublish property', { error: error.message });
    next(error);
  }
};

// Get all properties
export const getAllProperties = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      city,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '', // Add search parameter
      propertyStyle,
      rooms,
      amenities
    } = req.query;

    // Build query
    const query = { status: 'published' };

    // Add search functionality
    if (search) {
      query.$or = [
        { 'description.descrptionname': { $regex: search, $options: 'i' } },
        { 'description.overview': { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.state': { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    // Existing filters
    if (type) query.type = type;
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (propertyStyle) query.propertyStyle = propertyStyle;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Room filters
    if (rooms) {
      Object.entries(JSON.parse(rooms)).forEach(([key, value]) => {
        if (value) query[`rooms.${key}`] = Number(value);
      });
    }

    // Amenities filter
    if (amenities) {
      const amenitiesList = amenities.split(',');
      query['amenities'] = { 
        $all: amenitiesList.map(amenity => ({ 
          $elemMatch: { 
            $regex: new RegExp(amenity, 'i') 
          } 
        }))
      };
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: {
        path: 'host.userId',
        select: 'username',
      },
    };

    const properties = await Property.paginate(query, options);

    Logger.info('Properties retrieved successfully', {
      page,
      limit,
      total: properties.totalDocs,
    });

    res.json({
      success: true,
      data: properties.docs,
      pagination: {
        total: properties.totalDocs,
        page: properties.page,
        pages: properties.totalPages,
        hasNext: properties.hasNextPage,
      },
      filters: {
        applied: {
          search: search || null,
          type: type || null,
          city: city || null,
          priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
          propertyStyle: propertyStyle || null,
          rooms: rooms ? JSON.parse(rooms) : null,
          amenities: amenities ? amenities.split(',') : null
        }
      }
    });
  } catch (error) {
    Logger.error('Failed to retrieve properties', { error: error.message });
    next(error);
  }
};

// Get property by ID
export const getPropertyById = async (req, res, next) => {
  try {
    const { detailId } = req.params;

    const property = await Property.findOne({
      _id: detailId,
      status: 'published',
    })
      .populate('host.userId', 'username email phoneNumber address createdAt')
      .populate('amenities')
      .populate('location.city')
    // .populate('reviews')

    if (!property) {
      throw ApiError.notFound('Property not found');
    }

    Logger.info('Property retrieved successfully', { propertyId: detailId });

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    Logger.error('Failed to retrieve property', { error: error.message });
    next(error);
  }
};

// Helper function to shuffle array (Fisher-Yates algorithm)
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const updatePropertyLocation = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { address, city, state, zipCode, coordinates } = req.body;
    const userId = req.user.id;

    // Validate property ownership
    const property = await Property.findOne({ 
      _id: propertyId, 
      'host.userId': userId 
    });

    if (!property) {
      throw new ApiError(404, 'Property not found or unauthorized');
    }

    // Update location
    property.location = {
      address,
      city,
      state,
      zipCode,
      coordinates: coordinates || {}
    };

    await property.save();

    Logger.info('Property location updated', {
      propertyId,
      userId,
      location: property.location
    });

    res.json({
      success: true,
      message: 'Property location updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property location', { error: error.message });
    next(error);
  }
};

export const updatePropertyAmenities = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { amenities } = req.body;
    const userId = req.user.id;

    const property = await Property.findOneAndUpdate(
      { _id: propertyId, 'host.userId': userId },
      { amenities },
      { new: true }
    );

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    res.json({
      success: true,
      message: 'Property amenities updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property amenities', { error: error.message });
    next(error);
  }
};

export const updatePropertyRules = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { rules } = req.body;
    const userId = req.user.id;

    const property = await Property.findOneAndUpdate(
      { _id: propertyId, 'host.userId': userId },
      { rules },
      { new: true }
    );

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    res.json({
      success: true,
      message: 'Property rules updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property rules', { error: error.message });
    next(error);
  }
};

export const updatePropertyAvailability = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { isAvailable, availableFrom, availableTo } = req.body;
    const userId = req.user.id;

    const property = await Property.findOneAndUpdate(
      { _id: propertyId, 'host.userId': userId },
      {
        availability: {
          isAvailable,
          availableFrom,
          availableTo
        }
      },
      { new: true }
    );

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    res.json({
      success: true,
      message: 'Property availability updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property availability', { error: error.message });
    next(error);
  }
};

export const updatePropertyPricing = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { price, depositAmount, utilities } = req.body;
    const userId = req.user.id;

    const property = await Property.findOneAndUpdate(
      { _id: propertyId, 'host.userId': userId },
      {
        price,
        'rentalTerms.depositAmount': depositAmount,
        'rentalTerms.utilities': utilities
      },
      { new: true }
    );

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    res.json({
      success: true,
      message: 'Property pricing updated successfully',
      data: property
    });
  } catch (error) {
    Logger.error('Failed to update property pricing', { error: error.message });
    next(error);
  }
};

export const getStudentProperties = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      city,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      amenities,
      roomType,
      availability
    } = req.query;

    // Build query
    const query = { 
      status: 'published',
      'availability.isAvailable': true
    };

    if (type) query.type = type;
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (roomType) query['rooms.type'] = roomType;
    
    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Amenities filter
    if (amenities) {
      const amenitiesList = amenities.split(',');
      query.amenities = { $all: amenitiesList };
    }

    // Availability filter
    if (availability === 'true') {
      const now = new Date();
      query['availability.availableFrom'] = { $lte: now };
      query['availability.availableTo'] = { $gte: now };
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        {
          path: 'host.userId',
          select: 'username email avatar rating'
        }
      ],
      select: '-__v'
    };

    const properties = await Property.paginate(query, options);

    res.json({
      success: true,
      message: 'Properties retrieved successfully',
      data: properties.docs,
      pagination: {
        total: properties.totalDocs,
        page: properties.page,
        pages: properties.totalPages,
        hasNext: properties.hasNextPage
      },
      filters: {
        appliedFilters: {
          type,
          city,
          priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
          amenities: amenities ? amenities.split(',') : []
        }
      }
    });

  } catch (error) {
    Logger.error('Failed to retrieve student properties', { error: error.message });
    next(error);
  }
};

export const getLandlordMarketplace = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query for landlord's properties
    const query = {
      'host.userId': userId
    };

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        {
          path: 'host.userId',
          select: 'username email avatar rating'
        }
      ],
      select: '-__v'
    };

    const properties = await Property.paginate(query, options);

    // Get additional stats
    const stats = {
      total: await Property.countDocuments({ 'host.userId': userId }),
      published: await Property.countDocuments({ 'host.userId': userId, status: 'published' }),
      draft: await Property.countDocuments({ 'host.userId': userId, status: 'draft' }),
      views: await Property.aggregate([
        { $match: { 'host.userId': userId } },
        { $group: { _id: null, total: { $sum: '$viewCount' } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.json({
      success: true,
      message: 'Landlord properties retrieved successfully',
      data: properties.docs,
      pagination: {
        total: properties.totalDocs,
        page: properties.page,
        pages: properties.totalPages,
        hasNext: properties.hasNextPage
      },
      stats
    });

  } catch (error) {
    Logger.error('Failed to retrieve landlord properties', { error: error.message });
    next(error);
  }
};

export const createLandlordProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      businessName,
      phoneNumber,
      address,
      city,
      state,
      zipCode,
      businessLicense,
      taxId,
      propertyTypes,
      description
    } = req.body;

    // Check if profile already exists
    let profile = await LandlordProfile.findOne({ userId });

    if (profile) {
      // Update existing profile
      profile = await LandlordProfile.findOneAndUpdate(
        { userId },
        {
          businessName,
          phoneNumber,
          address,
          city,
          state,
          zipCode,
          businessLicense,
          taxId,
          propertyTypes,
          description,
          isComplete: true,
          updatedAt: new Date()
        },
        { new: true }
      );
    } else {
      // Create new profile
      profile = await LandlordProfile.create({
        userId,
        businessName,
        phoneNumber,
        address,
        city,
        state,
        zipCode,
        businessLicense,
        taxId,
        propertyTypes,
        description,
        isComplete: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'Landlord profile updated successfully',
      data: profile
    });

  } catch (error) {
    Logger.error('Failed to update landlord profile', { error: error.message });
    next(error);
  }
};

export const deleteProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;

    // Validate property ID
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new ApiError(400, 'Invalid property ID');
    }

    // Find the property
    const property = await Property.findOne({
      _id: propertyId,
      'host.userId': userId
    });

    if (!property) {
      throw new ApiError(404, 'Property not found or you do not have permission to delete it');
    }

    // Soft delete by updating status and isActive
    await Property.findByIdAndUpdate(propertyId, {
      status: 'deleted',
      isActive: false,
      'metadata.unpublishedAt': new Date(),
      'metadata.lastUpdated': new Date()
    });

    Logger.info('Property deleted successfully', { 
      propertyId,
      userId 
    });

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });

  } catch (error) {
    Logger.error('Failed to delete property', { 
      error: error.message,
      propertyId: req.params.propertyId,
      userId: req.user.id
    });
    next(error);
  }
};

export const getRelatedProperties = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { limit = 6 } = req.query;

    // Get the original property
    const property = await Property.findById(propertyId);
    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Find related properties based on type and location
    const relatedProperties = await Property.find({
      _id: { $ne: propertyId },
      status: 'published',
      type: property.type,
      'location.city': property.location.city,
      price: {
        $gte: property.price * 0.8,
        $lte: property.price * 1.2
      }
    })
    .limit(parseInt(limit))
    .populate('host.userId', 'username avatar rating');

    Logger.info('Related properties fetched', {
      propertyId,
      count: relatedProperties.length
    });

    res.json({
      success: true,
      data: relatedProperties,
      metadata: {
        originalProperty: {
          id: property._id,
          type: property.type,
          location: property.location.city
        },
        relationshipType: 'location_and_type_based'
      }
    });

  } catch (error) {
    Logger.error('Failed to fetch related properties', { error: error.message });
    next(error);
  }
};

export const getPropertyRecommendations = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;
    const { limit = 6 } = req.query;

    // Get user's property view history
    const userHistory = await Property.find({
      'viewHistory.userId': userId
    }).sort({ 'viewHistory.lastViewed': -1 }).limit(10);

    // Extract user preferences
    const preferences = userHistory.reduce((acc, item) => {
      acc.types.add(item.type);
      acc.cities.add(item.location.city);
      acc.priceRange = {
        min: Math.min(acc.priceRange.min || item.price, item.price),
        max: Math.max(acc.priceRange.max || item.price, item.price)
      };
      return acc;
    }, { types: new Set(), cities: new Set(), priceRange: {} });

    // Get recommendations based on preferences
    const recommendations = await Property.find({
      _id: { $ne: propertyId },
      status: 'published',
      $or: [
        { type: { $in: Array.from(preferences.types) } },
        { 'location.city': { $in: Array.from(preferences.cities) } }
      ],
      price: {
        $gte: preferences.priceRange.min * 0.8,
        $lte: preferences.priceRange.max * 1.2
      }
    })
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .populate('host.userId', 'username avatar rating');

    Logger.info('Property recommendations generated', {
      userId,
      propertyId,
      count: recommendations.length
    });

    res.json({
      success: true,
      data: recommendations,
      metadata: {
        basedOn: {
          types: Array.from(preferences.types),
          cities: Array.from(preferences.cities),
          priceRange: preferences.priceRange
        },
        recommendationType: 'user_preference_based'
      }
    });

  } catch (error) {
    Logger.error('Failed to generate property recommendations', { error: error.message });
    next(error);
  }
};

export const getTopCities = async (req, res, next) => {
  try {
    const { limit = 10, search = '' } = req.query;

    let matchStage = { 
      status: 'published',
      'location.city': { $exists: true, $ne: '' }
    };

    // Add search filter if provided
    if (search) {
      matchStage['location.city'] = {
        $regex: new RegExp(search, 'i')
      };
    }

    const topCities = await Property.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalViews: { $sum: '$viewCount' }
        }
      },
      {
        $project: {
          city: '$_id',
          count: 1,
          averagePrice: { $round: ['$averagePrice', 2] },
          totalViews: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Add images to each city
    const citiesWithImages = topCities.map(city => ({
      ...city,
      images: getCityImages(city.city)
    }));

    res.json({
      success: true,
      data: citiesWithImages,
      metadata: {
        total: citiesWithImages.length,
        searchTerm: search || null
      }
    });
  } catch (error) {
    Logger.error('Failed to fetch top cities', { error: error.message });
    next(error);
  }
};