import { Logger } from './logger.js';

export const validateMongoDBUri = (uri) => {
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  // Basic URI format validation
  const mongoDBPattern = /^mongodb(\+srv)?:\/\/.+/;
  if (!mongoDBPattern.test(uri)) {
    throw new Error('Invalid MongoDB URI format');
  }

  // Check for Atlas cluster pattern
  if (uri.includes('mongodb.net')) {
    // Validate Atlas URI components
    const requiredParts = ['username', 'password', 'cluster'];
    const missing = requiredParts.filter(part => !uri.includes(part));
    
    if (missing.length > 0) {
      throw new Error(`MongoDB Atlas URI missing: ${missing.join(', ')}`);
    }
  }

  return true;
};

export const validateEnvironment = () => {
  try {
    // Validate MongoDB URI
    validateMongoDBUri(process.env.MONGODB_URI);

    // Validate other required environment variables
    const requiredVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION'
    ];

    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    Logger.info('Environment validation successful');
    return true;
  } catch (error) {
    Logger.error('Environment validation failed:', error.message);
    throw error;
  }
};
