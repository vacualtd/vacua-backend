import { StreamClient } from '@stream-io/node-sdk';
import { Logger } from '../utils/logger.js';

let streamVideoClient;

try {
  streamVideoClient = new StreamClient(
    process.env.STREAM_API_KEY,
    process.env.STREAM_API_SECRET
  );
  Logger.info('Stream Video client initialized successfully');
} catch (error) {
  Logger.error('Failed to initialize Stream Video client', { error: error.message });
  throw error;
}

export default streamVideoClient;
