import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export const createProduct = async (productData, userId) => {
  try {
    // Validate required fields
    if (!productData.name || !productData.description || !productData.price || !productData.type || !productData.location) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Create the product with validated data
    const product = new Product({
      ...productData,
      userId,
      status: 'active',
      images: productData.images || []
    });

    // Save the product
    await product.save();

    // Populate user data
    await product.populate('userId', 'username email avatar');

    Logger.info('Product created successfully', { productId: product._id });

    return product;
  } catch (error) {
    Logger.error('Product creation failed', { 
      error: error.message,
      productData,
      userId 
    });
    
    if (error instanceof mongoose.Error.ValidationError) {
      throw new ApiError(400, 'Invalid product data', Object.values(error.errors).map(err => err.message));
    }
    
    throw new ApiError(500, 'Failed to create product: ' + error.message);
  }
};

export const getProducts = async ({ query, page, limit, sortBy, sortOrder }) => {
  try {
    // Validate inputs
    const validatedQuery = { ...query };
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(50, Math.max(1, parseInt(limit)));

    // Ensure price query is properly formatted
    if (validatedQuery.price) {
      if (validatedQuery.price.$gte) {
        validatedQuery.price.$gte = Number(validatedQuery.price.$gte);
      }
      if (validatedQuery.price.$lte) {
        validatedQuery.price.$lte = Number(validatedQuery.price.$lte);
      }
    }

    // Debug log
    Logger.info('Fetching products with query:', {
      query: validatedQuery,
      page: validatedPage,
      limit: validatedLimit,
      priceFilter: validatedQuery.price
    });

    // Use find instead of aggregate for better index usage
    const [totalDocs, docs] = await Promise.all([
      Product.countDocuments(validatedQuery),
      Product.find(validatedQuery)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((validatedPage - 1) * validatedLimit)
        .limit(validatedLimit)
        .populate('userId', 'username email avatar')
        .lean()
    ]);

    return {
      docs,
      totalDocs,
      limit: validatedLimit,
      page: validatedPage,
      totalPages: Math.ceil(totalDocs / validatedLimit),
      hasNextPage: (validatedPage * validatedLimit) < totalDocs,
      hasPrevPage: validatedPage > 1
    };

  } catch (error) {
    Logger.error('Product fetch error:', {
      error: error.message,
      query
    });
    throw error;
  }
};

export const getProductById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid listing ID');
  }

  const product = await Product.findById(id)
    .populate('userId', 'username email avatar')
    // .populate('categoryId', 'name description')
    .populate('images', 'url key');
  if (!product) {
    throw new ApiError(404, 'Listing not found');
  }

  return product;
};

export const updateProduct = async (id, updateData, userId) => {
  const product = await getProductById(id);

  // Check ownership
  if (product.userId.toString() !== userId) {
    throw new ApiError(403, 'Not authorized to update this listing');
  }

  // Update the product
  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { ...updateData, updatedAt: new Date() },
    { new: true }
  )
    .populate('userId', 'username email avatar')
    // .populate('categoryId', 'name description')
    .populate('images', 'url key');

  return updatedProduct;
};

export const deleteProduct = async (productId, userId) => {
  try {
    // Find the product first
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Check if user owns the product
    if (product.userId.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to delete this product');
    }

    // Soft delete by updating status
    const deletedProduct = await Product.findByIdAndUpdate(
      productId,
      { 
        status: 'deleted',
        'metadata.lastUpdated': new Date()
      },
      { new: true }
    );

    Logger.info('Product deleted successfully', { productId });

    return deletedProduct;
  } catch (error) {
    Logger.error('Failed to delete product', { 
      error: error.message,
      productId,
      userId 
    });
    throw error;
  }
};

export const getUserProducts = async (userId, { page = 1, limit = 10, status }) => {
  const query = { userId };
  if (status) query.status = status;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: 'userId',
    select: '-__v'
  };

  return await Product.paginate(query, options);
};

export const searchProducts = async ({
  query,
  type,
  location,
  minPrice,
  maxPrice,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  page = 1,
  limit = 10
}) => {
  const searchQuery = { status: 'active' };

  // Text search
  if (query) {
    searchQuery.$or = [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ];
  }

  // Filters
  if (type) searchQuery.type = type;
  if (location) searchQuery.location = { $regex: location, $options: 'i' };
  if (minPrice || maxPrice) {
    searchQuery.price = {};
    if (minPrice) searchQuery.price.$gte = Number(minPrice);
    if (maxPrice) searchQuery.price.$lte = Number(maxPrice);
  }

  // Sorting
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    populate: 'userId',
    select: '-__v'
  };

  return await Product.paginate(searchQuery, options);
};

export const getProductsCount = async (query) => {
  return await Product.countDocuments(query);
};

export const aggregateProducts = async (pipeline) => {
  return await Product.aggregate(pipeline);
};