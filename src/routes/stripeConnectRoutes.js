import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createStripeAccount, getAccountStatus, handleStripeWebhook } from '../controllers/stripeConnectController.js';

const router = express.Router();

/**
 * @swagger
 * /api/stripe/accounts:
 *   post:
 *     tags:
 *       - Stripe Connect
 *     summary: Create a Stripe Connect account
 *     description: Creates a new Stripe Connect account for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Stripe account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accountId:
 *                       type: string
 *                     accountLink:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/accounts', authenticateToken, createStripeAccount);

/**
 * @swagger
 * /api/stripe/accounts/{accountId}/status:
 *   get:
 *     tags:
 *       - Stripe Connect
 *     summary: Get Stripe account status
 *     description: Retrieves the status of a Stripe Connect account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe account ID
 *     responses:
 *       200:
 *         description: Account status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [pending, active, inactive]
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 */
router.get('/accounts/:accountId/status', authenticateToken, getAccountStatus);

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     tags:
 *       - Stripe Connect
 *     summary: Handle Stripe webhooks
 *     description: Endpoint for Stripe to send webhook events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook payload
 *       500:
 *         description: Server error
 */
router.post('/webhook', handleStripeWebhook);

export default router;
