import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { ApiError } from '../utils/ApiError.js';
import { JoinRequest } from '../models/JoinRequest.js';
import { CommunityEvent } from '../models/CommunityEvent.js';
import mongoose from 'mongoose';
import { Logger } from '../utils/logger.js';
import { addMemberToCommunityChannel, initializeCommunityChannel } from './streamCommunityService.js';
import { StreamChat } from 'stream-chat';

export const createCommunity = async (userId, data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    // Create community with all required fields
    const community = await Chat.create([{
      type: 'community',
      name: data.name,
      description: data.description,
      avatar: data.avatar,
      members: [{
        userId,
        role: 'admin',
        joinedAt: new Date()
      }],
      createdBy: userId, // Explicitly set createdBy
      initiator: userId, // Explicitly set initiator
      status: 'active',
      metadata: {
        memberCount: 1,
        lastActivity: new Date(),
        createdByAdmin: true,
        adminId: userId,
        createdAt: new Date()
      }
    }], { session });

    // Initialize Stream Chat channel
    try {
      const streamChannel = await initializeCommunityChannel(community[0], {
        _id: userId,
        role: 'admin'
      });

      Logger.info('Stream Chat community channel created', {
        communityId: community[0]._id,
        streamChannelId: streamChannel.channelId
      });
    } catch (streamError) {
      Logger.error('Failed to create Stream Chat channel', {
        error: streamError.message,
        communityId: community[0]._id
      });
      throw new ApiError(500, 'Failed to initialize community chat');
    }

    await session.commitTransaction();

    Logger.info('Community created successfully', {
      communityId: community[0]._id,
      createdBy: userId
    });


    return community[0];
  } catch (error) {
    await session.abortTransaction();
    Logger.error('Failed to create community', {
      error: error.message,
      userId,
      name: data.name
    });
    throw new ApiError(500, 'Failed to create community: ' + error.message);
  } finally {
    session.endSession();
  }
};

export const getCommunityDetails = async (communityId) => {
  try {
    const community = await Chat.findOne({
      _id: communityId,
      type: 'community',
      isActive: true
    }).populate('members.userId', 'username avatar email');

    if (!community) {
      throw new ApiError(404, 'Community not found');
    }

    // Get Stream Chat channel details
    const channelId = `community_${community._id}`;
    let streamChannelData = null;

    try {
      const channel = streamClient.channel('messaging', channelId);
      const { channel: channelData } = await channel.query({
        state: true,
        messages: { limit: 1 }
      });

      streamChannelData = {
        channelId,
        channelType: 'messaging',
        memberCount: channelData.member_count || 0,
        lastMessageAt: channelData.last_message_at,
        custom: channelData.custom || {}
      };

      Logger.info('Stream channel data fetched', {
        communityId,
        channelId
      });
    } catch (streamError) {
      Logger.error('Failed to fetch Stream channel data', {
        error: streamError.message,
        communityId,
        channelId
      });
    }

    // Return community data with Stream Chat info
    return {
      ...community.toObject(),
      streamChannel: streamChannelData
    };

  } catch (error) {
    Logger.error('Failed to get community details', {
      error: error.message,
      communityId
    });
    throw error;
  }
};

export const updateCommunity = async (communityId, userId, updates) => {
  const community = await Chat.findOne({
    _id: communityId,
    type: 'community',
    isActive: true
  });

  if (!community) {
    throw new ApiError(404, 'Community not found');
  }

  const userMember = community.members.find(m =>
    m.userId.toString() === userId &&
    ['admin', 'moderator'].includes(m.role)
  );

  if (!userMember) {
    throw new ApiError(403, 'Only admins and moderators can update community');
  }

  Object.assign(community, updates);
  await community.save();

  return community;
};

