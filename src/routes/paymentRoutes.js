import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { 
  createStripeAccount,
  createPayPalAccount,
  createPayment,
  handleStripeWebhook,
  getPaymentHistory,
  getPaymentDetails,
  transferFunds,
  getAccountBalance,
  createPayPalOrder,
  getPayPalOrder,
  confirmPayPalPaymentSource
} from '../controllers/paymentController.js';
import { 
  paymentIntentRules,
  accountCreationRules,
  transferFundsRules,
  paypalOrderRules,
  paypalPaymentSourceRules
} from '../validations/paymentValidation.js';

const router = express.Router();

/**
 * @route POST /api/payments/stripe/account
 * @desc Create a Stripe Connect account for a landlord
 * @access Private
 */
router.post(
  '/stripe/account',
  authenticateToken,
  accountCreationRules,
  validateRequest,
  createStripeAccount
);

/**
 * @route POST /api/payments/paypal/account
 * @desc Create a PayPal merchant account
 * @access Private
 */
router.post(
  '/paypal/account',
  authenticateToken,
  accountCreationRules,
  validateRequest,
  createPayPalAccount
);

/**
 * @route POST /api/payments/create-intent
 * @desc Create a payment intent for property/product
 * @access Private
 */
router.post(
  '/create-intent',
  authenticateToken,
  paymentIntentRules,
  validateRequest,
  createPayment
);

/**
 * @route POST /api/payments/webhook
 * @desc Handle Stripe webhook events
 * @access Public
 */
router.post('/webhook', handleStripeWebhook);

/**
 * @route GET /api/payments/history
 * @desc Get user's payment history
 * @access Private
 */
router.get('/history', authenticateToken, getPaymentHistory);

/**
 * @route GET /api/payments/:paymentId
 * @desc Get specific payment details
 * @access Private
 */
router.get('/:paymentId', authenticateToken, getPaymentDetails);

/**
 * @route POST /api/payments/transfer
 * @desc Transfer funds to connected account
 * @access Private
 */
router.post(
  '/transfer',
  authenticateToken,
  transferFundsRules,
  validateRequest,
  transferFunds
);

/**
 * @route GET /api/payments/balance
 * @desc Get account balance
 * @access Private
 */
router.get('/balance', authenticateToken, getAccountBalance);

/**
 * @route POST /api/payments/paypal/create-order
 * @desc Create a PayPal order
 * @access Private
 */
router.post(
  '/paypal/create-order',
  authenticateToken,
  paypalOrderRules,
  validateRequest,
  createPayPalOrder
);

/**
 * @route GET /api/payments/paypal/orders/:orderId
 * @desc Get PayPal order details by ID
 * @access Private
 */
router.get(
  '/paypal/orders/:orderId',
  authenticateToken,
  getPayPalOrder
);

/**
 * @route POST /api/payments/paypal/orders/:orderId/confirm-payment-source
 * @desc Confirm payment source for PayPal order
 * @access Private
 */
router.post(
  '/paypal/orders/:orderId/confirm-payment-source',
  authenticateToken,
  paypalPaymentSourceRules,
  validateRequest,
  confirmPayPalPaymentSource
);

export const paymentRoutes = router; 
