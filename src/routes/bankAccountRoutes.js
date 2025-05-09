import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { body } from 'express-validator';
import {
  createBankAccount,
  getBankAccountDetails,
  updateBankAccount
} from '../controllers/bankAccountController.js';

const router = express.Router();

router.use(authenticateToken);

// Create bank account
router.post(
  '/',
  [
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('email').isEmail(),
    body('phone').notEmpty(),
    body('country').isLength({ min: 2, max: 2 }),
    body('currency').isLength({ min: 3, max: 3 }),
    body('accountNumber').notEmpty(),
    body('routingNumber').notEmpty(),
    body('address.line1').notEmpty(),
    body('address.city').notEmpty(),
    body('address.state').notEmpty(),
    body('address.postalCode').notEmpty(),
    body('dob.day').isInt({ min: 1, max: 31 }),
    body('dob.month').isInt({ min: 1, max: 12 }),
    body('dob.year').isInt({ min: 1900, max: new Date().getFullYear() - 18 })
  ],
  validateRequest,
  createBankAccount
);

// Get bank account details
router.get('/', getBankAccountDetails);

// Update bank account
router.put(
  '/',
  [
    body('external_account').optional(),
    body('business_profile').optional(),
    body('individual').optional()
  ],
  validateRequest,
  updateBankAccount
);

export const bankAccountRoutes = router;