export const deleteCommunity = async (communityId, userId) => {
  const community = await Chat.findOne({
    _id: communityId,
    type: 'community'
  });

  if (!community) {
    throw new ApiError(404, 'Community not found');
  }

  // Check if user is admin
  const member = community.members.find(m => m.userId.toString() === userId);
  if (!member || member.role !== 'admin') {
    throw new ApiError(403, 'Only admins can delete community');
  }

  community.isActive = false;
  await community.save();
};

export const addMemberToCommunity = async (roomId, userId, memberIds) => {
  const room = await Chat.findById(roomId);
  if (!room) {
    throw new ApiError(404, 'Chat room not found');
  }

  // Check if user is admin
  const member = room.members.find(m => m.userId.toString() === userId);
  if (!member || member.role !== 'admin') {
    throw new ApiError(403, 'Only admins can add members');
  }

  // Filter out existing members
  const existingMemberIds = room.members.map(m => m.userId.toString());
  const newMemberIds = memberIds.filter(id => !existingMemberIds.includes(id));

  if (newMemberIds.length === 0) {
    throw new ApiError(400, 'All users are already members');
  }

  // Add new members
  const newMembers = newMemberIds.map(id => ({
    userId: id,
    role: 'member'
  }));

  room.members.push(...newMembers);
  room.metadata.memberCount = room.members.length;
  await room.save();

  return room;
};

export const addMembers = async (communityId, adminId, memberIds) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const community = await Chat.findOne({
      _id: communityId,
      type: 'community',
      isActive: true
    }).session(session);

    if (!community) {
      throw new ApiError(404, 'Community not found');
    }

    const adminMember = community.members.find(m =>
      m.userId.toString() === adminId &&
      ['admin', 'moderator'].includes(m.role)
    );

    if (!adminMember) {
      throw new ApiError(403, 'Only admins and moderators can add members');
    }

    const existingMembers = community.members.map(m => m.userId.toString());
    const newMemberIds = memberIds.filter(id => !existingMembers.includes(id.toString()));

    if (newMemberIds.length === 0) {
      throw new ApiError(400, 'All users are already members');
    }

    const newMembers = newMemberIds.map(userId => ({
      userId,
      role: 'member',
      joinedAt: new Date()
    }));

    community.members.push(...newMembers);
    community.metadata.memberCount = community.members.length;
    community.metadata.lastActivity = new Date();

    await community.save({ session });
    await session.commitTransaction();

    return community;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const removeMembers = async (communityId, userId, memberIds) => {
  const community = await Chat.findOne({
    _id: communityId,
    type: 'community'
  });

  if (!community) {
    throw new ApiError(404, 'Community not found');
  }

  // Check if user is admin or moderator
  const member = community.members.find(m => m.userId.toString() === userId);
  if (!member || !['admin', 'moderator'].includes(member.role)) {
    throw new ApiError(403, 'Only admins and moderators can remove members');
  }

  // Cannot remove admins
  const membersToRemove = community.members.filter(m =>
    memberIds.includes(m.userId.toString()) && m.role !== 'admin'
  );

  if (membersToRemove.length === 0) {
    throw new ApiError(400, 'No valid members to remove');
  }

  community.members = community.members.filter(m =>
    !memberIds.includes(m.userId.toString()) || m.role === 'admin'
  );

  community.metadata.memberCount = community.members.length;
  await community.save();

  return community;
};

export const promoteToModerator = async (communityId, userId, memberIds) => {
  const community = await Chat.findOne({
    _id: communityId,
    type: 'community'
  });

  if (!community) {
    throw new ApiError(404, 'Community not found');
  }

  // Check if user is admin
  const member = community.members.find(m => m.userId.toString() === userId);
  if (!member || member.role !== 'admin') {
    throw new ApiError(403, 'Only admins can promote members');
  }

  // Update roles
  community.members.forEach(m => {
    if (memberIds.includes(m.userId.toString()) && m.role === 'member') {
      m.role = 'moderator';
    }
  });

  await community.save();
  return community;
};

