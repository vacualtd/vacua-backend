import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as callService from '../services/callService.js';

export const initiateCall = async (req, res, next) => {
  try {
    const { type, participants, roomId } = req.body;
    
    const call = await callService.createCall({
      type,
      initiatorId: req.user.id,
      participants,
      roomId
    });

    res.status(201).json({
      success: true,
      message: 'Call initiated successfully',
      data: call
    });
  } catch (error) {
    Logger.error('Failed to initiate call', { error: error.message });
    next(error);
  }
};

export const endCall = async (req, res, next) => {
  try {
    const { callId } = req.params;
    
    const call = await callService.endCall(callId);

    res.json({
      success: true,
      message: 'Call ended successfully',
      data: call
    });
  } catch (error) {
    Logger.error('Failed to end call', { error: error.message });
    next(error);
  }
};

export const getCallHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const calls = await callService.getCallHistory(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: calls.docs,
      pagination: {
        total: calls.totalDocs,
        page: calls.page,
        pages: calls.totalPages,
        hasNext: calls.hasNextPage
      }
    });
  } catch (error) {
    Logger.error('Failed to get call history', { error: error.message });
    next(error);
  }
};

export const getActiveCall = async (req, res, next) => {
  try {
    const call = await callService.getActiveCall(req.user.id);

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    Logger.error('Failed to get active call', { error: error.message });
    next(error);
  }
};