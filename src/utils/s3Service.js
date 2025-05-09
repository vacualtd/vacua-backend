import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './logger.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export const generateUploadURL = async () => {
  const imageKey = `uploads/${uuidv4()}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: imageKey,
    ContentType: 'image/jpeg'
  });

  const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  console.lg(uploadURL)

  return {
    uploadURL,
    imageKey
  };
};

export const uploadToS3FP = async (file) => {
  const imageKey = `properties/${uuidv4()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: imageKey,
    Body: file.buffer,
    ContentType: file.mimetype
  });

  await s3Client.send(command);

  return {
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageKey}`,
    key: imageKey
  };
};

export const uploadToS3 = async (file, folder = 'uploads/') => {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file provided');
    }

    const key = `${folder}${uuidv4()}-${file.originalname}`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Remove ACL parameter as it's not supported
    };

    Logger.info('Attempting S3 upload', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bucket: process.env.AWS_BUCKET_NAME,
      key
    });

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    Logger.info('S3 upload successful', { url, key });

    return {
      url,
      key
    };
  } catch (error) {
    Logger.error('S3 upload failed:', {
      error: error.message,
      code: error.Code,
      name: error.name,
      details: error.$metadata
    });
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

export const generatePresignedUrl = async (key, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600 // URL expires in 1 hour
    });

    return {
      signedUrl,
      key,
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    };
  } catch (error) {
    Logger.error('Failed to generate presigned URL:', error);
    throw error;
  }
};

export const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    Logger.info('File deleted from S3', { key });
    return true;
  } catch (error) {
    Logger.error('S3 deletion failed:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

// Utility functions
export const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('application/pdf')) return 'pdf';
  return 'file';
};

export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  } = options;

  if (!file) {
    throw new Error('No file provided');
  }

  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return true;
};

export const generateThumbnail = async (file) => {
  // Implement thumbnail generation using sharp for images
  // and ffmpeg for videos
  // Return the thumbnail buffer
};