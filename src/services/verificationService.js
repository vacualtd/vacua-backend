import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import { sendVerificationEmail } from '../utils/emailService.js';
import { uploadToS3 } from '../utils/s3Service.js';
import { sendBusinessVerificationEmail } from '../utils/emailService.js';
import { sendPropertyVerificationEmail } from '../utils/emailService.js';
import mongoose from 'mongoose';
import { sendVerificationStatusEmail } from '../utils/emailService.js';

// Add valid government ID types
const VALID_GOVERNMENT_ID_TYPES = ['passport', 'drivers_license', 'national_id'];

// Helper function to validate and format date
const formatDate = (dateString) => {
  try {
    // Handle different date formats
    const formats = [
      'DD-MM-YYYY',
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'DD/MM/YYYY'
    ];
    
    let date;
    for (const format of formats) {
      // Try to parse the date
      date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        break;
      }
    }

    if (isNaN(date.getTime())) {
      throw new ApiError(400, 'Invalid date format. Please use YYYY-MM-DD format');
    }

    return date;
  } catch (error) {
    throw new ApiError(400, 'Invalid date format. Please use YYYY-MM-DD format');
  }
};

const validatePhoneNumber = (phone) => {
  if (!phone) {
    throw new ApiError(400, 'Phone number is required');
  }

  // Convert to string and clean
  const cleanedNumber = phone.toString().replace(/[\s\(\)\-\.]/g, '');
  
  // Allow any format as long as it has numbers
  if (!/\d/.test(cleanedNumber)) {
    throw new ApiError(400, 'Phone number must contain at least one digit');
  }

  return cleanedNumber;
};

export const initiateVerification = async (userId, verificationData) => {
  try {
    Logger.info('Processing verification data:', {
      verificationData: {
        governmentIdNumber: '***',
        phoneNumber: '***'
      }
    });

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Initialize identity verification with required structure
    user.identityVerification = {
      status: 'pending',
      fullName: verificationData.fullName,
      dateOfBirth: new Date(verificationData.dateOfBirth),
      phoneNumber: {
        number: verificationData.phoneNumber,
        verified: false
      },
      governmentId: {
        type: verificationData.governmentIdType,
        number: verificationData.governmentIdNumber,
        verificationStatus: 'pending'
      },
      addressProof: {
        type: 'utility_bill',
        status: 'pending',
        document: {} // Initialize empty document object
      },
      submittedAt: new Date()
    };

    await user.save();

    return {
      status: 'pending',
      verificationId: user._id,
      message: 'Verification initiated successfully',
      nextStep: 'upload_documents',
      requiredDocuments: [
        {
          type: 'government_id',
          status: 'pending',
          required: true
        },
        {
          type: 'proof_of_address',
          status: 'pending',
          required: true
        }
      ]
    };
  } catch (error) {
    Logger.error('Failed to initiate verification', { error: error.message });
    throw error;
  }
};

/**
 * Save uploaded verification documents to user's profile
 */
export const saveVerificationDocuments = async (userId, uploadResults) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Update government ID documents if provided
    if (uploadResults.governmentId?.frontImage && uploadResults.governmentId?.backImage) {
      user.identityVerification.governmentId = {
        ...user.identityVerification.governmentId,
        frontImage: {
          url: uploadResults.governmentId.frontImage.url,
          key: uploadResults.governmentId.frontImage.key
        },
        backImage: {
          url: uploadResults.governmentId.backImage.url,
          key: uploadResults.governmentId.backImage.key
        },
        verificationStatus: 'pending'
      };
    }

    // Update address proof if provided
    if (uploadResults.addressProof) {
      user.identityVerification.addressProof = {
        document: {
          url: uploadResults.addressProof.url,
          key: uploadResults.addressProof.key
        },
        status: 'pending',
        verifiedAt: null
      };
    }

    // Update overall verification status if all required documents are uploaded
    const hasAllDocuments = 
      user.identityVerification.governmentId?.frontImage?.url &&
      user.identityVerification.governmentId?.backImage?.url &&
      user.identityVerification.addressProof?.document?.url;

    if (hasAllDocuments) {
      user.identityVerification.status = 'pending';
    }

    await user.save();

    Logger.info('Verification documents saved', { 
      userId,
      documentTypes: Object.keys(uploadResults)
    });

    return {
      governmentId: {
        frontImage: user.identityVerification.governmentId?.frontImage,
        backImage: user.identityVerification.governmentId?.backImage,
        status: user.identityVerification.governmentId?.verificationStatus
      },
      addressProof: {
        document: user.identityVerification.addressProof?.document,
        status: user.identityVerification.addressProof?.status
      },
      overallStatus: user.identityVerification.status
    };
  } catch (error) {
    Logger.error('Failed to save verification documents', {
      userId,
      error: error.message
    });
    throw error;
  }
};

