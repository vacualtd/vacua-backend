import { Logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  Logger.info('Incoming request', {
    path: req.path,
    method: req.method,
    query: req.query,
    ip: req.ip
  });
  next();
};