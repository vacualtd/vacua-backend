import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as verificationService from '../services/verificationService.js';
import { uploadToS3 } from '../utils/s3Service.js';

export const initiateVerification = async (req, res, next) => {
  try {
    Logger.info('Received verification request:', {
      userId: req.user.id,
      body: {
        ...req.body,
        governmentIdNumber: '***' // Mask sensitive data in logs
      }
    });

    const verificationData = {
      fullName: req.body.fullName,
      dateOfBirth: req.body.dateOfBirth,
      phoneNumber: req.body.phoneNumber || req.body.phone, // Handle both field names
      governmentIdType: req.body.governmentIdType,
      governmentIdNumber: req.body.governmentIdNumber,
      frontImage: req.body.frontImage,
      backImage: req.body.backImage,
      proofDocument: req.body.proofDocument
    };

    // Validate required fields
    if (!verificationData.phoneNumber) {
      throw new ApiError(400, 'Phone number is required');
    }

    if (!verificationData.fullName) {
      throw new ApiError(400, 'Full name is required');
    }

    const result = await verificationService.initiateVerification(req.user.id, verificationData);

    res.json({
      success: true,
      message: 'Verification initiated successfully',
      data: result
    });

  } catch (error) {
    Logger.error('Verification initiation failed', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

export const uploadVerificationDocuments = async (req, res, next) => {
  try {
    const files = req.files;

    if (!files || (!files.frontImage && !files.backImage && !files.proofDocument)) {
      throw new ApiError(400, 'At least one document file is required');
    }

    // Process government ID files
    if (files.frontImage || files.backImage) {
      if (!files.frontImage || !files.backImage) {
        throw new ApiError(400, 'Both front and back images of ID are required');
      }
    }

    const uploadResults = {
      governmentId: {},
      addressProof: null
    };

    // Upload government ID images
    if (files.frontImage && files.backImage) {
      uploadResults.governmentId = {
        frontImage: await uploadToS3(files.frontImage[0], 'verification-docs/'),
        backImage: await uploadToS3(files.backImage[0], 'verification-docs/')
      };
    }

    // Upload proof of address
    if (files.proofDocument) {
      uploadResults.addressProof = await uploadToS3(files.proofDocument[0], 'verification-docs/');
    }

    // Save document references to user's verification
    const documents = await verificationService.saveVerificationDocuments(
      req.user.id,
      uploadResults
    );

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: documents
    });
  } catch (error) {
    Logger.error('Document upload failed', { 
      userId: req.user?.id,
      error: error.message 
    });
    next(error);
  }
};

export const verifyPhoneNumber = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new ApiError(400, 'Phone number is required');
    }

    const verificationCode = await verificationService.sendPhoneVerificationCode(
      req.user.id,
      phoneNumber
    );

    res.json({
      success: true,
      message: 'Verification code sent to phone number'
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPhoneOTP = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new ApiError(400, 'Verification code is required');
    }

    const result = await verificationService.verifyPhoneOTP(req.user.id, code);

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificationStatus = async (req, res, next) => {
  try {
    const status = await verificationService.getVerificationStatus(req.user.id);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

export const getPersonalVerificationStatus = async (req, res, next) => {
  try {
    Logger.info('Fetching personal verification status', {
      userId: req.user.id
    });

    const status = await verificationService.getPersonalVerificationStatus(req.user.id);

    res.json({
      success: true,
      data: {
        isVerified: status.isVerified,
        personalInfo: {
          fullName: status.fullName,
          phoneVerified: status.phoneNumber?.verified || false,
          identityVerified: status.identityVerification?.status === 'verified',
          documentsVerified: status.documentsVerified
        },
        verificationStatus: status.status,
        submittedAt: status.submittedAt,
        lastUpdated: status.lastUpdated
      }
    });

  } catch (error) {
    Logger.error('Failed to fetch verification status', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};