export const uploadVerificationDocuments = async (userId, documentData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.identityVerification) {
      throw new ApiError(400, 'Please initiate verification first');
    }

    // Upload files to S3 and update user document references
    const uploadPromises = [];

    if (documentData.frontImage && documentData.backImage) {
      uploadPromises.push(
        uploadToS3(documentData.frontImage[0], 'verification/government-id/'),
        uploadToS3(documentData.backImage[0], 'verification/government-id/')
      );
    }

    if (documentData.proofDocument) {
      uploadPromises.push(
        uploadToS3(documentData.proofDocument[0], 'verification/proof-documents/')
      );
    }

    const uploadedFiles = await Promise.all(uploadPromises);

    // Update user's identity verification documents
    if (documentData.frontImage && documentData.backImage) {
      user.identityVerification.governmentId = {
        ...user.identityVerification.governmentId,
        frontImage: {
          url: uploadedFiles[0].url,
          key: uploadedFiles[0].key
        },
        backImage: {
          url: uploadedFiles[1].url,
          key: uploadedFiles[1].key
        },
        verificationStatus: 'pending'
      };
    }

    if (documentData.proofDocument) {
      user.identityVerification.addressProof = {
        document: {
          url: uploadedFiles[uploadedFiles.length - 1].url,
          key: uploadedFiles[uploadedFiles.length - 1].key
        },
        status: 'pending'
      };
    }

    // Update verification status
    user.identityVerification.status = 'pending';
    user.identityVerification.updatedAt = new Date();

    await user.save();

    return {
      status: 'pending',
      documents: {
        governmentId: {
          frontImage: user.identityVerification.governmentId?.frontImage,
          backImage: user.identityVerification.governmentId?.backImage,
          status: user.identityVerification.governmentId?.verificationStatus
        },
        addressProof: user.identityVerification.addressProof
      },
      message: 'Documents uploaded successfully, pending verification'
    };
  } catch (error) {
    Logger.error('Document upload failed', { error: error.message, userId });
    throw new ApiError(500, `Failed to upload documents: ${error.message}`);
  }
};

export const submitBusinessVerification = async (userId, verificationData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'landlord') {
      throw new ApiError(400, 'Only landlords can submit business verification');
    }

    // Process and validate the verification data
    const {
      companyDetails,
      documents
    } = verificationData;

    // Update business verification data
    user.businessVerification = {
      companyName: companyDetails.name,
      registrationNumber: companyDetails.registrationNumber,
      taxId: companyDetails.taxId,
      businessAddress: companyDetails.businessAddress,
      status: 'pending',
      submittedAt: new Date(),
      documents: {
        companyCertificate: {
          url: documents.companyCertificate.url,
          key: documents.companyCertificate.key,
          verified: false
        },
        authorizedRepresentative: {
          idDocument: {
            url: documents.authorizedRepresentative.idDocument.url,
            key: documents.authorizedRepresentative.idDocument.key,
            verified: false
          },
          fullName: companyDetails.representativeName,
          position: companyDetails.representativePosition
        }
      }
    };

    // Add to verification history
    if (!user.businessVerification.verificationHistory) {
      user.businessVerification.verificationHistory = [];
    }

    user.businessVerification.verificationHistory.push({
      status: 'pending',
      timestamp: new Date(),
      documents: [
        { type: 'companyCertificate', verified: false },
        { type: 'representativeId', verified: false }
      ]
    });

    await user.save();

    Logger.info('Business verification submitted', {
      userId,
      companyName: companyDetails.name
    });

    // Send notification email (non-blocking)
    try {
      await sendBusinessVerificationEmail(user.email, {
        companyName: companyDetails.name,
        verificationId: user.businessVerification._id
      });
    } catch (emailError) {
      Logger.warn('Failed to send business verification email', { error: emailError.message });
    }

    return {
      status: 'pending',
      submittedAt: user.businessVerification.submittedAt,
      documents: {
        companyCertificate: { verified: false },
        representativeId: { verified: false }
      }
    };

  } catch (error) {
    Logger.error('Business verification submission failed', {
      userId,
      error: error.message
    });
    throw error;
  }
};

