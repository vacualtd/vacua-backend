import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';  // Add Chat model import
import { Message } from '../models/Message.js';  // Add Message model import
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as adminService from '../services/adminService.js';
import { Logger } from '../utils/logger.js';
import { sendVerificationStatusEmail } from '../utils/emailService.js';
import mongoose from 'mongoose';

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const admin = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!admin) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin._id,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getOverviewStats();

    // Enhanced dashboard stats with product information
    const dashboardStats = {
      overview: {
        totalUsers: stats.totalUsers || 0,
        totalLandlords: stats.totalLandlords || 0,
        totalStudents: stats.totalStudents || 0,
        totalProperties: stats.totalProperties || 0,
        totalProducts: stats.totalProducts || 0,
        totalRevenue: stats.totalRevenue || 0,
        totalBookings: stats.totalBookings || 0,
        totalInquiries: stats.totalInquiries || 0,
        totalVerifiedProperties: stats.verifiedProperties || 0,
        totalActiveProducts: stats.activeProducts || 0
      },
      users: {
        total: stats.totalUsers || 0,
        new: stats.newUsers || 0,
        verified: stats.verifiedUsers || 0,
        premium: stats.premiumUsers || 0,
        activeUsers: stats.activeUsers || 0,
        usersByRole: {
          students: stats.totalStudents || 0,
          landlords: stats.totalLandlords || 0,
          admins: stats.totalAdmins || 0,
          vendors: stats.totalVendors || 0
        },
        verificationRate: stats.verificationRate || 0
      },
      properties: {
        total: stats.totalProperties || 0,
        active: stats.activeProperties || 0,
        pending: stats.pendingProperties || 0,
        verified: stats.verifiedProperties || 0,
        byType: stats.propertiesByType || {},
        byCity: stats.propertiesByCity || {},
        occupancyRate: stats.occupancyRate || 0,
        averagePrice: stats.averagePropertyPrice || 0
      },
      products: {
        total: stats.totalProducts || 0,
        active: stats.activeProducts || 0,
        pendingReview: stats.pendingProducts || 0,
        outOfStock: stats.outOfStockProducts || 0,
        byCategory: stats.productsByCategory || {},
        averageRating: stats.averageProductRating || 0,
        totalSales: stats.totalProductSales || 0
      },
      revenue: {
        total: stats.totalRevenue || 0,
        monthly: stats.monthlyRevenue || 0,
        annual: stats.annualRevenue || 0,
        byCategory: {
          bookings: stats.bookingRevenue || 0,
          subscriptions: stats.subscriptionRevenue || 0,
          commissions: stats.commissionRevenue || 0,
          products: stats.productRevenue || 0
        },
        growth: {
          monthly: stats.monthlyGrowth || 0,
          annual: stats.annualGrowth || 0,
          productSales: stats.productSalesGrowth || 0
        }
      },
      engagement: {
        activeListings: stats.activeListings || 0,
        totalViews: stats.totalViews || 0,
        averageRating: stats.averageRating || 0,
        totalBookings: stats.totalBookings || 0,
        totalInquiries: stats.totalInquiries || 0,
        productSales: stats.totalProductSales || 0,
        responseRate: stats.responseRate || 0,
        averageResponseTime: stats.averageResponseTime || 0
      },
      performance: {
        bookingConversionRate: stats.bookingConversionRate || 0,
        productConversionRate: stats.productConversionRate || 0,
        averageOccupancyDuration: stats.averageOccupancyDuration || 0,
        popularAmenities: stats.popularAmenities || [],
        topPerformingCities: stats.topPerformingCities || [],
        mostViewedProperties: stats.mostViewedProperties || [],
        topSellingProducts: stats.topSellingProducts || []
      }
    };

    res.json({
      success: true,
      data: dashboardStats,
    });
  } catch (error) {
    next(error);
  }
};

