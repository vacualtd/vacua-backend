import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as verificationService from '../services/verificationService.js';

export const getBusinessVerificationStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const status = await verificationService.getBusinessVerificationStatus(userId);

    res.json({
      success: true,
      data: {
        status: status.status,
        isVerified: status.status === 'verified',
        submittedAt: status.submittedAt,
        documents: status.documents,
        companyDetails: status.companyDetails
      }
    });
  } catch (error) {
    Logger.error('Failed to fetch business verification status', { error: error.message });
    next(error);
  }
};

export const getIdentityVerificationStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const status = await verificationService.getIdentityVerificationStatus(userId);

    res.json({
      success: true,
      data: {
        status: status.status,
        isVerified: status.status === 'verified',
        submittedAt: status.submittedAt,
        documents: status.documents
      }
    });
  } catch (error) {
    Logger.error('Failed to fetch identity verification status', { error: error.message });
    next(error);
  }
};

export const getAllVerificationStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const status = await verificationService.getLandlordVerificationStatus(userId);

    res.json({
      success: true,
      data: {
        overallStatus: status.overallStatus,
        isVerified: status.overallStatus === 'verified',
        business: {
          status: status.businessVerification.status,
          documents: status.businessVerification.documents,
          submittedAt: status.businessVerification.submittedAt
        },
        identity: {
          status: status.identityVerification.status,
          documents: status.identityVerification.documents,
          submittedAt: status.identityVerification.submittedAt
        },
        profile: {
          isComplete: status.profile?.isComplete || false,
          missingFields: status.profile?.missingFields || []
        }
      }
    });
  } catch (error) {
    Logger.error('Failed to fetch all verification statuses', { error: error.message });
    next(error);
  }
};

export const getPropertyVerificationStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    Logger.info('Fetching property verification status', { userId });
    
    const status = await verificationService.getPropertyVerificationStatus(userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    Logger.error('Failed to fetch property verification status', { 
      userId: req.user?.id,
      error: error.message 
    });
    next(error);
  }
};

export const submitPropertyVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { address } = req.body;
    const files = req.files;

    if (!files?.ownershipProof || !files?.utilityBill) {
      throw new ApiError(400, 'Required documents missing');
    }

    const result = await verificationService.submitPropertyVerification(userId, {
      address,
      documents: {
        ownershipProof: files.ownershipProof[0],
        utilityBill: files.utilityBill[0],
        authorizationLetter: files.authorizationLetter ? files.authorizationLetter[0] : null
      }
    });

    res.json({
      success: true,
      message: 'Property verification documents submitted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificationRequirements = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const requirements = await verificationService.getVerificationRequirements(userId);

    res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    next(error);
  }
};

export const initiateEmailVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const verificationData = {
      fullName: req.body.fullName,
      dateOfBirth: req.body.dateOfBirth,
      phoneNumber: req.body.phoneNumber,
      governmentIdType: req.body.governmentIdType,
      governmentIdNumber: req.body.governmentIdNumber
    };

    // Validate required fields
    const requiredFields = ['fullName', 'dateOfBirth', 'phoneNumber', 'governmentIdType', 'governmentIdNumber'];
    const missingFields = requiredFields.filter(field => !verificationData[field]);
    
    if (missingFields.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(verificationData.dateOfBirth)) {
      throw new ApiError(400, 'Date of birth must be in YYYY-MM-DD format');
    }

    const result = await verificationService.initiateVerification(userId, verificationData);

    res.json({
      success: true,
      message: 'Verification initiated successfully',
      data: {
        status: result.status,
        verificationId: result.verificationId,
        nextStep: result.nextStep,
        requirements: {
          documents: [
            {
              type: 'government_id',
              required: true,
              description: 'Front and back of government ID'
            },
            {
              type: 'proof_of_address',
              required: true,
              description: 'Recent utility bill or bank statement'
            }
          ]
        }
      }
    });
  } catch (error) {
    Logger.error('Failed to initiate verification', { error: error.message });
    next(error);
  }
};

export const uploadVerificationDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const files = req.files;

    if (!files?.frontImage?.[0] || !files?.backImage?.[0]) {
      throw new ApiError(400, 'Both front and back images of ID are required');
    }

    const result = await verificationService.uploadVerificationDocuments(userId, files);

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: result
    });
  } catch (error) {
    Logger.error('Failed to upload verification documents', {
      error: error.message,
      userId: req.user?.id
    });
    next(error);
  }
};