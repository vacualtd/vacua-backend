import { ApiError } from '../utils/ApiError.js';
import { generateUploadURL, uploadToS3 } from '../utils/s3Service.js';
import { Logger } from '../utils/logger.js';
import * as marketplaceService from '../services/marketplaceService.js';
import { Product } from '../models/Product.js';
import mongoose from 'mongoose';
import * as notificationService from '../services/notificationService.js';

export const getUploadURL = async (req, res, next) => {
  try {
    const { uploadURL, imageKey } = await generateUploadURL();

    Logger.info('Upload URL generated successfully', { imageKey });

    res.json({
      success: true,
      data: { uploadURL, imageKey },
    });
  } catch (error) {
    Logger.error('Failed to generate upload URL', { error: error.message });
    next(new ApiError(500, 'Failed to generate upload URL'));
  }
};

export const createListing = async (req, res, next) => {
  try {
    const { name, description, price, location, type, category, condition } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name || !description || !price || !location || !type) {
      throw new ApiError(400, 'Required fields missing');
    }

    // Process images if they exist
    let images = [];
    if (req.files && req.files.length > 0) {
      images = await Promise.all(
        req.files.map(async (file) => {
          const uploaded = await uploadToS3(file);
          return {
            url: uploaded.url,
            key: uploaded.key
          };
        })
      );
    }

    // Create listing with processed data
    const listing = await marketplaceService.createProduct(
      {
        name,
        description,
        price: Number(price),
        location,
        type,
        category,
        condition,
        images
      },
      userId
    );

    Logger.info('Listing created successfully', { 
      listingId: listing._id,
      userId 
    });

    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: listing
    });
  } catch (error) {
    Logger.error('Failed to create listing', { error: error.message });
    next(error);
  }
};

export const getListings = async (req, res, next) => {
  try {
    const {
      type,
      location,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
      minPrice,
      maxPrice
    } = req.query;

    // Build base query
    const query = { status: 'active' };

    // Add type filter with validation
    if (type) {
      const validTypes = ['product', 'giveaway', 'service'];
      const normalizedType = type.toLowerCase();
      if (!validTypes.includes(normalizedType)) {
        throw new ApiError(400, 'Invalid listing type');
      }
      query.type = normalizedType;
    }

    // Add price range filters
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice && !isNaN(minPrice)) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice && !isNaN(maxPrice)) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // Add location and other filters
    if (location) {
      query.location = new RegExp(location, 'i');
    }

    // Add search if provided
    if (search.trim()) {
      query.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } }
      ];
    }

    Logger.info('Processing listing request:', {
      query,
      page,
      limit,
      type,
      location
    });

    const listings = await marketplaceService.getProducts({
      query,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    // Send response
    res.json({
      success: true,
      data: listings.docs,
      pagination: {
        total: listings.totalDocs,
        page: listings.page,
        pages: listings.totalPages,
        hasNext: listings.hasNextPage,
        hasPrev: listings.hasPrevPage
      },
      filters: {
        appliedType: type || 'all',
        appliedLocation: location || 'all',
        priceRange: {
          min: minPrice ? Number(minPrice) : null,
          max: maxPrice ? Number(maxPrice) : null
        }
      }
    });

  } catch (error) {
    Logger.error('Failed to fetch listings:', {
      error: error.message,
      query: req.query
    });
    next(error);
  }
};

export const getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw ApiError.badRequest('Listing ID is required');
    }

    // Fetch listing by ID
    const listing = await marketplaceService.getProductById(id);

    if (!listing) {
      throw ApiError.notFound('Listing not found');
    }

    Logger.info('Listing fetched successfully', { listingId: id });

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    Logger.error('Failed to fetch listing', { error: error.message });
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = { ...req.body };

    // Validate input
    if (!id) {
      throw ApiError.badRequest('Listing ID is required');
    }

    // Handle new image uploads if any
    if (req.files?.length) {
      const newImages = await Promise.all(req.files.map(file => uploadToS3(file)));
      updateData.images = [...(updateData.images || []), ...newImages];
    }

    // Update listing
    const listing = await marketplaceService.updateProduct(id, updateData, userId);

    Logger.info('Listing updated successfully', { listingId: id });

    res.json({
      success: true,
      message: 'Listing updated successfully',
      data: listing,
    });
  } catch (error) {
    Logger.error('Failed to update listing', { error: error.message });
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

    await marketplaceService.deleteProduct(id, userId);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    Logger.error('Failed to delete product', { 
      error: error.message,
      productId: req.params.id 
    });
    next(error);
  }
};

