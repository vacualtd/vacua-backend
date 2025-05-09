import { StreamChat } from 'stream-chat';
import { Logger } from '../utils/logger.js';

if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
  throw new Error('Stream Chat credentials are not configured');
}

const streamClient = new StreamChat(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

// Initialize default roles if needed
const initializeStreamRoles = async () => {
  try {
    await streamClient.updateAppSettings({
      app_settings: {
        permissions: [
          { name: 'user', resources: ['*'], actions: ['read', 'write'] },
          { name: 'admin', resources: ['*'], actions: ['*'] },
          { name: 'moderator', resources: ['*'], actions: ['read', 'write', 'moderate'] }
        ]
      }
    });
    Logger.info('Stream Chat roles initialized successfully');
  } catch (error) {
    Logger.error('Failed to initialize Stream Chat roles', { error: error.message });
  }
};

// Initialize roles when setting up the client
initializeStreamRoles().catch(error => {
  Logger.error('Stream Chat initialization error:', { error: error.message });
});

streamClient.on('connection.changed', (event) => {
  Logger.info('Stream Chat connection status changed:', { 
    status: event.online ? 'online' : 'offline' 
  });
});

streamClient.on('error', (event) => {
  Logger.error('Stream Chat error:', { 
    type: event.type,
    error: event.error 
  });
});

// Add error handling for connection
streamClient.on('connection.error', event => {
  Logger.error('Stream Chat connection error:', { 
    type: event.type,
    error: event.error?.message || 'Unknown error'
  });
});

export default streamClient;
