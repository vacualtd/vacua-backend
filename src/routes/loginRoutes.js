import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { login } from '../controllers/loginController.js';
import { body } from 'express-validator';

const router = express.Router();

router.post(
  '/',
  [
    body('identifier').notEmpty().withMessage('Email/username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('userType').isIn(['landlord', 'student']).withMessage('Valid user type is required')
  ],
  validateRequest,
  login
);

export const loginRoutes = router;

