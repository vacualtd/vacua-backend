import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { Logger } from '../utils/logger.js';
import { Inquiry } from '../models/Inquiry.js';
import { UserActivity } from '../models/UserActivity.js';

const computeStats = async () => {
  try {
    // Basic user stats
    const [
      totalUsers,
      totalLandlords,
      totalStudents,
      totalAdmins,
      newUsers,
      verifiedUsers,
      premiumUsers,
      activeUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'landlord' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({
        subscriptionStatus: 'active',
        subscriptionTier: 'premium'
      }),
      UserActivity.distinct('userId', {
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).then(users => users.length)
    ]);

    // Calculate verification rate
    const verificationRate = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

    // Property stats
    const [
      totalProperties,
      activeProperties,
      pendingProperties,
      verifiedProperties,
      propertiesByType,
      propertiesByCity,
      popularAmenities,
      mostViewedProperties,
      propertyStats
    ] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: 'active' }),
      Property.countDocuments({ status: 'pending' }),
      Property.countDocuments({ isVerified: true }),
      Property.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]),
      Property.aggregate([
        {
          $group: {
            _id: '$location.city',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' },
            averagePrice: { $avg: '$price' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Property.aggregate([
        { $unwind: '$amenities' },
        {
          $group: {
            _id: '$amenities',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      Property.find()
        .sort({ viewCount: -1 })
        .limit(5)
        .select('description.title price viewCount location'),
      Property.aggregate([
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$viewCount' },
            averagePrice: { $avg: '$price' },
            averageRating: { $avg: '$averageRating' }
          }
        }
      ])
    ]);

    // Engagement stats
    const [
      totalBookings,
      totalInquiries,
      responseStats,
      bookingConversionStats
    ] = await Promise.all([
      Transaction.countDocuments({ type: 'booking', status: 'completed' }),
      Inquiry.countDocuments(),
      Property.aggregate([
        {
          $group: {
            _id: null,
            totalResponses: { $sum: { $cond: ['$hasResponse', 1, 0] } },
            totalInquiries: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' }
          }
        }
      ]),
      Transaction.aggregate([
        {
          $match: { type: 'booking' }
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalRevenue: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // Revenue calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const revenueStats = await Transaction.aggregate([
      {
        $facet: {
          total: [
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          monthly: [
            {
              $match: {
                status: 'completed',
                createdAt: { $gte: startOfMonth }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          annual: [
            {
              $match: {
                status: 'completed',
                createdAt: { $gte: startOfYear }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          byCategory: [
            { $match: { status: 'completed' } },
            {
              $group: {
                _id: '$type',
                total: { $sum: '$amount' }
              }
            }
          ]
        }
      }
    ]);

    // Extract revenue values
    const totalRevenue = revenueStats[0]?.total[0]?.total || 0;
    const monthlyRevenue = revenueStats[0]?.monthly[0]?.total || 0;
    const annualRevenue = revenueStats[0]?.annual[0]?.total || 0;

    // Calculate revenue by category
    const revenueByCategory = {};
    revenueStats[0]?.byCategory.forEach(category => {
      revenueByCategory[category._id] = category.total;
    });

    // Calculate rates and averages
    const responseRate = responseStats[0]
      ? (responseStats[0].totalResponses / responseStats[0].totalInquiries) * 100
      : 0;

    const bookingConversionRate = bookingConversionStats[0]
      ? (bookingConversionStats[0].totalBookings / propertyStats[0].totalViews) * 100
      : 0;

    const occupancyRate = totalProperties > 0
      ? (activeProperties / totalProperties) * 100
      : 0;

    return {
      // User stats
      totalUsers,
      totalLandlords,
      totalStudents,
      totalAdmins,
      newUsers,
      verifiedUsers,
      premiumUsers,
      activeUsers,
      verificationRate,

      // Property stats
      totalProperties,
      activeProperties,
      pendingProperties,
      verifiedProperties,
      propertiesByType: Object.fromEntries(
        propertiesByType.map(item => [item._id, item.count])
      ),
      propertiesByCity: Object.fromEntries(
        propertiesByCity.map(item => [item._id, item.count])
      ),
      averagePropertyPrice: propertyStats[0]?.averagePrice || 0,
      popularAmenities,
      mostViewedProperties,

      // Revenue stats
      totalRevenue,
      monthlyRevenue,
      annualRevenue,
      bookingRevenue: revenueByCategory.booking || 0,
      subscriptionRevenue: revenueByCategory.subscription || 0,
      commissionRevenue: revenueByCategory.commission || 0,

      // Engagement stats
      totalBookings,
      totalInquiries,
      responseRate,
      averageResponseTime: responseStats[0]?.avgResponseTime || 0,
      totalViews: propertyStats[0]?.totalViews || 0,
      averageRating: propertyStats[0]?.averageRating || 0,
      bookingConversionRate,
      activeListings: activeProperties,

      // Growth calculations
      monthlyGrowth: monthlyRevenue > 0
        ? ((monthlyRevenue / (totalRevenue - monthlyRevenue)) - 1) * 100
        : 0,
      annualGrowth: annualRevenue > 0
        ? ((annualRevenue / (totalRevenue - annualRevenue)) - 1) * 100
        : 0,

      // Performance metrics
      occupancyRate,
      topPerformingCities: propertiesByCity.slice(0, 5)
    };
  } catch (error) {
    Logger.error('Error computing stats:', error);
    throw error;
  }
};

export const getOverviewStats = async () => {
  try {
    const stats = await computeStats();
    return stats;
  } catch (error) {
    Logger.error('Error in getOverviewStats:', error);
    throw error;
  }
};

export const getInternationalStats = async () => {
  const stats = await User.aggregate([
    {
      $match: { role: 'student' }
    },
    {
      $lookup: {
        from: 'studentprofiles',
        localField: '_id',
        foreignField: 'userId',
        as: 'profile'
      }
    },
    {
      $unwind: '$profile'
    },
    {
      $group: {
        _id: '$profile.nationality',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 4
    }
  ]);

  return stats.map(stat => ({
    country: stat._id,
    count: stat.count
  }));
};

export const getVerificationStats = async () => {
  const [
    verifiedStudents,
    verifiedLandlords
  ] = await Promise.all([
    User.countDocuments({ role: 'student', isVerified: true }),
    User.countDocuments({ role: 'landlord', isVerified: true })
  ]);

  return {
    verifiedStudents,
    verifiedLandlords
  };
};

const calculateTotalEarnings = async () => {
  const result = await Property.aggregate([
    {
      $match: {
        status: 'published'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$price' }
      }
    }
  ]);

  return result[0]?.total || 0;
};

const calculateHitRate = async () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const totalViews = await Property.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear }
      }
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$viewCount' }
      }
    }
  ]);

  const totalListings = await Property.countDocuments({
    createdAt: { $gte: startOfYear }
  });

  if (!totalListings) return 0;
  return Math.round((totalViews[0]?.totalViews || 0) / totalListings * 100);
};

const calculateDealRate = async () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const totalDeals = await Property.countDocuments({
    status: 'sold',
    createdAt: { $gte: startOfYear }
  });

  const totalListings = await Property.countDocuments({
    createdAt: { $gte: startOfYear }
  });

  if (!totalListings) return 0;
  return Math.round((totalDeals / totalListings) * 100);
};

const getUserStats = async () => {
  const currentYear = new Date().getFullYear();
  const months = [];

  for (let i = 0; i < 12; i++) {
    const startDate = new Date(currentYear, i, 1);
    const endDate = new Date(currentYear, i + 1, 0);

    const monthStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    months.push({
      month: startDate.toLocaleString('default', { month: 'short' }),
      students: monthStats.find(s => s._id === 'student')?.count || 0,
      landlords: monthStats.find(s => s._id === 'landlord')?.count || 0
    });
  }

  return months;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
};

export const getAllProperties = async (filters = {}, page = 1, limit = 10, sort = { createdAt: -1 }) => {
  try {
    const query = {};

    // Basic filters with validation
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.verified !== undefined) query.isVerified = filters.verified;

    // Validate and clean city filter
    if (filters.city) {
      // Handle if city is accidentally passed as an array
      const cityValue = Array.isArray(filters.city) ? filters.city[0] : filters.city;
      // Only add to query if it's a non-empty string
      if (typeof cityValue === 'string' && cityValue.trim()) {
        query['location.city'] = { $regex: cityValue.trim(), $options: 'i' };
      }
    }

    if (filters.hostId) query['host.userId'] = filters.hostId;
    if (filters.isBooked !== undefined) query.isBooked = filters.isBooked;

    // Price range filter with validation
    if (filters.priceRange) {
      query.price = {};
      if (filters.priceRange.min && !isNaN(filters.priceRange.min)) {
        query.price.$gte = Number(filters.priceRange.min);
      }
      if (filters.priceRange.max && !isNaN(filters.priceRange.max)) {
        query.price.$lte = Number(filters.priceRange.max);
      }
      // Remove empty price query
      if (Object.keys(query.price).length === 0) {
        delete query.price;
      }
    }

    // Rating filter with validation
    if (filters.rating && !isNaN(filters.rating)) {
      query.averageRating = { $gte: Number(filters.rating) };
    }

    // Amenities filter with validation
    if (filters.amenities && Array.isArray(filters.amenities)) {
      const validAmenities = filters.amenities.filter(amenity =>
        typeof amenity === 'string' && amenity.trim()
      );
      if (validAmenities.length > 0) {
        query['amenities'] = { $all: validAmenities };
      }
    }

    // Availability filter with validation
    if (filters.dateRange && typeof filters.dateRange === 'object') {
      const { start, end } = filters.dateRange;
      if (start && end && !isNaN(new Date(start)) && !isNaN(new Date(end))) {
        query['availability.isAvailable'] = true;
        query['availability.availableFrom'] = { $lte: new Date(start) };
        query['availability.availableTo'] = { $gte: new Date(end) };
      }
    }

    // Search filter with validation
    if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      query.$or = [
        { 'description.title': { $regex: searchTerm, $options: 'i' } },
        { 'location.address': { $regex: searchTerm, $options: 'i' } },
        { 'location.city': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    // Validate sort parameter
    const validatedSort = typeof sort === 'object' && sort !== null ? sort : { createdAt: -1 };

    // Get counts for summary with validated query
    const [totalActive, totalPending, totalVerified, priceStats, bookingStats] = await Promise.all([
      Property.countDocuments({ ...query, status: 'active' }),
      Property.countDocuments({ ...query, status: 'pending' }),
      Property.countDocuments({ ...query, isVerified: true }),
      Property.aggregate([
        { $match: query },
        { $group: { _id: null, averagePrice: { $avg: '$price' } } }
      ]),
      Property.aggregate([
        { $match: query },
        { $group: { _id: null, totalBookings: { $sum: { $size: '$bookingHistory' } } } }
      ])
    ]);

    // Execute paginated query with validation
    const properties = await Property.paginate(query, {
      page: validatedPage,
      limit: validatedLimit,
      sort: validatedSort,
      populate: [
        {
          path: 'host.userId',
          select: 'email username role isVerified'
        },
        {
          path: 'bookingHistory.userId',
          select: 'email username'
        }
      ],
      select: '-__v'
    });

    return {
      ...properties,
      totalActive,
      totalPending,
      totalVerified,
      averagePrice: priceStats[0]?.averagePrice || 0,
      totalBookings: bookingStats[0]?.totalBookings || 0
    };
  } catch (error) {
    Logger.error('Error in getAllProperties:', error);
    throw new ApiError(500, 'Error retrieving properties');
  }
};

export const getPropertyDetails = async (propertyId) => {
  try {
    const property = await Property.findById(propertyId)
      .populate('host.userId', 'email username role isVerified')
      .populate('bookingHistory.userId', 'email username')
      .lean();

    if (!property) {
      throw ApiError.notFound('Property not found');
    }

    // Get additional stats
    const [viewsStats, bookingsStats] = await Promise.all([
      UserActivity.countDocuments({
        propertyId,
        activityType: 'view_property'
      }),
      Transaction.countDocuments({
        propertyId,
        type: 'booking',
        status: 'completed'
      })
    ]);

    return {
      ...property,
      stats: {
        totalViews: viewsStats,
        totalBookings: bookingsStats,
        occupancyRate: property.bookingHistory ?
          (property.bookingHistory.length / property.viewCount) * 100 : 0
      }
    };
  } catch (error) {
    Logger.error('Error in getPropertyDetails:', error);
    throw error;
  }
};

export const getPropertyStats = async (propertyId, dateRange) => {
  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      throw ApiError.notFound('Property not found');
    }

    const query = { propertyId };
    if (dateRange) {
      const { start, end } = JSON.parse(dateRange);
      query.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    const [viewStats, bookingStats, inquiryStats] = await Promise.all([
      UserActivity.countDocuments({
        ...query,
        activityType: 'view_property'
      }),
      Transaction.countDocuments({
        ...query,
        type: 'booking',
        status: 'completed'
      }),
      Inquiry.countDocuments(query)
    ]);

    return {
      views: viewStats,
      bookings: bookingStats,
      inquiries: inquiryStats,
      conversionRate: viewStats > 0 ? (bookingStats / viewStats) * 100 : 0,
      responseRate: inquiryStats > 0 ? (property.hasResponse ? 100 : 0) : 0,
      averageResponseTime: property.responseTime || 0
    };
  } catch (error) {
    Logger.error('Error in getPropertyStats:', error);
    throw error;
  }
};

export const verifyProperty = async (propertyId, { adminId, status = 'verified', reason }) => {
  try {
    // Find the property first
    const property = await Property.findById(propertyId);
    
    if (!property) {
      Logger.error('Property not found for verification', { propertyId });
      throw new ApiError(404, 'Property not found');
    }

    // Check if property is in a verifiable state
    if (!['pending', 'draft', 'under_review'].includes(property.status)) {
      throw new ApiError(400, `Cannot verify property in ${property.status} status`);
    }

    // Update property with verification details
    const updateData = {
      status: status === 'verified' ? 'published' : 'rejected',
      isVerified: status === 'verified',
      verifiedAt: new Date(),
      verifiedBy: adminId,
      metadata: {
        ...property.metadata,
        lastStatusUpdate: new Date(),
        verificationReason: reason || `Property ${status === 'verified' ? 'verified' : 'rejected'} by admin`,
        publishedAt: status === 'verified' ? new Date() : null
      }
    };

    // Update the property
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      {
        $set: updateData,
        $push: {
          verificationHistory: {
            status: updateData.status,
            verifiedBy: adminId,
            verifiedAt: updateData.verifiedAt,
            reason: reason || `Property ${status === 'verified' ? 'verified' : 'rejected'} by admin`
          }
        }
      },
      { new: true }
    );

    if (!updatedProperty) {
      throw new ApiError(404, 'Property not found');
    }

    Logger.info('Property verification completed', {
      propertyId,
      adminId,
      status: updateData.status
    });

    return updatedProperty;
  } catch (error) {
    Logger.error('Property verification failed in service', {
      error: error.message,
      propertyId,
      adminId
    });
    throw error;
  }
};

export const unpublishProperty = async (propertyId, { adminId, reason }) => {
  try {
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    if (property.status !== 'published') {
      throw new ApiError(400, 'Property is not currently published');
    }

    // Set status back to draft instead of unpublished
    property.status = 'draft';
    property.metadata = {
      ...property.metadata,
      unpublishedAt: new Date(),
      unpublishedBy: adminId,
      unpublishReason: reason,
      lastStatusUpdate: new Date(),
      previousStatus: 'published'
    };

    // Add to status history
    if (!property.statusHistory) {
      property.statusHistory = [];
    }

    property.statusHistory.push({
      status: 'draft',
      updatedBy: adminId,
      reason: reason || 'Unpublished by admin',
      timestamp: new Date(),
      previousStatus: 'published'
    });

    await property.save();

    Logger.info('Property unpublished successfully', {
      propertyId,
      adminId,
      newStatus: 'draft',
      reason
    });

    return property;
  } catch (error) {
    Logger.error('Failed to unpublish property', {
      error: error.message,
      propertyId,
      adminId
    });
    throw error;
  }
};

export const updatePropertyStatus = async (propertyId, status) => {
  const property = await Property.findByIdAndUpdate(
    propertyId,
    { status },
    { new: true }
  );

  if (!property) {
    throw ApiError.notFound('Property not found');
  }

  return property;
};

export const getPropertyAnalytics = async (propertyId) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  // Get views over time
  const viewsOverTime = await Property.aggregate([
    { $match: { _id: property._id } },
    {
      $lookup: {
        from: 'propertyviews',
        localField: '_id',
        foreignField: 'propertyId',
        as: 'views'
      }
    },
    {
      $project: {
        views: {
          $map: {
            input: '$views',
            as: 'view',
            in: {
              date: '$$view.createdAt',
              count: 1
            }
          }
        }
      }
    }
  ]);

  // Get inquiries data
  const inquiries = await Property.aggregate([
    { $match: { _id: property._id } },
    {
      $lookup: {
        from: 'inquiries',
        localField: '_id',
        foreignField: 'propertyId',
        as: 'inquiries'
      }
    },
    {
      $project: {
        totalInquiries: { $size: '$inquiries' },
        responseRate: {
          $multiply: [
            {
              $divide: [
                {
                  $size: {
                    $filter: {
                      input: '$inquiries',
                      as: 'inq',
                      cond: { $ne: ['$$inq.response', null] }
                    }
                  }
                },
                { $size: '$inquiries' }
              ]
            },
            100
          ]
        }
      }
    }
  ]);

  return {
    property: {
      title: property.description.title,
      status: property.status,
      isVerified: property.isVerified,
      price: property.price,
      type: property.type
    },
    analytics: {
      viewsOverTime: viewsOverTime[0]?.views || [],
      inquiries: inquiries[0] || { totalInquiries: 0, responseRate: 0 },
      reviewsCount: property.reviewsCount,
      averageRating: property.averageRating
    }
  };
};

export const getUsersList = async (filters = {}, page = 1, limit = 10) => {
  const query = {};

  if (filters.role) query.role = filters.role;
  if (filters.verified !== undefined) query.isVerified = filters.verified;
  if (filters.search) {
    query.$or = [
      { email: { $regex: filters.search, $options: 'i' } },
      { username: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    select: '-password -otp'
  };

  try {
    const users = await User.paginate(query, options);
    return users;
  } catch (error) {
    console.error('Error in getUsersList:', error);
    throw error;
  }
};

export const updateUserStatus = async (userId, status) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: status },
    { new: true }
  ).select('-password -otp');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
};

