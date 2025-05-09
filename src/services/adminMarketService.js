import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

export const getAllListings = async (filters = {}, page = 1, limit = 10) => {
  const query = {};
  
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.minPrice) query.price = { $gte: filters.minPrice };
  if (filters.maxPrice) {
    query.price = { ...query.price, $lte: filters.maxPrice };
  }
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { location: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const listings = await Product.paginate(query, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: 'userId',
    select: '-__v'
  });

  return listings;
};

export const getListingDetails = async (listingId) => {
  const listing = await Product.findById(listingId)
    .populate('userId');

  if (!listing) {
    throw new ApiError(404, 'Listing not found');
  }

  return listing;
};

export const updateListingStatus = async (listingId, status) => {
  const listing = await Product.findByIdAndUpdate(
    listingId,
    { status },
    { new: true }
  ).populate('userId');

  if (!listing) {
    throw new ApiError(404, 'Listing not found');
  }

  return listing;
};

export const getMarketplaceAnalytics = async (timeframe = 'week') => {
  const timeRanges = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000
  };

  const startDate = new Date(Date.now() - timeRanges[timeframe]);

  // Get listings statistics
  const listingsStats = await Product.aggregate([
    {
      $facet: {
        totalListings: [
          { $count: 'count' }
        ],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        byType: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ],
        recentActivity: [
          {
            $match: {
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ],
        priceDistribution: [
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    { case: { $lte: ['$price', 100] }, then: '0-100' },
                    { case: { $lte: ['$price', 500] }, then: '101-500' },
                    { case: { $lte: ['$price', 1000] }, then: '501-1000' }
                  ],
                  default: '1000+'
                }
              },
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);

  // Calculate average prices by type
  const averagePrices = await Product.aggregate([
    {
      $group: {
        _id: '$type',
        averagePrice: { $avg: '$price' }
      }
    }
  ]);

  // Get user engagement metrics
  const userEngagement = await Product.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $group: {
        _id: '$userId',
        listingsCount: { $sum: 1 },
        totalValue: { $sum: '$price' }
      }
    },
    {
      $group: {
        _id: null,
        averageListingsPerUser: { $avg: '$listingsCount' },
        averageValuePerUser: { $avg: '$totalValue' }
      }
    }
  ]);

  return {
    overview: {
      totalListings: listingsStats[0].totalListings[0]?.count || 0,
      byStatus: listingsStats[0].byStatus,
      byType: listingsStats[0].byType
    },
    trends: {
      recentActivity: listingsStats[0].recentActivity,
      priceDistribution: listingsStats[0].priceDistribution,
      averagePrices
    },
    engagement: userEngagement[0] || {
      averageListingsPerUser: 0,
      averageValuePerUser: 0
    }
  };
};