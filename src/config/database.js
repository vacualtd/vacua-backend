import mongoose from 'mongoose';
import { Logger } from '../utils/logger.js';

const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4
        retryWrites: true,
        w: 'majority',
        maxPoolSize: 10,
        heartbeatFrequencyMS: 2000,
        connectTimeoutMS: 30000
      });

      Logger.success(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      Logger.error(`Connection attempt ${i + 1} failed:`, {
        error: error.message,
        code: error.code,
        reason: error.reason
      });

      if (i === retries - 1) {
        Logger.error('Max retries reached. Exiting...');
        process.exit(1);
      }

      Logger.info(`Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const connectDatabase = async () => {
  try {
    await connectWithRetry();

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      Logger.warn('MongoDB disconnected. Attempting to reconnect...');
      connectWithRetry(3, 3000);
    });

    mongoose.connection.on('error', (err) => {
      Logger.error('MongoDB connection error:', {
        error: err.message,
        code: err.code,
        reason: err.reason
      });
    });

    // Graceful shutdown handler
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        Logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        Logger.error('Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    Logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

export const closeDatabase = async () => {
  try {
    await mongoose.connection.close();
    Logger.info('MongoDB connection closed');
  } catch (error) {
    Logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};