export const getCommunityMembers = async (communityId, page = 1, limit = 20) => {
  const community = await Chat.findOne({
    _id: communityId,
    type: 'community'
  });

  if (!community) {
    throw new ApiError(404, 'Community not found');
  }

  const memberIds = community.members.map(m => m.userId);

  const members = await User.paginate(
    { _id: { $in: memberIds } },
    {
      page,
      limit,
      select: 'username email'
    }
  );

  return members;
};

export const getCommunityActivities = async (communityId, page = 1, limit = 20) => {
  const community = await Chat.findOne({
    _id: communityId,
    type: 'community'
  });

  if (!community) {
    throw new ApiError(404, 'Community not found');
  }

  const activities = await Message.paginate(
    { roomId: communityId },
    {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        {
          path: 'sender',
          select: 'username email'
        }
      ]
    }
  );

  return activities;
};

export const getAllCommunities = async (query = {}) => {
  const { page = 1, limit = 20, search } = query;

  const filter = {
    type: 'community',
    isActive: true, // Only show active communities
    status: { $ne: 'deleted' } // Exclude deleted communities
  };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  return await Chat.paginate(filter, {
    page,
    limit,
    sort: { 'metadata.memberCount': -1 },
    populate: {
      path: 'members.userId',
      select: 'username avatar'
    }
  });
};

export const getTrendingCommunities = async (limit = 5) => {
  return await Chat.find({
    type: 'community',
    isActive: true
  })
    .sort({ 'metadata.messageCount': -1, 'metadata.memberCount': -1 })
    .limit(parseInt(limit))
    .populate('members.userId', 'username avatar');
};

export const getRecommendedCommunities = async (userId, limit = 10) => {
  // Get user's current communities
  const userCommunities = await Chat.find({
    type: 'community',
    'members.userId': userId,
    'members.isActive': true
  });

  // Get active communities user is not part of
  return await Chat.find({
    type: 'community',
    isActive: true,
    'members.userId': { $ne: userId },
    _id: { $nin: userCommunities.map(c => c._id) }
  })
    .sort({ 'metadata.memberCount': -1, 'metadata.messageCount': -1 })
    .limit(parseInt(limit))
    .populate([
      {
        path: 'members.userId',
        select: 'username'
      },
      {
        path: 'lastMessage.sender',
        select: 'username'
      }
    ])
    .select('-members.lastSeen');
};

export const getUserCommunities = async (userId, page = 1, limit = 20) => {
  return await Chat.paginate(
    {
      type: 'community',
      'members.userId': userId,
      'members.isActive': true
    },
    {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { 'metadata.lastActivityAt': -1 },
      populate: [
        {
          path: 'members.userId',
          select: 'username'
        },
        {
          path: 'lastMessage.sender',
          select: 'username'
        }
      ],
      select: '-members.lastSeen'
    }
  );
};

export const getCommunityStats = async (communityId, userId) => {
  const community = await Chat.findOne({
    _id: communityId,
    type: 'community',
    'members.userId': userId,
    'members.isActive': true
  });

  if (!community) {
    throw new ApiError(404, 'Community not found or you are not a member');
  }

  // Calculate online members
  const onlineMembers = community.onlineMembersCount;

  // Get role distribution
  const roleDistribution = community.members.reduce((acc, member) => {
    if (member.isActive) {
      acc[member.role] = (acc[member.role] || 0) + 1;
    }
    return acc;
  }, {});

  // Get pending join requests count
  const pendingRequests = await JoinRequest.countDocuments({
    communityId,
    status: 'pending'
  });

  return {
    totalMembers: community.metadata.memberCount,
    onlineMembers,
    messageCount: community.metadata.messageCount,
    roleDistribution,
    pendingRequests,
    lastActivity: community.metadata.lastActivityAt
  };
};