export const getLandlordVerificationStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'landlord') {
      throw new ApiError(400, 'Only landlords can access verification status');
    }

    // Get business verification status
    const businessVerification = {
      status: user.businessVerification?.status || 'not_submitted',
      submittedAt: user.businessVerification?.submittedAt,
      documents: {
        companyCertificate: {
          verified: user.businessVerification?.documents?.companyCertificate?.verified || false,
          url: user.businessVerification?.documents?.companyCertificate?.url
        },
        representativeId: {
          verified: user.businessVerification?.documents?.authorizedRepresentative?.idDocument?.verified || false,
          url: user.businessVerification?.documents?.authorizedRepresentative?.idDocument?.url
        }
      },
      companyDetails: {
        name: user.businessVerification?.companyName,
        registrationNumber: user.businessVerification?.registrationNumber,
        taxId: user.businessVerification?.taxId,
        businessAddress: user.businessVerification?.businessAddress,
        representativeName: user.businessVerification?.authorizedRepresentative?.fullName,
        representativePosition: user.businessVerification?.authorizedRepresentative?.position
      }
    };

    // Get property ownership verification status
    const propertyVerification = {
      status: user.propertyVerification?.status || 'not_submitted',
      submittedAt: user.propertyVerification?.submittedAt,
      documents: {
        ownershipProof: {
          verified: user.propertyVerification?.documents?.ownershipProof?.verified || false,
          url: user.propertyVerification?.documents?.ownershipProof?.url,
          type: user.propertyVerification?.documents?.ownershipProof?.type
        },
        utilityBill: {
          verified: user.propertyVerification?.documents?.utilityBill?.verified || false,
          url: user.propertyVerification?.documents?.utilityBill?.url
        },
        authorizationLetter: user.propertyVerification?.documents?.authorizationLetter ? {
          verified: user.propertyVerification.documents.authorizationLetter.verified || false,
          url: user.propertyVerification.documents.authorizationLetter.url
        } : null
      },
      propertyDetails: {
        address: user.propertyVerification?.address
      }
    };

    // Get identity verification status
    const identityVerification = {
      status: user.identityVerification?.status || 'not_submitted',
      submittedAt: user.identityVerification?.submittedAt,
      documents: {
        governmentId: user.identityVerification?.governmentId ? {
          verified: user.identityVerification.governmentId.verificationStatus === 'verified',
          type: user.identityVerification.governmentId.type
        } : null,
        addressProof: user.identityVerification?.addressProof ? {
          verified: user.identityVerification.addressProof.status === 'verified'
        } : null
      }
    };

    Logger.info('Landlord verification status retrieved', { userId });

    return {
      overallStatus: user.isVerified ? 'verified' : 'pending',
      businessVerification,
      propertyVerification,
      identityVerification,
      accountStatus: user.accountStatus || 'pending',
      verificationHistory: {
        business: user.businessVerification?.verificationHistory || [],
        property: user.propertyVerification?.verificationHistory || [],
        identity: user.identityVerification?.verificationHistory || []
      }
    };

  } catch (error) {
    Logger.error('Failed to get landlord verification status', {
      userId,
      error: error.message
    });
    throw error;
  }
};