export const getMyListings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    // Validate numeric inputs
    if (isNaN(page) || isNaN(limit)) {
      throw ApiError.badRequest('Page and limit must be valid numbers');
    }

    // Fetch user listings
    const listings = await marketplaceService.getUserProducts(userId, { page, limit, status });

    Logger.info('User listings fetched successfully', { userId, count: listings.totalDocs });

    res.json({
      success: true,
      data: listings.docs,
      pagination: {
        total: listings.totalDocs,
        page: listings.page,
        pages: listings.totalPages,
        hasNext: listings.hasNextPage,
      },
    });
  } catch (error) {
    Logger.error('Failed to fetch user listings', { error: error.message });
    next(error);
  }
};

export const searchListings = async (req, res, next) => {
  try {
    const {
      query,
      type,
      location,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    // Validate numeric inputs
    if (isNaN(page) || isNaN(limit)) {
      throw ApiError.badRequest('Page and limit must be valid numbers');
    }

    if (minPrice && isNaN(minPrice)) {
      throw ApiError.badRequest('minPrice must be a valid number');
    }

    if (maxPrice && isNaN(maxPrice)) {
      throw ApiError.badRequest('maxPrice must be a valid number');
    }

    // Search listings
    const listings = await marketplaceService.searchProducts({
      query,
      type,
      location,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    Logger.info('Listings searched successfully', { count: listings.totalDocs });

    res.json({
      success: true,
      data: listings.docs,
      pagination: {
        total: listings.totalDocs,
        page: listings.page,
        pages: listings.totalPages,
        hasNext: listings.hasNextPage,
      },
    });
  } catch (error) {
    Logger.error('Failed to search listings', { error: error.message });
    next(error);
  }
};

export const getStudentMarketplace = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      minPrice,
      maxPrice,
      condition,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { 
      status: 'active',
      type: type || { $in: ['product', 'service', 'giveaway'] }
    };

    if (category) query.category = category;
    if (condition) query.condition = condition;
    
    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
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
          path: 'userId',
          select: 'username email avatar rating'
        }
      ],
      select: '-__v'
    };

    const products = await Product.paginate(query, options);

    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: products.docs,
      pagination: {
        total: products.totalDocs,
        page: products.page,
        pages: products.totalPages,
        hasNext: products.hasNextPage
      },
      filters: {
        appliedFilters: {
          type,
          category,
          priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
          condition
        }
      }
    });

  } catch (error) {
    Logger.error('Failed to retrieve student marketplace', { error: error.message });
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

    // Build query for landlord's products
    const query = {
      userId: userId
    };

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
      populate: 'category',
      select: '-__v'
    };

    const products = await Product.paginate(query, options);

    // Get additional stats
    const stats = {
      total: await Product.countDocuments({ userId }),
      active: await Product.countDocuments({ userId, status: 'active' }),
      sold: await Product.countDocuments({ userId, status: 'sold' }),
      revenue: await Product.aggregate([
        { $match: { userId: userId, status: 'sold' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.json({
      success: true,
      message: 'Landlord marketplace retrieved successfully',
      data: products.docs,
      pagination: {
        total: products.totalDocs,
        page: products.page,
        pages: products.totalPages,
        hasNext: products.hasNextPage
      },
      stats
    });

  } catch (error) {
    Logger.error('Failed to retrieve landlord marketplace', { error: error.message });
    next(error);
  }
};

export const getRelatedListings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 6 } = req.query;
    const userId = req.user?.id; // Optional: user might not be logged in

    // Get the original listing
    const listing = await Product.findById(id);
    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    // Build a more flexible query for related items
    const query = {
      _id: { $ne: id },
      status: 'active',
      $or: [
        // Same category items
        { 
          category: listing.category,
          price: {
            $gte: listing.price * 0.7,
            $lte: listing.price * 1.3
          }
        },
        // Same type items with similar price
        { 
          type: listing.type,
          price: {
            $gte: listing.price * 0.8,
            $lte: listing.price * 1.2
          }
        },
        // Items from same seller
        { userId: listing.userId },
        // Similar priced items
        {
          price: {
            $gte: listing.price * 0.9,
            $lte: listing.price * 1.1
          }
        }
      ]
    };

    // Find related listings with scoring
    const relatedListings = await Product.aggregate([
      { $match: query },
      // Calculate relevance score
      { 
        $addFields: {
          relevanceScore: {
            $add: [
              { $cond: [{ $eq: ["$category", listing.category] }, 3, 0] },
              { $cond: [{ $eq: ["$type", listing.type] }, 2, 0] },
              { $cond: [{ $eq: ["$userId", listing.userId] }, 2, 0] },
              {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$price", listing.price * 0.9] },
                      { $lte: ["$price", listing.price * 1.1] }
                    ]
                  },
                  1,
                  0
                ]
              }
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1, createdAt: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Populate user data
    await Product.populate(relatedListings, {
      path: 'userId',
      select: 'username avatar rating'
    });

    // Create notification for logged-in users
    if (userId && relatedListings.length > 0) {
      await notificationService.createRelatedItemsNotification(
        userId,
        relatedListings,
        listing
      );
    }

    // Add view tracking if user is logged in
    if (userId) {
      await Product.findByIdAndUpdate(id, {
        $push: {
          viewHistory: {
            userId,
            viewedAt: new Date()
          }
        }
      });
    }

    Logger.info('Related listings fetched', { 
      listingId: id,
      count: relatedListings.length 
    });

    res.json({
      success: true,
      data: relatedListings,
      metadata: {
        originalListing: {
          id: listing._id,
          name: listing.name,
          type: listing.type,
          category: listing.category,
          price: listing.price
        },
        relationshipType: 'multi_factor_relevance',
        factors: [
          'category_match',
          'type_match',
          'price_similarity',
          'seller_items'
        ],
        notificationSent: !!userId
      }
    });

  } catch (error) {
    Logger.error('Failed to fetch related listings', { 
      error: error.message,
      userId: req.user?.id,
      listingId: req.params.id
    });
    next(error);
  }
};

export const getRecommendations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { limit = 6 } = req.query;

    // Get user's view and interaction history
    const [viewHistory, purchaseHistory, wishlistItems] = await Promise.all([
      Product.find({ 'viewHistory.userId': userId })
        .sort({ 'viewHistory.lastViewed': -1 })
        .limit(20),
      Product.find({ 
        'purchaseHistory.buyerId': userId,
        status: 'sold'
      }).limit(10),
      Product.find({ 
        'wishlist.userId': userId,
        status: 'active'
      })
    ]);

    // Combine all user interactions for better preference analysis
    const userInteractions = [...viewHistory, ...purchaseHistory, ...wishlistItems];

    // Extract and weight user preferences
    const preferences = userInteractions.reduce((acc, item) => {
      // Weight factors based on interaction type
      const weight = item.status === 'sold' ? 3 : // Purchased items
                    item.wishlist?.includes(userId) ? 2 : // Wishlisted items
                    1; // Viewed items

      acc.categories[item.category] = (acc.categories[item.category] || 0) + weight;
      acc.types[item.type] = (acc.types[item.type] || 0) + weight;
      acc.priceRanges.push(item.price);
      
      return acc;
    }, { 
      categories: {}, 
      types: {}, 
      priceRanges: [] 
    });

    // Calculate preferred price range
    const avgPrice = preferences.priceRanges.reduce((a, b) => a + b, 0) / preferences.priceRanges.length || 0;

    // Get top preferences
    const topCategories = Object.entries(preferences.categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    const topTypes = Object.entries(preferences.types)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    // Get recommendations with scoring
    const recommendations = await Product.aggregate([
      {
        $match: {
          _id: { $ne: mongoose.Types.ObjectId(id) },
          status: 'active',
          $or: [
            { category: { $in: topCategories } },
            { type: { $in: topTypes } },
            {
              price: {
                $gte: avgPrice * 0.7,
                $lte: avgPrice * 1.3
              }
            }
          ]
        }
      },
      {
        $addFields: {
          score: {
            $add: [
              { $cond: [{ $in: ["$category", topCategories] }, 3, 0] },
              { $cond: [{ $in: ["$type", topTypes] }, 2, 0] },
              {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$price", avgPrice * 0.8] },
                      { $lte: ["$price", avgPrice * 1.2] }
                    ]
                  },
                  1,
                  0
                ]
              }
            ]
          }
        }
      },
      { $sort: { score: -1, viewCount: -1, createdAt: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Populate user data
    await Product.populate(recommendations, {
      path: 'userId',
      select: 'username avatar rating'
    });

    // Create notification for recommendations
    if (recommendations.length > 0) {
      await notificationService.createRecommendationNotification(
        userId,
        recommendations,
        await Product.findById(id)
      );
    }

    // Track this recommendation request
    await Product.findByIdAndUpdate(id, {
      $push: {
        recommendationHistory: {
          userId,
          requestedAt: new Date(),
          recommendationCount: recommendations.length
        }
      }
    });

    Logger.info('Recommendations generated', {
      userId,
      listingId: id,
      count: recommendations.length
    });

    res.json({
      success: true,
      data: recommendations,
      metadata: {
        basedOn: {
          topCategories,
          topTypes,
          priceRange: {
            average: avgPrice,
            min: avgPrice * 0.7,
            max: avgPrice * 1.3
          }
        },
        interactionStats: {
          viewedItems: viewHistory.length,
          purchasedItems: purchaseHistory.length,
          wishlistedItems: wishlistItems.length
        },
        recommendationType: 'personalized_multi_factor',
        notificationSent: true
      }
    });

  } catch (error) {
    Logger.error('Failed to generate recommendations', {
      error: error.message,
      userId: req.user?.id,
      listingId: req.params.id
    });
    next(error);
  }
};