export const requestToJoin = async (communityId, userId, message) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if community exists
    const community = await Chat.findOne({
      _id: communityId,
      type: 'community',
      isActive: true
    });

    if (!community) {
      throw new ApiError(404, 'Community not found');
    }

    // Check if user is already a member
    const isMember = community.members.some(m => m.userId.toString() === userId);

    // Find any existing request (regardless of status)
    const existingRequest = await JoinRequest.findOne({
      communityId,
      userId
    });

    if (isMember) {
      return {
        alreadyMember: true,
        requestId: existingRequest?._id || null,
        communityId,
        status: 'member',
        joinedAt: community.members.find(m => m.userId.toString() === userId)?.joinedAt
      };
    }

    // If there's an existing pending request, return it
    if (existingRequest) {
      return {
        alreadyRequested: true,
        requestId: existingRequest._id,
        status: existingRequest.status,
        communityId,
        createdAt: existingRequest.createdAt
      };
    }

    // Create new join request
    const joinRequest = await JoinRequest.create([{
      communityId,
      userId,
      message,
      status: 'pending'
    }], { session });

    await session.commitTransaction();
    return {
      requestId: joinRequest[0]._id,
      status: 'pending',
      communityId,
      isNew: true,
      createdAt: joinRequest[0].createdAt
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const handleJoinRequest = async (requestId, adminId, status, note) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate status
    if (!['accepted', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid status. Must be accepted or rejected');
    }

    // Find join request and populate related data
    const joinRequest = await JoinRequest.findById(requestId)
      .session(session);

    if (!joinRequest) {
      throw new ApiError(404, 'Join request not found');
    }

    if (joinRequest.status !== 'pending') {
      throw new ApiError(400, 'This request has already been handled');
    }

    // Find the community separately to ensure we have full access
    const community = await Chat.findById(joinRequest.communityId)
      .session(session);

    if (!community) {
      throw new ApiError(404, 'Community not found');
    }

    // Update join request status
    joinRequest.status = status;
    joinRequest.reviewedBy = adminId;
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewNote = note;

    if (status === 'accepted') {
      // Check if user is already a member
      const isAlreadyMember = community.members.some(
        m => m.userId.toString() === joinRequest.userId.toString()
      );

      if (!isAlreadyMember) {
        // Add user to community members
        community.members.push({
          userId: joinRequest.userId,
          role: 'member',
          joinedAt: new Date()
        });

        community.metadata.memberCount = community.members.length;

        try {
          // First check if channel exists, if not create it
          const channelId = `community_${community._id}`;
          let streamChannel;

          try {
            const channel = streamClient.channel('messaging', channelId);
            await channel.query();
            streamChannel = channel;
          } catch (error) {
            // If channel doesn't exist, create it
            streamChannel = await initializeCommunityChannel(community, {
              _id: adminId,
              role: 'admin'
            });
          }

          // Add member to Stream Chat
          await addMemberToCommunityChannel(
            channelId,
            joinRequest.userId,
            'member'
          );

        } catch (streamError) {
          Logger.error('Failed to add member to Stream Chat', {
            error: streamError.message,
            channelId: `community_${community._id}`,
            userId: joinRequest.userId
          });
          throw new ApiError(500, 'Failed to add member to chat system');
        }

        await community.save({ session });
      }
    }

    await joinRequest.save({ session });
    await session.commitTransaction();

    // Return processed data with populated fields
    return {
      joinRequest: await JoinRequest.findById(joinRequest._id)
        .populate('userId', 'username email avatar')
        .populate('reviewedBy', 'username'),
      community: await Chat.findById(community._id)
        .populate('members.userId', 'username email avatar')
    };

  } catch (error) {
    await session.abortTransaction();
    Logger.error('Failed to handle join request', {
      error: error.message,
      requestId,
      adminId,
      status
    });
    throw error;
  } finally {
    session.endSession();
  }
};