export const submitPropertyOwnership = async (userId, verificationData) => {
  try {
    const user = await User.findById(userId).select('+propertyVerification');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'landlord') {
      throw new ApiError(400, 'Only landlords can submit property ownership verification');
    }

    const { address, documents } = verificationData;

    // Create new property verification data
    user.propertyVerification = {
      address,
      status: 'pending',
      submittedAt: new Date(),
      documents: {
        ownershipProof: {
          url: documents.ownershipProof.url,
          key: documents.ownershipProof.key,
          type: documents.ownershipProof.type,
          verified: false,
          submittedAt: new Date()
        },
        utilityBill: {
          url: documents.utilityBill.url,
          key: documents.utilityBill.key,
          verified: false,
          submittedAt: new Date()
        },
        ...(documents.authorizationLetter ? {
          authorizationLetter: {
            url: documents.authorizationLetter.url,
            key: documents.authorizationLetter.key,
            verified: false,
            submittedAt: new Date()
          }
        } : null)
      },
      verificationHistory: [{
        status: 'pending',
        timestamp: new Date(),
        documents: [
          { type: 'ownershipProof', verified: false },
          { type: 'utilityBill', verified: false },
          ...(documents.authorizationLetter ? [{ type: 'authorizationLetter', verified: false }] : [])
        ]
      }]
    };

    await user.save();

    Logger.info('Property verification details saved', {
      userId,
      address,
      documentsSubmitted: {
        ownershipProof: true,
        utilityBill: true,
        authorizationLetter: !!documents.authorizationLetter
      }
    });

    return {
      status: 'pending',
      submittedAt: user.propertyVerification.submittedAt,
      documents: {
        ownershipProof: {
          verified: false,
          type: documents.ownershipProof.type
        },
        utilityBill: { verified: false },
        ...(documents.authorizationLetter ? {
          authorizationLetter: { verified: false }
        } : {})
      }
    };
  } catch (error) {
    Logger.error('Property ownership verification submission failed', {
      userId,
      error: error.message
    });
    throw error;
  }
};

