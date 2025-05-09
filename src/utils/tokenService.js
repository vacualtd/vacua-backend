import jwt from 'jsonwebtoken';
import { Logger } from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    Logger.error('Token generation failed', { error: error.message });
    throw error;
  }
};

export const verifyToken = async (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    Logger.error('Token verification failed', { error: error.message });
    return null;
  }
};

export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    Logger.error('Token decode failed', { error: error.message });
    return null;
  }
};

export const generateTempToken = (payload) => {
  return generateToken(payload, '10m'); // 10 minutes expiration
};