export const cancelJoinRequest = async (requestId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const joinRequest = await JoinRequest.findOne({
      _id: requestId,
      userId,
      status: 'pending'
    });

    if (!joinRequest) {
      throw new ApiError(404, 'Join request not found or already processed');
    }

    await JoinRequest.deleteOne({ _id: requestId }, { session });

    await session.commitTransaction();

    Logger.info('Join request cancelled successfully', {
      requestId,
      userId,
      communityId: joinRequest.communityId
    });
  } catch (error) {
    await session.abortTransaction();
    Logger.error('Failed to cancel join request', {
      error: error.message,
      requestId,
      userId
    });
    throw error instanceof ApiError ? error : new ApiError(500, error.message);
  } finally {
    session.endSession();
  }
};

export const getPendingJoinRequests = async (communityId, userId, page = 1, limit = 20) => {
  const community = await Chat.findOne({
    _id: communityId,
    type: 'community'
  });

  if (!community) {
    throw new ApiError(404, 'Community not found');
  }

  // Check if user is admin or moderator
  const member = community.members.find(m => m.userId.toString() === userId);
  if (!member || !['admin', 'moderator'].includes(member.role)) {
    throw new ApiError(403, 'Only admins and moderators can view join requests');
  }

  return await JoinRequest.paginate(
    {
      communityId,
      status: 'pending'
    },
    {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        {
          path: 'userId',
          select: 'username email'
        }
      ]
    }
  );
};

export const getPublicCommunities = async (options = {}) => {
  try {
    const query = {
      type: 'community',
      isActive: true,
      visibility: { $ne: 'private' } // Only show public and protected communities
    };

    // Add search functionality
    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: 'i' } },
        { description: { $regex: options.search, $options: 'i' } }
      ];
    }

    // Add category filter
    if (options.category) {
      query.category = options.category;
    }

    // Define sort options
    let sortOption = {};
    switch (options.sort) {
      case 'recent':
        sortOption = { createdAt: -1 };
        break;
      case 'alphabetical':
        sortOption = { name: 1 };
        break;
      case 'popular':
      default:
        sortOption = {
          'metadata.memberCount': -1,
          'metadata.activityCount': -1
        };
    }

    const communities = await Chat.paginate(
      query,
      {
        page: parseInt(options.page) || 1,
        limit: parseInt(options.limit) || 20,
        sort: sortOption,
        populate: [
          {
            path: 'createdBy',
            select: 'username avatar'
          },
          {
            path: 'members.userId',
            select: 'username avatar'
          }
        ],
        select: '-__v'
      }
    );

    return communities;
  } catch (error) {
    Logger.error('Failed to get public communities', { error: error.message });
    throw new ApiError(500, 'Failed to get public communities');
  }
};

export const getUserMemberships = async (userId, options = {}) => {
  try {
    Logger.info('Fetching user memberships', { userId, options });

    const {
      page = 1,
      limit = 20,
      status = 'active',
      sort = 'recent'
    } = options;

    // Convert userId to ObjectId
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

    if (!userObjectId) {
      throw new ApiError(400, 'Invalid user ID format');
    }

    // Build query
    const query = {
      type: 'community',
      isActive: true,
      'members.userId': userObjectId,
      'members.status': status
    };

    // Define sort options without using $ prefix
    const sortOptions = {
      recent: { createdAt: -1 },
      active: { 'metadata.lastActivity': -1 },
      name: { name: 1 }
    };

    // Get communities from MongoDB
    const communities = await Chat.paginate(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions[sort] || sortOptions.recent,
      populate: [
        { path: 'createdBy', select: 'username avatar' },
        { path: 'members.userId', select: 'username avatar' }
      ]
    });

    // Initialize Stream Chat client
    const streamClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY,
      process.env.STREAM_API_SECRET
    );

    // Get Stream Chat data for each community
    const communitiesWithStream = await Promise.all(
      communities.docs.map(async (community) => {
        try {
          const channelId = `community_${community._id}`;
          const channel = streamClient.channel('messaging', channelId);

          const { channel: channelData } = await channel.query({
            state: true,
            messages: { limit: 1 }
          });

          return {
            ...community.toObject(),
            stream: {
              channelId,
              memberCount: channelData.member_count || 0,
              lastMessageAt: channelData.last_message_at,
              type: 'messaging',
              custom: channelData.custom || {}
            }
          };
        } catch (error) {
          Logger.error('Failed to get Stream channel data', {
            communityId: community._id,
            error: error.message
          });

          // Return community without Stream data if there's an error
          return community.toObject();
        }
      })
    );

    return {
      docs: communitiesWithStream,
      totalDocs: communities.totalDocs,
      limit: communities.limit,
      page: communities.page,
      totalPages: communities.totalPages,
      hasNextPage: communities.hasNextPage,
      hasPrevPage: communities.hasPrevPage
    };

  } catch (error) {
    Logger.error('Failed to get user memberships', {
      error: error.message,
      userId
    });
    throw error instanceof ApiError ? error : new ApiError(500, error.message);
  }
};

