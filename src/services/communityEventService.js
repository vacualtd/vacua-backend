import { CommunityEvent } from '../models/CommunityEvent.js';
import { Chat } from '../models/Chat.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export const createEvent = async (communityId, userId, eventData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if community exists and user is a member
        const community = await Chat.findOne({
            _id: communityId,
            'members.userId': userId
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
        return event[0];
    } catch (error) {
        await session.abortTransaction();
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

        return event;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const joinEvent = async (eventId, userId, status = 'going') => {
    const event = await CommunityEvent.findById(eventId);
    if (!event) {
        throw new ApiError(404, 'Event not found');
    }

    if (event.status !== 'approved') {
        throw new ApiError(400, 'Cannot join an unapproved event');
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
    return event;
};

export const getCommunityEvents = async (communityId, userId, filter = {}) => {
    // Check community membership
    const community = await Chat.findOne({
        _id: communityId,
        'members.userId': userId
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
};

export const getPendingEvents = async (communityId, adminId) => {
    // Verify admin permission
    const community = await Chat.findOne({
        _id: communityId,
        'members.userId': adminId,
        'members.role': 'admin'
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
};
