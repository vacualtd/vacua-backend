import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as paymentService from '../services/paymentService.js';

export const createStripeAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessData = req.body;

    const account = await paymentService.createStripeConnectAccount(userId, businessData);

    res.json({
      success: true,
      message: 'Stripe account created successfully',
      data: account
    });
  } catch (error) {
    Logger.error('Failed to create Stripe account', { error: error.message });
    next(error);
  }
};

export const createPayPalAccount = async (req, res, next) => {
  try {
    const businessData = req.body;

    const account = await paymentService.createPayPalMerchantAccount(businessData);

    res.json({
      success: true,
      message: 'PayPal account created successfully',
      data: account
    });
  } catch (error) {
    Logger.error('Failed to create PayPal account', { error: error.message });
    next(error);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, itemId, itemType, paymentMethod, metadata } = req.body;

    const payment = await paymentService.createPaymentIntent({
      userId,
      type,
      itemId,
      itemType,
      paymentMethod,
      metadata
    });

    res.json({
      success: true,
      message: 'Payment intent created successfully',
      data: payment
    });
  } catch (error) {
    Logger.error('Failed to create payment', { error: error.message });
    next(error);
  }
};

export const handleStripeWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    await paymentService.handlePaymentWebhook(event);

    res.json({ received: true });
  } catch (error) {
    Logger.error('Webhook handling failed', { error: error.message });
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const payments = await Payment.paginate(
      { userId, ...(status && { status }) },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
      }
    );

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    Logger.error('Failed to fetch payment history', { error: error.message });
    next(error);
  }
};

export const getPaymentDetails = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({ _id: paymentId, userId });
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    Logger.error('Failed to fetch payment details', { error: error.message });
    next(error);
  }
};

export const transferFunds = async (req, res, next) => {
  try {
    const { amount, currency, destination } = req.body;

    const transfer = await paymentService.transferFunds({
      amount,
      currency,
      destination
    });

    res.json({
      success: true,
      message: 'Funds transferred successfully',
      data: transfer
    });
  } catch (error) {
    Logger.error('Failed to transfer funds', { error: error.message });
    next(error);
  }
};

export const getAccountBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const balance = await stripe.balance.retrieve({
      stripeAccount: userId
    });

    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    Logger.error('Failed to fetch balance', { error: error.message });
    next(error);
  }
};

export const createPayPalOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId, itemType, currency = 'USD' } = req.body;

    const order = await paymentService.createPayPalOrder({
      userId,
      itemId,
      itemType,
      currency
    });

    Logger.info('PayPal order created', { orderId: order.id });

    res.json({
      success: true,
      message: 'PayPal order created successfully',
      data: {
        orderId: order.id,
        approvalUrl: order.links.find(link => link.rel === 'approve').href
      }
    });
  } catch (error) {
    Logger.error('Failed to create PayPal order', { error: error.message });
    next(error);
  }
};

export const getPayPalOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await paymentService.getPayPalOrder(orderId, userId);

    res.json({
      success: true,
      message: 'PayPal order retrieved successfully',
      data: order
    });
  } catch (error) {
    Logger.error('Failed to get PayPal order', { error: error.message });
    next(error);
  }
};

export const confirmPayPalPaymentSource = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const { number, expiry } = req.body;

    const order = await paymentService.confirmPayPalPaymentSource(orderId, userId, {
      number,
      expiry
    });

    res.json({
      success: true,
      message: 'Payment source confirmed successfully',
      data: order
    });
  } catch (error) {
    Logger.error('Failed to confirm payment source', { error: error.message });
    next(error);
  }
}; 