export const getAllJoinRequests = async (options) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sort = 'recent',
      communityId,
      startDate,
      endDate
    } = options;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (communityId) query.communityId = new mongoose.Types.ObjectId(communityId);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Build sort options
    const sortOptions = {
      recent: { createdAt: -1 },
      status: { status: 1, createdAt: -1 },
      community: { communityId: 1, createdAt: -1 }
    };

    return await JoinRequest.paginate(query, {
      page,
      limit,
      sort: sortOptions[sort] || sortOptions.recent,
      populate: [
        { path: 'userId', select: 'username email avatar' },
        { path: 'communityId', select: 'name description' },
        { path: 'reviewedBy', select: 'username' }
      ]
    });
  } catch (error) {
    Logger.error('Failed to get join requests', { error: error.message });
    throw new ApiError(500, 'Failed to get join requests');
  }
};

export const getPendingRequests = async (page = 1, limit = 20) => {
  try {
    return await JoinRequest.paginate(
      { status: 'pending' },
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [
          { path: 'userId', select: 'username email avatar' },
          { path: 'communityId', select: 'name description' }
        ]
      }
    );
  } catch (error) {
    Logger.error('Failed to get pending requests', { error: error.message });
    throw new ApiError(500, 'Failed to get pending requests');
  }
};

export const getJoinRequestStats = async () => {
  try {
    const [statusStats, timeStats] = await Promise.all([
      // Get counts by status
      JoinRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // Get counts by time period
      JoinRequest.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    return {
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byMonth: timeStats,
      total: await JoinRequest.countDocuments()
    };
  } catch (error) {
    Logger.error('Failed to get join request stats', { error: error.message });
    throw new ApiError(500, 'Failed to get join request statistics');
  }
};

export const getUserActiveCommunities = async (userId, page = 1, limit = 20) => {
  try {
    const communities = await Chat.paginate(
      {
        type: 'community',
        'members.userId': userId,
        isActive: true
      },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { 'metadata.lastActivity': -1 },
        populate: [
          { path: 'members.userId', select: 'username avatar email' },
          { path: 'createdBy', select: 'username avatar' }
        ]
      }
    );

    return communities;
  } catch (error) {
    Logger.error('Failed to get user active communities', {
      error: error.message,
      userId
    });
    throw new ApiError(500, 'Failed to fetch user communities');
  }
};

export const getUserPendingRequests = async (userId, page = 1, limit = 20) => {
  try {
    const requests = await JoinRequest.paginate(
      {
        userId,
        status: 'pending'
      },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
          {
            path: 'communityId',
            select: 'name description avatar members metadata',
            populate: {
              path: 'members.userId',
              select: 'username avatar'
            }
          }
        ]
      }
    );

    return requests;
  } catch (error) {
    Logger.error('Failed to get user pending requests', {
      error: error.message,
      userId
    });
    throw new ApiError(500, 'Failed to fetch pending requests');
  }
};