export const getInternationalDistribution = async (req, res, next) => {
  try {
    const stats = await adminService.getInternationalStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificationStats = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                { $eq: ['$identityVerification.status', 'pending'] },
                1,
                0
              ]
            }
          },
          approved: {
            $sum: {
              $cond: [
                { $eq: ['$identityVerification.status', 'verified'] },
                1,
                0
              ]
            }
          },
          rejected: {
            $sum: {
              $cond: [
                { $eq: ['$identityVerification.status', 'rejected'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProperties = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      verified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      priceMin,
      priceMax,
      city,
      amenities,
      rating,
      availability,
      hostId,
      isBooked,
      dateRange
    } = req.query;

    const filters = {
      status,
      type,
      verified,
      search,
      priceRange: priceMin || priceMax ? { min: priceMin, max: priceMax } : null,
      city,
      amenities: amenities ? amenities.split(',') : null,
      rating: rating ? Number(rating) : null,
      availability,
      hostId,
      isBooked: isBooked === 'true',
      dateRange: dateRange ? JSON.parse(dateRange) : null
    };

    const properties = await adminService.getAllProperties(
      filters,
      parseInt(page),
      parseInt(limit),
      { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    );

    res.json({
      success: true,
      data: properties.docs,
      pagination: {
        total: properties.totalDocs,
        page: properties.page,
        pages: properties.totalPages,
        hasNext: properties.hasNextPage,
        hasPrev: properties.hasPrevPage,
        limit: properties.limit,
      },
      summary: {
        totalActive: properties.totalActive,
        totalPending: properties.totalPending,
        totalVerified: properties.totalVerified,
        averagePrice: properties.averagePrice,
        totalBookings: properties.totalBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertyDetails = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      throw ApiError.badRequest('Property ID is required');
    }

    const property = await adminService.getPropertyDetails(propertyId);

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertyStats = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { dateRange } = req.query;

    if (!propertyId) {
      throw ApiError.badRequest('Property ID is required');
    }

    const stats = await adminService.getPropertyStats(propertyId, dateRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertiesByHost = async (req, res, next) => {
  try {
    const { hostId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const properties = await adminService.getPropertiesByHost(
      hostId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: properties.docs,
      pagination: {
        total: properties.totalDocs,
        page: properties.page,
        pages: properties.totalPages,
        hasNext: properties.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { status = 'verified', reason } = req.body;
    const adminId = req.user.id;

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new ApiError(400, 'Valid Property ID is required');
    }

    Logger.info('Attempting to verify property', {
      propertyId,
      adminId,
      status
    });

    const result = await adminService.verifyProperty(propertyId, {
      adminId,
      status,
      reason
    });

    res.json({
      success: true,
      message: `Property ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      data: {
        propertyId: result._id,
        status: result.status,
        verifiedAt: result.verifiedAt,
        verifiedBy: result.verifiedBy,
        metadata: result.metadata
      }
    });
  } catch (error) {
    Logger.error('Property verification failed', {
      error: error.message,
      propertyId: req.params.propertyId,
      adminId: req.user?.id
    });
    next(error);
  }
};

export const updatePropertyStatus = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { status } = req.body;

    if (!propertyId || !status) {
      throw ApiError.badRequest('Property ID and status are required');
    }

    const property = await adminService.updatePropertyStatus(propertyId, status);

    res.json({
      success: true,
      message: 'Property status updated successfully',
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

export const unpublishProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new ApiError(400, 'Valid Property ID is required');
    }

    Logger.info('Attempting to unpublish property', {
      propertyId,
      adminId,
      reason
    });

    const result = await adminService.unpublishProperty(propertyId, {
      adminId,
      reason
    });

    res.json({
      success: true,
      message: 'Property unpublished successfully',
      data: {
        propertyId: result._id,
        status: result.status,
        unpublishedAt: result.metadata?.unpublishedAt,
        unpublishedBy: result.metadata?.unpublishedBy,
        reason: result.metadata?.unpublishReason,
        previousStatus: result.metadata?.previousStatus
      }
    });

  } catch (error) {
    Logger.error('Failed to unpublish property', {
      error: error.message,
      propertyId: req.params.propertyId,
      adminId: req.user?.id
    });
    next(error);
  }
};

export const getPropertyAnalytics = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      throw ApiError.badRequest('Property ID is required');
    }

    const analytics = await adminService.getPropertyAnalytics(propertyId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsersList = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, verified, search } = req.query;

    const users = await adminService.getUsersList(
      { role, verified, search },
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: users.docs,
      pagination: {
        total: users.totalDocs,
        page: users.page,
        pages: users.totalPages,
        hasNext: users.hasNextPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!userId || !status) {
      throw ApiError.badRequest('User ID and status are required');
    }

    const user = await adminService.updateUserStatus(userId, status);

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pending verifications
 */
export const getPendingVerifications = async (req, res, next) => {
  try {
    const { type = 'all', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { 'identityVerification.status': 'pending' };
    
    // Filter by user type if specified
    if (type !== 'all') {
      query.role = type; // 'student' or 'landlord'
    }

    const pendingVerifications = await User.find(query)
      .select('identityVerification role email createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        verifications: pendingVerifications,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed verification information for a specific user
 */
export const getVerificationDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('identityVerification studentVerification role email');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Review and update verification status
 */
export const reviewVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, reason, verificationType } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid status. Must be either approved or rejected');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Update verification status based on type
    switch (verificationType) {
      case 'identity':
        user.identityVerification.status = status;
        if (reason) user.identityVerification.rejectionReason = reason;
        break;
      
      case 'student':
        if (!user.studentVerification) {
          throw new ApiError(400, 'No student verification found');
        }
        user.studentVerification.status = status;
        if (reason) user.studentVerification.rejectionReason = reason;
        break;
      
      case 'business':
        if (!user.businessVerification) {
          throw new ApiError(400, 'No business verification found');
        }
        user.businessVerification.status = status;
        if (reason) user.businessVerification.rejectionReason = reason;
        break;

      default:
        throw new ApiError(400, 'Invalid verification type');
    }

    // Add to verification history
    const historyEntry = {
      status,
      reason,
      verifiedBy: req.user.id,
      timestamp: new Date()
    };

    user[`${verificationType}Verification`].verificationHistory.push(historyEntry);

    // Send email notification
    try {
      await sendVerificationStatusEmail(user.email, {
        fullName: user.identityVerification.fullName,
        status,
        reason
      });
    } catch (emailError) {
      Logger.warn('Failed to send verification status email', { error: emailError.message });
    }

    
    res.json({
      success: true,
      message: `Verification ${status}`,
      data: {
        userId: user._id,
        status,
        verificationType,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pending student verifications
 */
export const getPendingStudentVerifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      role: 'student',
      'studentVerification.status': 'pending'
    };

    const pendingVerifications = await User.find(query)
      .select('studentVerification email fullName matricNumber university createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        verifications: pendingVerifications,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed student verification information
 */
export const getStudentVerificationDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('studentVerification email fullName role matricNumber university');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'student') {
      throw new ApiError(400, 'User is not a student');
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        fullName: user.fullName,
        studentVerification: {
          status: user.studentVerification?.status,
          matricNumber: user.studentVerification?.matricNumber,
          university: user.studentVerification?.university,
          documents: {
            studentId: user.studentVerification?.documents?.studentId,
            enrollmentProof: user.studentVerification?.documents?.enrollmentProof
          },
          verificationHistory: user.studentVerification?.verificationHistory || []
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Review and update student verification status
 */
export const reviewStudentVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    // Input validation
    if (!userId || !status) {
      throw new ApiError(400, 'User ID and status are required');
    }

    const statusMap = {
      'approved': 'verified',
      'rejected': 'rejected'
    };

    if (!statusMap[status]) {
      throw new ApiError(400, 'Invalid status. Must be either "approved" or "rejected"');
    }

    // Find user with all verification fields
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Role and verification checks
    if (user.role !== 'student') {
      throw new ApiError(400, 'User is not a student');
    }

    if (!user.studentVerification) {
      throw new ApiError(400, 'No student verification request found');
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update student verification status
      user.studentVerification.status = statusMap[status];
      user.studentVerification.reviewedAt = new Date();
      user.studentVerification.reviewedBy = req.user.id;

      if (reason) {
        user.studentVerification.reason = reason;
      }

      // Add to verification history
      if (!user.studentVerification.verificationHistory) {
        user.studentVerification.verificationHistory = [];
      }

      user.studentVerification.verificationHistory.push({
        status: statusMap[status],
        reason,
        verifiedBy: req.user.id,
        timestamp: new Date()
      });

      if (status === 'approved') {
        // Update student documents verification
        if (user.studentVerification.documents?.studentId) {
          user.studentVerification.documents.studentId.verified = true;
        }
        if (user.studentVerification.documents?.enrollmentProof) {
          user.studentVerification.documents.enrollmentProof.verified = true;
        }

        // Update main user verification status
        user.isVerified = true;
        
        // Update identity verification status if not already verified
        if (user.identityVerification.status !== 'verified') {
          user.identityVerification.status = 'verified';
          user.identityVerification.verifiedAt = new Date();
          user.identityVerification.verifiedBy = req.user.id;
        }

        // If there are any government IDs, mark them as verified
        if (user.identityVerification.governmentId) {
          user.identityVerification.governmentId.verificationStatus = 'verified';
          user.identityVerification.governmentId.verifiedAt = new Date();
          user.identityVerification.governmentId.verifiedBy = req.user.id;
        }

        // Update account status if needed
        if (user.accountStatus !== 'active') {
          user.accountStatus = 'active';
        }
      }

      await user.save({ session });
      await session.commitTransaction();

      // Send email notification (non-blocking)
      sendVerificationStatusEmail(user.email, {
        fullName: user.fullName || user.username,
        status: statusMap[status],
        reason,
        type: 'student'
      }).catch(emailError => {
        Logger.warn('Failed to send verification status email', { error: emailError.message });
      });

      Logger.info('Student verification reviewed', {
        adminId: req.user.id,
        userId: user._id,
        status: statusMap[status],
        reason
      });

      res.json({
        success: true,
        message: `Student verification ${status} successfully`,
        data: {
          userId: user._id,
          status: statusMap[status],
          isVerified: user.isVerified,
          identityStatus: user.identityVerification.status,
          studentStatus: user.studentVerification.status,
          accountStatus: user.accountStatus,
          reviewedAt: user.studentVerification.reviewedAt,
          reviewedBy: user.studentVerification.reviewedBy
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    Logger.error('Student verification review failed', {
      error: error.message,
      userId: req.params.userId,
      adminId: req.user?.id
    });
    next(error);
  }
};

export const getAllCommunitiesAdmin = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      showDeleted = false // New parameter to control visibility of deleted communities
    } = req.query;

    // Build base query
    const query = {
      type: 'community',
      isActive: showDeleted === 'true' ? { $in: [true, false] } : true,
      status: status || { $ne: 'deleted' } // Only show non-deleted communities by default
    };

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const communities = await Chat.paginate(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        {
          path: 'members.userId',
          select: 'username email avatar lastSeen'
        },
        {
          path: 'createdBy',
          select: 'username email role'
        }
      ],
      select: '-__v'
    });

    // Add additional statistics for each community
    const communitiesWithStats = await Promise.all(
      communities.docs.map(async (community) => {
        const messageCount = await Message.countDocuments({ roomId: community._id });
        const activeMembers = community.members.filter(m => 
          m.lastSeen && 
          (new Date() - m.lastSeen) < 24 * 60 * 60 * 1000
        ).length;

        return {
          ...community.toObject(),
          stats: {
            totalMessages: messageCount,
            totalMembers: community.members.length,
            activeMembers,
            adminCount: community.members.filter(m => m.role === 'admin').length,
            moderatorCount: community.members.filter(m => m.role === 'moderator').length,
            averageMessagesPerDay: messageCount / Math.max(1, Math.ceil((new Date() - community.createdAt) / (24 * 60 * 60 * 1000))),
            ageInDays: Math.ceil((new Date() - community.createdAt) / (24 * 60 * 60 * 1000))
          }
        };
      })
    );

    // Get overall statistics
    const [totalCommunities, totalMessages] = await Promise.all([
      Chat.countDocuments({ type: 'community' }),
      Message.countDocuments({ 
        roomId: { $in: communities.docs.map(c => c._id) }
      })
    ]);

    Logger.info('Admin communities list retrieved', {
      adminId: req.user.id,
      count: communities.totalDocs
    });

    res.json({
      success: true,
      data: communitiesWithStats,
      pagination: {
        total: communities.totalDocs,
        page: communities.page,
        pages: communities.totalPages,
        hasNext: communities.hasNextPage
      },
      summary: {
        totalCommunities,
        totalMessages,
        averageMessagesPerCommunity: totalCommunities > 0 ? Math.round(totalMessages / totalCommunities) : 0,
        activeCommunities: communitiesWithStats.filter(c => c.stats.activeMembers > 0).length,
        filterStatus: {
          showingDeleted: showDeleted === 'true',
          status: status || 'active'
        }
      }
    });
  } catch (error) {
    Logger.error('Failed to retrieve admin communities list', { 
      error: error.message,
      adminId: req.user?.id
    });
    next(error);
  }
};

export const deleteCommunityAdmin = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const adminId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      throw new ApiError(400, 'Invalid community ID');
    }

    // Find the community
    const community = await Chat.findOne({ 
      _id: communityId,
      type: 'community'
    });

    if (!community) {
      throw new ApiError(404, 'Community not found');
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Soft delete the community
      await Chat.findByIdAndUpdate(
        communityId,
        {
          isActive: false,
          status: 'deleted',
          'metadata.deletedAt': new Date(),
          'metadata.deletedBy': adminId,
          'metadata.lastUpdated': new Date()
        },
        { session }
      );

      // Log deletion
      Logger.info('Community deleted by admin', {
        communityId,
        adminId,
        name: community.name,
        memberCount: community.members.length
      });

      // Notify members if needed
      const memberIds = community.members.map(m => m.userId);
      if (memberIds.length > 0) {
        // You can implement notification logic here
        // await notificationService.notifyMembers(memberIds, 'community_deleted', { communityName: community.name });
      }

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'Community deleted successfully',
        data: {
          communityId,
          deletedAt: new Date(),
          membersAffected: memberIds.length
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    Logger.error('Failed to delete community', {
      error: error.message,
      communityId: req.params.communityId,
      adminId: req.user?.id
    });
    next(error);
  }
};