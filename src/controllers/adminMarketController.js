import * as adminMarketService from '../services/adminMarketService.js';
import { ApiError } from '../utils/ApiError.js';

export const getAllListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      category,
      condition,
      seller,
      featured,
      dateRange,
      location,
      availability
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

    // Validate sort parameters
    const validSortFields = ['createdAt', 'price', 'views', 'rating', 'soldCount'];
    if (sortBy && !validSortFields.includes(sortBy)) {
      throw ApiError.badRequest(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
    }

    if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
      throw ApiError.badRequest('Sort order must be either asc or desc');
    }

    const filters = {
      status,
      type,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      search,
      category,
      condition,
      seller,
      featured: featured === 'true',
      dateRange: dateRange ? JSON.parse(dateRange) : undefined,
      location,
      availability: availability === 'true'
    };

    const listings = await adminMarketService.getAllListings(
      filters,
      parseInt(page),
      parseInt(limit),
      { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    );

    res.json({
      success: true,
      data: listings.docs,
      pagination: {
        total: listings.totalDocs,
        page: listings.page,
        pages: listings.totalPages,
        hasNext: listings.hasNextPage,
        hasPrev: listings.hasPrevPage,
        limit: listings.limit
      },
      summary: {
        totalActive: listings.totalActive,
        totalPending: listings.totalPending,
        totalSold: listings.totalSold,
        averagePrice: listings.averagePrice,
        totalRevenue: listings.totalRevenue,
        featuredCount: listings.featuredCount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getListingDetails = async (req, res, next) => {
  try {
    const { listingId } = req.params;

    if (!listingId) {
      throw ApiError.badRequest('Listing ID is required');
    }

    const listing = await adminMarketService.getListingDetails(listingId);

    if (!listing) {
      throw ApiError.notFound('Listing not found');
    }

    res.json({
      success: true,
      data: {
        ...listing,
        stats: {
          views: listing.viewCount,
          saves: listing.saveCount,
          inquiries: listing.inquiryCount,
          shares: listing.shareCount,
          reportCount: listing.reportCount
        },
        seller: {
          id: listing.seller._id,
          name: listing.seller.name,
          rating: listing.seller.rating,
          totalListings: listing.seller.totalListings,
          joinedDate: listing.seller.createdAt
        },
        pricing: {
          original: listing.originalPrice,
          current: listing.price,
          discount: listing.discount,
          currency: listing.currency
        },
        activity: {
          lastUpdated: listing.updatedAt,
          createdAt: listing.createdAt,
          lastViewed: listing.lastViewedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateListingStatus = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { status, reason, featured, adminNotes } = req.body;

    if (!listingId) {
      throw ApiError.badRequest('Listing ID is required');
    }

    if (!status) {
      throw ApiError.badRequest('Status is required');
    }

    const validStatuses = ['pending', 'active', 'suspended', 'sold', 'removed'];
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const listing = await adminMarketService.updateListingStatus(listingId, {
      status,
      reason,
      featured,
      adminNotes,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Listing status updated successfully',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

export const getMarketplaceAnalytics = async (req, res, next) => {
  try {
    const {
      timeframe = 'week',
      category,
      seller,
      priceRange,
      location
    } = req.query;

    const validTimeframes = ['day', 'week', 'month', 'year', 'custom'];
    if (!validTimeframes.includes(timeframe)) {
      throw ApiError.badRequest(`Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
    }

    const filters = {
      category,
      seller,
      priceRange: priceRange ? JSON.parse(priceRange) : undefined,
      location
    };

    const analytics = await adminMarketService.getMarketplaceAnalytics(timeframe, filters);

    res.json({
      success: true,
      data: {
        overview: {
          totalListings: analytics.totalListings,
          activeListings: analytics.activeListings,
          totalSellers: analytics.totalSellers,
          totalRevenue: analytics.totalRevenue,
          averagePrice: analytics.averagePrice,
          conversionRate: analytics.conversionRate
        },
        trends: {
          listingsByCategory: analytics.listingsByCategory,
          salesByDay: analytics.salesByDay,
          popularCategories: analytics.popularCategories,
          priceDistribution: analytics.priceDistribution
        },
        performance: {
          bestSellers: analytics.bestSellers,
          topPerformingListings: analytics.topPerformingListings,
          categoryPerformance: analytics.categoryPerformance
        },
        engagement: {
          totalViews: analytics.totalViews,
          averageViewsPerListing: analytics.averageViewsPerListing,
          inquiryRate: analytics.inquiryRate,
          responseRate: analytics.responseRate
        },
        geographical: {
          listingsByLocation: analytics.listingsByLocation,
          popularLocations: analytics.popularLocations,
          crossBorderSales: analytics.crossBorderSales
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getListingReports = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reports = await adminMarketService.getListingReports(
      listingId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: reports.docs,
      pagination: {
        total: reports.totalDocs,
        page: reports.page,
        pages: reports.totalPages,
        hasNext: reports.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const featuredListings = await adminMarketService.getFeaturedListings(
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: featuredListings.docs,
      pagination: {
        total: featuredListings.totalDocs,
        page: featuredListings.page,
        pages: featuredListings.totalPages,
        hasNext: featuredListings.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};