export const createEvent = async (communityId, userId, eventData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if community exists and user is a member
    const community = await Chat.findOne({
      _id: communityId,
      'members.userId': userId,
      type: 'community'
    });

    if (!community) {
      throw new ApiError(404, 'Community not found or user is not a member');
    }

    // Create the event
    const event = await CommunityEvent.create([{
      ...eventData,
      communityId,
      createdBy: userId,
      participants: [{ userId, status: 'going' }] // Creator automatically joins
    }], { session });

    await session.commitTransaction();

    Logger.info('Community event created successfully', {
      eventId: event[0]._id,
      communityId,
      userId
    });

    return event[0];
  } catch (error) {
    await session.abortTransaction();
    Logger.error('Failed to create community event', {
      error: error.message,
      communityId,
      userId
    });
    throw error;
  } finally {
    session.endSession();
  }
};

export const reviewEvent = async (eventId, adminId, status, note) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const event = await CommunityEvent.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // Verify admin permission
    const community = await Chat.findOne({
      _id: event.communityId,
      'members.userId': adminId,
      'members.role': 'admin'
    });

    if (!community) {
      throw new ApiError(403, 'Only community admins can review events');
    }

    event.status = status;
    event.reviewedBy = adminId;
    event.reviewedAt = new Date();
    event.reviewNote = note;

    await event.save({ session });
    await session.commitTransaction();

    Logger.info('Event review completed', {
      eventId,
      adminId,
      status
    });

    return event;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const joinEvent = async (eventId, userId, status = 'going') => {
  try {
    const event = await CommunityEvent.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (event.status !== 'approved') {
      throw new ApiError(400, 'Cannot join an unapproved event');
    }

    // Check if max participants reached
    if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
      throw new ApiError(400, 'Event has reached maximum participants');
    }

    // Check if user is already a participant
    const existingParticipant = event.participants.find(
      p => p.userId.toString() === userId
    );

    if (existingParticipant) {
      existingParticipant.status = status;
    } else {
      event.participants.push({
        userId,
        status,
        joinedAt: new Date()
      });
    }

    await event.save();

    Logger.info('User joined event', {
      eventId,
      userId,
      status
    });

    return event;
  } catch (error) {
    Logger.error('Failed to join event', {
      error: error.message,
      eventId,
      userId
    });
    throw error;
  }
};

export const getCommunityEvents = async (communityId, userId, filter = {}) => {
  try {
    // Check community membership
    const community = await Chat.findOne({
      _id: communityId,
      'members.userId': userId,
      type: 'community'
    });

    if (!community) {
      throw new ApiError(404, 'Community not found or user is not a member');
    }

    // Build query
    const query = { communityId };

    // Regular members can only see approved events
    const member = community.members.find(m => m.userId.toString() === userId);
    if (member.role !== 'admin') {
      query.status = 'approved';
    }

    return await CommunityEvent.find(query)
      .populate('createdBy', 'username avatar')
      .populate('participants.userId', 'username avatar')
      .sort({ date: 1 });
  } catch (error) {
    Logger.error('Failed to get community events', {
      error: error.message,
      communityId,
      userId
    });
    throw error;
  }
};

export const getPendingEvents = async (communityId, adminId) => {
  try {
    // Verify admin permission
    const community = await Chat.findOne({
      _id: communityId,
      'members.userId': adminId,
      'members.role': 'admin',
      type: 'community'
    });

    if (!community) {
      throw new ApiError(403, 'Only community admins can view pending events');
    }

    return await CommunityEvent.find({
      communityId,
      status: 'pending'
    })
      .populate('createdBy', 'username avatar')
      .sort({ createdAt: -1 });
  } catch (error) {
    Logger.error('Failed to get pending events', {
      error: error.message,
      communityId,
      adminId
    });
    throw error;
  }
};

