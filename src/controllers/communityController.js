import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import { Chat } from '../models/Chat.js';
import { JoinRequest } from '../models/JoinRequest.js';
import * as communityService from '../services/communityService.js';
import { uploadToS3 } from '../utils/s3Service.js';
import { initializeCommunityChannel } from '../services/streamCommunityService.js';

export const createCommunityRoom = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id; // Get user ID from authenticated request
    let avatar = null;

    // Validate required fields
    if (!name || !description) {
      throw new ApiError(400, 'Name and description are required');
    }

    // Double-check admin status
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only administrators can create community rooms');
    }

    // Validate community name uniqueness
    const existingCommunity = await Chat.findOne({
      type: 'community',
      name: name,
      isActive: true
    });

    if (existingCommunity) {
      throw new ApiError(400, 'A community with this name already exists');
    }

    // Handle avatar upload if file is present
    if (req.file) {
      avatar = await uploadToS3(req.file);
    }

    const room = await communityService.createCommunity(userId, {
      name,
      description,
      avatar
    });

    // Initialize Stream Chat community channel
    const streamChannel = await initializeCommunityChannel(room, {
      _id: userId,
      role: req.user.role
    });

    // Add Stream Chat channel info to response
    const response = {
      success: true,
      message: 'Community room created successfully',
      data: {
        ...room.toObject(),
        streamChat: {
          channelId: streamChannel.channelId,
          channelType: 'community'
        }
      }
    };

    Logger.info('Community room and chat channel created', {
      communityId: room._id,
      adminId: userId,
      name: room.name,
      streamChannelId: streamChannel.channelId
    });

    res.status(201).json(response);
  } catch (error) {
    Logger.error('Failed to create community room', {
      error: error.message,
      adminId: req.user?.id,
      requestData: {
        name: req.body?.name,
        hasAvatar: !!req.file
      }
    });
    next(error);
  }
};

export const getCommunityDetails = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const community = await communityService.getCommunityDetails(communityId);

    res.json({
      success: true,
      data: {
        _id: community._id,
        name: community.name,
        description: community.description,
        avatar: community.avatar,
        type: community.type,
        status: community.status,
        members: community.members.map(member => ({
          userId: member.userId._id,
          username: member.userId.username,
          avatar: member.userId.avatar,
          role: member.role,
          joinedAt: member.joinedAt
        })),
        metadata: community.metadata,
        createdAt: community.createdAt,
        streamChannel: community.streamChannel || {
          channelId: `community_${community._id}`,
          channelType: 'messaging'
        }
      }
    });
  } catch (error) {
    Logger.error('Failed to get community details', {
      error: error.message,
      communityId: req.params.communityId
    });
    next(error);
  }
};

export const updateCommunity = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { name, description, avatar } = req.body;

    const community = await communityService.updateCommunity(
      communityId,
      req.user.id,
      { name, description, avatar }
    );

    res.json({
      success: true,
      message: 'Community updated successfully',
      data: community
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCommunity = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    await communityService.deleteCommunity(communityId, req.user.id);

    res.json({
      success: true,
      message: 'Community deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const addMembers = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { memberIds } = req.body;

    const community = await communityService.addMembers(
      communityId,
      req.user.id,
      memberIds
    );

    res.json({
      success: true,
      message: 'Members added successfully',
      data: community
    });
  } catch (error) {
    next(error);
  }
};

export const removeMembers = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { memberIds } = req.body;

    const community = await communityService.removeMembers(
      communityId,
      req.user.id,
      memberIds
    );

    res.json({
      success: true,
      message: 'Members removed successfully',
      data: community
    });
  } catch (error) {
    next(error);
  }
};

export const promoteToModerator = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { memberIds } = req.body;

    const community = await communityService.promoteToModerator(
      communityId,
      req.user.id,
      memberIds
    );

    res.json({
      success: true,
      message: 'Members promoted to moderator successfully',
      data: community
    });
  } catch (error) {
    next(error);
  }
};

