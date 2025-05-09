import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Logger } from './utils/logger.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import { setupSwagger } from './config/swagger.js';
import routes from './config/routes.js';
import { initializeSocket, closeSocket } from './socket/socketServer.js';
import { ApiError } from './utils/ApiError.js';
import { cleanupInvalidChats } from './services/chatService.js';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { scheduleCleanupJob } from './services/cleanupService.js';
import slowDown from 'express-slow-down';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// Validate environment variables at startup
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'NODE_ENV',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length) {
  Logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3002; // Make sure this matches your client config
const isProduction = process.env.NODE_ENV === 'production';

// Initialize socket server
const io = initializeSocket(httpServer);

// Updated speed limiter configuration
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes
  delayMs: () => 500, // fixed delay of 500ms
  validate: {
    delayMs: false // Disable the warning
  }
});

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Enhanced security middleware setup
app.use(cors({
  origin: isProduction ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: isProduction,
  crossOriginEmbedderPolicy: isProduction
}));

app.use(compression());
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Apply rate limiting to all routes
app.use(limiter);
app.use(speedLimiter);

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

if (!isProduction) {
  setupSwagger(app);
}

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Enhanced error handling
app.use((err, req, res, next) => {
  if (!(err instanceof ApiError)) {
    err = new ApiError(
      err.status || 500,
      err.message || 'Internal server error',
      err.stack
    );
  }

  const errorResponse = {
    success: false,
    message: err.message,
    statusCode: err.statusCode,
    ...(isProduction ? {} : { stack: err.stack })
  };

  Logger.error('Error occurred', errorResponse);
  res.status(err.statusCode).json(errorResponse);
});

// Catch-all route for unhandled paths
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

let server;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  try {
    Logger.info(`${signal} received. Starting graceful shutdown...`);
    
    // Close server first to stop accepting new requests
    server && await new Promise(resolve => server.close(resolve));
    Logger.info('Server closed');
    
    // Close socket connections
    await closeSocket(io);
    Logger.info('Socket connections closed');
    
    // Close database connection
    await closeDatabase();
    Logger.info('Database connection closed');
    
    Logger.success('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    Logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Startup sequence
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    Logger.info('Database connected successfully');

    // Run cleanup tasks
    await cleanupInvalidChats();
    scheduleCleanupJob();
    Logger.info('Cleanup tasks initialized');

    // Start server
    server = httpServer.listen(PORT, '0.0.0.0', () => {
      Logger.startup(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      Logger.info('Environment', { 
        node_env: process.env.NODE_ENV,
        database: process.env.MONGODB_URI?.split('@')[1]
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      Logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Register shutdown handlers
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => gracefulShutdown(signal));
    });

  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;