export const reviewLandlordVerification = async (req, res, next) => {
  const session = await mongoose.startSession();
  
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'landlord') {
      throw new ApiError(400, 'User is not a landlord');
    }

    const statusMap = {
      'approved': 'verified',
      'rejected': 'rejected'
    };

    if (!statusMap[status]) {
      throw new ApiError(400, 'Invalid status. Must be either "approved" or "rejected"');
    }

    session.startTransaction();

    try {
      // Update all verification statuses at once
      const verificationTypes = ['business', 'property', 'identity'];
      const updates = {};

      for (const type of verificationTypes) {
        if (user[`${type}Verification`]) {
          // Update main status
          user[`${type}Verification`].status = statusMap[status];
          user[`${type}Verification`].reviewedAt = new Date();
          user[`${type}Verification`].reviewedBy = adminId;

          // Update document verification statuses
          if (status === 'approved' && user[`${type}Verification`].documents) {
            Object.keys(user[`${type}Verification`].documents).forEach(doc => {
              if (user[`${type}Verification`].documents[doc]) {
                user[`${type}Verification`].documents[doc].verified = true;
                user[`${type}Verification`].documents[doc].verifiedAt = new Date();
              }
            });
          }

          // Add to verification history
          if (!user[`${type}Verification`].verificationHistory) {
            user[`${type}Verification`].verificationHistory = [];
          }

          user[`${type}Verification`].verificationHistory.push({
            status: statusMap[status],
            reason,
            reviewedBy: adminId,
            timestamp: new Date()
          });

          updates[type] = statusMap[status];
        }
      }

      // Update overall verification status
      user.isVerified = status === 'approved';
      user.accountStatus = status === 'approved' ? 'active' : 'verification_rejected';

      await user.save({ session });
      await session.commitTransaction();

      // Send verification status email
      await sendVerificationStatusEmail(user.email, {
        fullName: user.fullName || user.username,
        status: statusMap[status],
        reason,
        type: 'landlord'
      });

      res.json({
        success: true,
        message: `All landlord verifications ${status} successfully`,
        data: {
          userId: user._id,
          status: statusMap[status],
          isVerified: user.isVerified,
          verificationStatus: updates,
          accountStatus: user.accountStatus,
          reviewedAt: new Date(),
          reviewedBy: adminId
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  } catch (error) {
    Logger.error('Landlord verification review failed', {
      error: error.message,
      userId,
      adminId: req.user?.id
    });
    next(error);
  } finally {
    session.endSession();
  }
};

export const getPendingLandlordVerifications = async () => {
  try {
    const pendingVerifications = await User.find({
      role: 'landlord',
      $or: [
        { 'businessVerification.status': 'pending' },
        { 'propertyVerification.status': 'pending' },
        { 'identityVerification.status': 'pending' }
      ]
    }).select('email username fullName businessVerification propertyVerification identityVerification createdAt');

    return pendingVerifications.map(user => ({
      userId: user._id,
      email: user.email,
      fullName: user.fullName || user.username,
      submittedAt: user.businessVerification?.submittedAt || user.propertyVerification?.submittedAt,
      verificationTypes: {
        business: user.businessVerification?.status || 'not_submitted',
        property: user.propertyVerification?.status || 'not_submitted',
        identity: user.identityVerification?.status || 'not_submitted'
      }
    }));

  } catch (error) {
    Logger.error('Failed to get pending landlord verifications', { error: error.message });
    throw error;
  }
};

export const getLandlordVerificationDetails = async (userId) => {
  try {
    const user = await User.findById(userId).select('+businessVerification +propertyVerification +identityVerification');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'landlord') {
      throw new ApiError(400, 'User is not a landlord');
    }

    return {
      userId: user._id,
      email: user.email,
      fullName: user.fullName || user.username,
      role: user.role,
      accountStatus: user.accountStatus,
      isVerified: user.isVerified,
      businessVerification: {
        status: user.businessVerification?.status || 'not_submitted',
        submittedAt: user.businessVerification?.submittedAt,
        reviewedAt: user.businessVerification?.reviewedAt,
        reviewedBy: user.businessVerification?.reviewedBy,
        companyDetails: {
          name: user.businessVerification?.companyName,
          registrationNumber: user.businessVerification?.registrationNumber,
          taxId: user.businessVerification?.taxId,
          businessAddress: user.businessVerification?.businessAddress
        },
        documents: {
          companyCertificate: user.businessVerification?.documents?.companyCertificate,
          representativeId: user.businessVerification?.documents?.authorizedRepresentative?.idDocument
        },
        verificationHistory: user.businessVerification?.verificationHistory || []
      },
      propertyVerification: {
        status: user.propertyVerification?.status || 'not_submitted',
        submittedAt: user.propertyVerification?.submittedAt,
        reviewedAt: user.propertyVerification?.reviewedAt,
        reviewedBy: user.propertyVerification?.reviewedBy,
        propertyDetails: {
          address: user.propertyVerification?.address
        },
        documents: {
          ownershipProof: user.propertyVerification?.documents?.ownershipProof,
          utilityBill: user.propertyVerification?.documents?.utilityBill,
          authorizationLetter: user.propertyVerification?.documents?.authorizationLetter
        },
        verificationHistory: user.propertyVerification?.verificationHistory || []
      },
      identityVerification: {
        status: user.identityVerification?.status || 'not_submitted',
        submittedAt: user.identityVerification?.submittedAt,
        verifiedAt: user.identityVerification?.verifiedAt,
        verifiedBy: user.identityVerification?.verifiedBy,
        documents: {
          governmentId: user.identityVerification?.governmentId,
          addressProof: user.identityVerification?.addressProof
        }
      }
    };

  } catch (error) {
    Logger.error('Failed to get landlord verification details', {
      userId,
      error: error.message
    });
    throw error;
  }
};

export const getIdentityVerificationStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Get complete identity verification status
    const status = {
      status: user.identityVerification?.status || 'not_submitted',
      isVerified: user.identityVerification?.status === 'verified',
      submittedAt: user.identityVerification?.submittedAt,
      verifiedAt: user.identityVerification?.verifiedAt,
      verifiedBy: user.identityVerification?.verifiedBy,
      personalInfo: {
        fullName: user.identityVerification?.fullName,
        dateOfBirth: user.identityVerification?.dateOfBirth,
        phoneNumber: user.identityVerification?.phoneNumber
      },
      documents: {
        governmentId: {
          type: user.identityVerification?.governmentId?.type,
          number: user.identityVerification?.governmentId?.number,
          status: user.identityVerification?.governmentId?.verificationStatus,
          frontImage: user.identityVerification?.governmentId?.frontImage,
          backImage: user.identityVerification?.governmentId?.backImage,
        },
        addressProof: user.identityVerification?.addressProof
      },
      verificationHistory: user.identityVerification?.verificationHistory || []
    };

    Logger.info('Identity verification status retrieved', { 
      userId,
      status: status.status
    });

    return status;
  } catch (error) {
    Logger.error('Failed to get identity verification status', {
      userId,
      error: error.message
    });
    throw error;
  }
};

