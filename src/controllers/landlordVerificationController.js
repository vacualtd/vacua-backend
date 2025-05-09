import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as verificationService from '../services/verificationService.js';
import { uploadToS3 } from '../utils/s3Service.js';

export const submitBusinessVerification = async (req, res, next) => {
  try {
    const {
      companyName,
      registrationNumber,
      taxId,
      businessAddress,
      representativeName,
      representativePosition
    } = req.body;

    const files = req.files;

    if (!files?.companyCertificate || !files?.representativeId) {
      throw new ApiError(400, 'Company certificate and representative ID are required');
    }

    // Upload documents to S3
    const [certificateUpload, idUpload] = await Promise.all([
      uploadToS3(files.companyCertificate[0], 'business-verification/'),
      uploadToS3(files.representativeId[0], 'business-verification/')
    ]);

    const verification = await verificationService.submitBusinessVerification(
      req.user.id,
      {
        companyDetails: {
          name: companyName,
          registrationNumber,
          taxId,
          businessAddress,
          representativeName,
          representativePosition
        },
        documents: {
          companyCertificate: certificateUpload,
          authorizedRepresentative: {
            idDocument: idUpload
          }
        }
      }
    );

    res.json({
      success: true,
      message: 'Business verification submitted successfully',
      data: verification
    });
  } catch (error) {
    next(error);
  }
};

export const submitPropertyOwnership = async (req, res, next) => {
  try {
    const {
      propertyAddress,
      ownershipType,
      isAgent
    } = req.body;

    const files = req.files;

    if (!files?.ownershipProof || !files?.utilityBill) {
      throw new ApiError(400, 'Ownership proof and utility bill are required');
    }

    // Upload documents
    const uploads = await Promise.all([
      uploadToS3(files.ownershipProof[0], 'property-verification/'),
      uploadToS3(files.utilityBill[0], 'property-verification/'),
      ...(isAgent && files.authorizationLetter ? 
        [uploadToS3(files.authorizationLetter[0], 'property-verification/')] : 
        [])
    ]);

    const verification = await verificationService.submitPropertyOwnership(
      req.user.id,
      {
        address: propertyAddress,
        documents: {
          ownershipProof: {
            type: ownershipType,
            ...uploads[0]
          },
          utilityBill: uploads[1],
          ...(isAgent && uploads[2] ? {
            authorizationLetter: {
              ...uploads[2],
              isRequired: true
            }
          } : {})
        }
      }
    );

    res.json({
      success: true,
      message: 'Property ownership verification submitted successfully',
      data: verification
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificationStatus = async (req, res, next) => {
  try {
    const status = await verificationService.getLandlordVerificationStatus(req.user.id);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
}; 