import { Call } from '../models/Call.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';

export const createCall = async (data) => {
  const call = await Call.create({
    type: data.type,
    initiator: data.initiatorId,
    participants: data.participants.map(userId => ({
      userId,
      status: 'pending'
    })),
    roomId: data.roomId
  });

  return call;
};

export const updateCallStatus = async (callId, userId, status) => {
  const call = await Call.findById(callId);
  if (!call) {
    throw new ApiError(404, 'Call not found');
  }

  const participant = call.participants.find(
    p => p.userId.toString() === userId
  );

  if (!participant) {
    throw new ApiError(403, 'User is not a participant in this call');
  }

  participant.status = status;
  
  if (status === 'accepted') {
    participant.joinedAt = new Date();
  } else if (status === 'rejected' || status === 'missed') {
    participant.leftAt = new Date();
  }

  await call.save();
  return call;
};

export const endCall = async (callId) => {
  const call = await Call.findById(callId);
  if (!call) {
    throw new ApiError(404, 'Call not found');
  }

  const endTime = new Date();
  const duration = Math.round((endTime - call.startTime) / 1000); // duration in seconds

  call.status = 'completed';
  call.endTime = endTime;
  call.duration = duration;

  // Update participants who haven't explicitly left
  call.participants.forEach(participant => {
    if (!participant.leftAt) {
      participant.leftAt = endTime;
    }
  });

  await call.save();
  return call;
};

export const getCallHistory = async (userId, page = 1, limit = 20) => {
  const calls = await Call.paginate(
    {
      $or: [
        { initiator: userId },
        { 'participants.userId': userId }
      ]
    },
    {
      page,
      limit,
      sort: { startTime: -1 },
      populate: [
        {
          path: 'initiator',
          select: 'username email'
        },
        {
          path: 'participants.userId',
          select: 'username email'
        }
      ]
    }
  );

  return calls;
};

export const getActiveCall = async (userId) => {
  const activeCall = await Call.findOne({
    status: 'ongoing',
    $or: [
      { initiator: userId },
      { 'participants.userId': userId }
    ]
  }).populate([
    {
      path: 'initiator',
      select: 'username email'
    },
    {
      path: 'participants.userId',
      select: 'username email'
    }
  ]);

  return activeCall;
};