export const getPersonalVerificationStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const verificationStatus = {
      isVerified: user.isVerified || false,
      status: user.identityVerification?.status || 'not_submitted',
      fullName: user.identityVerification?.fullName,
      phoneNumber: {
        verified: user.identityVerification?.phoneNumber?.verified || false,
        number: user.identityVerification?.phoneNumber?.number
      },
      identityVerification: {
        status: user.identityVerification?.status || 'not_submitted',
        governmentId: {
          verified: user.identityVerification?.governmentId?.verificationStatus === 'verified',
          type: user.identityVerification?.governmentId?.type
        }
      },
      documentsVerified: !!(
        user.identityVerification?.governmentId?.frontImage?.url &&
        user.identityVerification?.governmentId?.backImage?.url &&
        user.identityVerification?.governmentId?.verificationStatus === 'verified'
      ),
      submittedAt: user.identityVerification?.submittedAt,
      lastUpdated: user.identityVerification?.updatedAt || user.identityVerification?.submittedAt
    };

    Logger.info('Personal verification status retrieved', {
      userId,
      status: verificationStatus.status
    });

    return verificationStatus;
  } catch (error) {
    Logger.error('Failed to get personal verification status', {
      userId,
      error: error.message
    });
    throw error;
  }
};

export const getBusinessVerificationStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const status = {
      status: user.businessVerification?.status || 'not_submitted',
      isVerified: user.businessVerification?.status === 'verified',
      submittedAt: user.businessVerification?.submittedAt,
      reviewedAt: user.businessVerification?.reviewedAt,
      reviewedBy: user.businessVerification?.reviewedBy,
      companyDetails: {
        name: user.businessVerification?.companyName,
        registrationNumber: user.businessVerification?.registrationNumber,
        taxId: user.businessVerification?.taxId,
        businessAddress: user.businessVerification?.businessAddress
      },
      documents: {
        companyCertificate: {
          verified: user.businessVerification?.documents?.companyCertificate?.verified || false,
          url: user.businessVerification?.documents?.companyCertificate?.url
        },
        representativeId: {
          verified: user.businessVerification?.documents?.authorizedRepresentative?.idDocument?.verified || false,
          url: user.businessVerification?.documents?.authorizedRepresentative?.idDocument?.url
        }
      },
      verificationHistory: user.businessVerification?.verificationHistory || []
    };

    Logger.info('Business verification status retrieved', { userId });
    return status;
  } catch (error) {
    Logger.error('Failed to get business verification status', {
      userId,
      error: error.message
    });
    throw error;
  }
};

export const getPropertyVerificationStatus = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select('role propertyVerification')
      .lean();

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'landlord') {
      throw new ApiError(400, 'Only landlords can access property verification status');
    }

    // Return structured verification status
    return {
      status: user.propertyVerification?.status || 'not_submitted',
      isVerified: user.propertyVerification?.status === 'verified',
      submittedAt: user.propertyVerification?.submittedAt || null,
      documents: {
        ownershipProof: {
          verified: user.propertyVerification?.documents?.ownershipProof?.verified || false,
          url: user.propertyVerification?.documents?.ownershipProof?.url || '',
          type: user.propertyVerification?.documents?.ownershipProof?.type || '',
          submittedAt: user.propertyVerification?.documents?.ownershipProof?.submittedAt || null
        },
        utilityBill: {
          verified: user.propertyVerification?.documents?.utilityBill?.verified || false,
          url: user.propertyVerification?.documents?.utilityBill?.url || '',
          submittedAt: user.propertyVerification?.documents?.utilityBill?.submittedAt || null
        },
        authorizationLetter: user.propertyVerification?.documents?.authorizationLetter ? {
          verified: user.propertyVerification.documents.authorizationLetter.verified || false,
          url: user.propertyVerification.documents.authorizationLetter.url || '',
          submittedAt: user.propertyVerification.documents.authorizationLetter.submittedAt || null
        } : null
      },
      propertyDetails: {
        address: user.propertyVerification?.address || ''
      }
    };
  } catch (error) {
    Logger.error('Failed to get property verification status', {
      userId,
      error: error.message
    });
    throw error;
  }
};