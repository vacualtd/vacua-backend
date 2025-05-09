import { StreamChat } from 'stream-chat';
import { Logger } from './logger.js';

if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
  throw new Error('Stream Chat credentials not configured');
}

const streamClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

streamClient.on('connection.changed', (event) => {
  Logger.info('Stream Chat connection status:', { 
    online: event.online 
  });
});

streamClient.on('error', (event) => {
  Logger.error('Stream Chat error:', { error: event.error });
});

export default streamClient;