export const getCommunityMembers = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { page, limit } = req.query;

    const members = await communityService.getCommunityMembers(
      communityId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: members.docs,
      pagination: {
        total: members.totalDocs,
        page: members.page,
        pages: members.totalPages,
        hasNext: members.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCommunityActivities = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { page, limit } = req.query;

    const activities = await communityService.getCommunityActivities(
      communityId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: activities.docs,
      pagination: {
        total: activities.totalDocs,
        page: activities.page,
        pages: activities.totalPages,
        hasNext: activities.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCommunities = async (req, res, next) => {
  try {
    const communities = await communityService.getAllCommunities(req.query);

    res.json({
      success: true,
      data: communities.docs,
      pagination: {
        total: communities.totalDocs,
        page: communities.page,
        pages: communities.totalPages,
        hasNext: communities.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTrendingCommunities = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const communities = await communityService.getTrendingCommunities(limit);

    res.json({
      success: true,
      data: communities
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendedCommunities = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const communities = await communityService.getRecommendedCommunities(req.user.id, limit);

    res.json({
      success: true,
      data: communities
    });
  } catch (error) {
    next(error);
  }
};

export const getUserCommunities = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const communities = await communityService.getUserCommunities(req.user.id, page, limit);

    res.json({
      success: true,
      data: communities.docs,
      pagination: {
        total: communities.totalDocs,
        page: communities.page,
        pages: communities.totalPages,
        hasNext: communities.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCommunityStats = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const stats = await communityService.getCommunityStats(communityId, req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const requestToJoin = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { message } = req.body;

    const result = await communityService.requestToJoin(communityId, req.user.id, message);

    let response = {
      success: true,
      data: {
        requestId: result.requestId,
        communityId: result.communityId,
        status: result.status,
        timestamp: result.joinedAt || result.createdAt
      }
    };

    if (result.alreadyMember) {
      response.message = 'You are already a member of this community';
      response.data.isMember = true;
      response.data.joinedAt = result.joinedAt;
    } else if (result.alreadyRequested) {
      response.message = 'You already have a join request';
      response.data.isExistingRequest = true;
      response.data.createdAt = result.createdAt;
    } else {
      response.message = 'Join request sent successfully';
      response.data.isNew = true;
      response.data.createdAt = result.createdAt;
    }

    Logger.info('Community join request processed', {
      userId: req.user.id,
      communityId,
      status: result.status,
      requestId: result.requestId
    });

    res.status(result.isNew ? 201 : 200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getPendingJoinRequests = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { page, limit } = req.query;

    const requests = await communityService.getPendingJoinRequests(communityId, req.user.id, page, limit);

    res.json({
      success: true,
      data: requests.docs,
      pagination: {
        total: requests.totalDocs,
        page: requests.page,
        pages: requests.totalPages,
        hasNext: requests.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const handleJoinRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const result = await communityService.handleJoinRequest(requestId, req.user.id, status);

    const response = {
      success: true,
      message: status === 'accepted' ?
        'Member successfully added to community' :
        'Join request rejected',
      data: {
        community: {
          id: result.community._id,
          name: result.community.name,
          memberCount: result.community.members.length
        },
        request: {
          id: result.joinRequest._id,
          status: result.joinRequest.status,
          reviewedAt: result.joinRequest.reviewedAt
        }
      }
    };

    Logger.info(`Community join request ${status}`, {
      communityId: result.community._id,
      userId: result.joinRequest.userId,
      requestId
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getPublicCommunities = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      sort = 'popular' // 'popular', 'recent', 'alphabetical'
    } = req.query;

    const communities = await communityService.getPublicCommunities({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category,
      sort
    });

    res.json({
      success: true,
      data: communities.docs.map(community => ({
        id: community._id,
        name: community.name,
        description: community.description,
        avatar: community.avatar,
        memberCount: community.members.length,
        category: community.category,
        createdBy: {
          id: community.createdBy?._id,
          username: community.createdBy?.username,
          avatar: community.createdBy?.avatar
        },
        createdAt: community.createdAt,
        lastActivity: community.updatedAt,
        visibility: community.visibility
      })),
      pagination: {
        total: communities.totalDocs,
        page: communities.page,
        pages: communities.totalPages,
        hasNext: communities.hasNextPage
      }
    });
  } catch (error) {
    Logger.error('Failed to get public communities', {
      error: error.message,
      query: req.query
    });
    next(error);
  }
};

export const getUserMemberships = async (req, res, next) => {
  try {
    Logger.info('Getting user memberships', {
      userId: req.user.id,
      query: req.query
    });

    const {
      page = 1,
      limit = 20,
      status = 'active',
      sort = 'recent'
    } = req.query;

    const memberships = await communityService.getUserMemberships(
      req.user.id,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sort
      }
    );

    res.json({
      success: true,
      data: memberships.docs,
      pagination: {
        total: memberships.totalDocs,
        page: memberships.page,
        pages: memberships.totalPages,
        hasNext: memberships.hasNextPage,
        hasPrev: memberships.hasPrevPage,
        limit: memberships.limit
      }
    });

  } catch (error) {
    Logger.error('Failed to get user memberships', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

export const getAllJoinRequests = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sort = 'recent',
      communityId,
      startDate,
      endDate
    } = req.query;

    const requests = await communityService.getAllJoinRequests({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      sort,
      communityId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: requests.docs,
      pagination: {
        total: requests.totalDocs,
        page: requests.page,
        pages: requests.totalPages,
        hasNext: requests.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const requests = await communityService.getPendingRequests(
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: requests.docs,
      pagination: {
        total: requests.totalDocs,
        page: requests.page,
        pages: requests.totalPages,
        hasNext: requests.hasNextPage
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getJoinRequestStats = async (req, res, next) => {
  try {
    const stats = await communityService.getJoinRequestStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const cancelJoinRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    await communityService.cancelJoinRequest(requestId, req.user.id);

    Logger.info('Join request cancelled', {
      requestId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Join request cancelled successfully'
    });
  } catch (error) {
    Logger.error('Failed to cancel join request', {
      error: error.message,
      requestId: req.params.requestId,
      userId: req.user?.id
    });
    next(error);
  }
};

export const getMyActiveCommunities = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const communities = await communityService.getUserActiveCommunities(
      req.user.id,
      page,
      limit
    );

    res.json({
      success: true,
      data: communities.docs,
      pagination: {
        total: communities.totalDocs,
        page: communities.page,
        pages: communities.totalPages,
        hasNext: communities.hasNextPage,
        hasPrev: communities.hasPrevPage
      }
    });
  } catch (error) {
    Logger.error('Failed to get user communities', {
      error: error.message,
      userId: req.user?.id
    });
    next(error);
  }
};

export const getMyPendingRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const requests = await communityService.getUserPendingRequests(
      req.user.id,
      page,
      limit
    );

    res.json({
      success: true,
      data: requests.docs,
      pagination: {
        total: requests.totalDocs,
        page: requests.page,
        pages: requests.totalPages,
        hasNext: requests.hasNextPage,
        hasPrev: requests.hasPrevPage
      }
    });
  } catch (error) {
    Logger.error('Failed to get pending requests', {
      error: error.message,
      userId: req.user?.id
    });
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    // Handle form data fields
    const eventData = {
      name: req.body.name,
      description: req.body.description,
      date: new Date(req.body.date),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      location: req.body.location,
      maxParticipants: parseInt(req.body.maxParticipants) || undefined,
      metadata: {
        category: req.body.category,
        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
        isPrivate: req.body.isPrivate === 'true',
        requiresApproval: req.body.requiresApproval === 'true'
      }
    };

    // Validate required fields
    if (!eventData.name || !eventData.description || !eventData.date || !eventData.location) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Handle image upload if present
    let image = null;
    if (req.file) {
      image = await uploadToS3(req.file);
      eventData.image = {
        url: image.url,
        key: image.key
      };
    }

    const event = await communityService.createEvent(communityId, req.user.id, eventData);

    Logger.info('Community event created', {
      eventId: event._id,
      communityId,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Event created and pending approval',
      data: event
    });
  } catch (error) {
    Logger.error('Failed to create community event', {
      error: error.message,
      communityId: req.params.communityId,
      userId: req.user?.id
    });
    next(error);
  }
};

export const reviewEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { status, note } = req.body;

    const event = await communityService.reviewEvent(
      eventId,
      req.user.id,
      status,
      note
    );

    res.json({
      success: true,
      message: `Event ${status}`,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

export const joinEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    const event = await communityService.joinEvent(
      eventId,
      req.user.id,
      status
    );

    res.json({
      success: true,
      message: 'Successfully joined event',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

export const getCommunityEvents = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const events = await communityService.getCommunityEvents(
      communityId,
      req.user.id
    );

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingEvents = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const events = await communityService.getPendingEvents(
      communityId,
      req.user.id
    );

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

export const listCommunityEvents = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const {
      status = 'approved',
      page = 1,
      limit = 10,
      sortBy = 'date',
      past = 'false'
    } = req.query;

    const events = await CommunityEvent.paginate(
      {
        communityId,
        status: status,
        date: past === 'true' ?
          { $lt: new Date() } : // Past events
          { $gte: new Date() }  // Upcoming events
      },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: 1 },
        populate: [
          { path: 'createdBy', select: 'username avatar' },
          { path: 'participants.userId', select: 'username avatar' }
        ]
      }
    );

    res.json({
      success: true,
      data: events.docs,
      pagination: {
        total: events.totalDocs,
        page: events.page,
        pages: events.totalPages,
        hasNext: events.hasNextPage,
        hasPrev: events.hasPrevPage
      },
      filters: {
        showingPastEvents: past === 'true',
        status,
        sortBy
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getEventDetails = async (req, res, next) => {
  try {
    const { communityId, eventId } = req.params;

    const event = await CommunityEvent.findOne({
      _id: eventId,
      communityId
    }).populate([
      { path: 'createdBy', select: 'username avatar' },
      { path: 'participants.userId', select: 'username avatar' },
      { path: 'reviewedBy', select: 'username' }
    ]);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // Check if user is participant
    const isParticipant = event.participants.some(
      p => p.userId._id.toString() === req.user.id
    );

    res.json({
      success: true,
      data: {
        ...event.toObject(),
        isParticipant,
        userStatus: isParticipant ?
          event.participants.find(p => p.userId._id.toString() === req.user.id).status
          : null
      }
    });

  } catch (error) {
    next(error);
  }
};