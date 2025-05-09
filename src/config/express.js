import express from 'express';
import cors from 'cors';
import { requestLogger } from '../middleware/requestLogger.js';
import { errorHandler } from '../middleware/errorHandler.js';

export const configureExpress = (app) => {
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  
  // Error Handler (should be last)
  app.use(errorHandler);
};