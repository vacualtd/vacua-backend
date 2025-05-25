import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as stripeConnectService from '../services/stripeConnectService.js';
import { User } from '../models/User.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createStripeAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const accountDetails = req.body;

    const stripeAccount = await stripeConnectService.createConnectedAccount(userId, accountDetails);

    // Update user with Stripe account ID
    await User.findByIdAndUpdate(userId, {
      'paymentDetails.stripeAccountId': stripeAccount.accountId,
      'paymentDetails.hasConnectedAccount': true
    });

    res.json({
      success: true,
      message: 'Stripe Connect account created successfully',
      data: stripeAccount
    });
  } catch (error) {
    Logger.error('Failed to create Stripe Connect account', { error: error.message });
    next(error);
  }
};

export const getAccountStatus = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const account = await stripe.accounts.retrieve(accountId);

    res.json({
      success: true,
      data: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements
      }
    });
  } catch (error) {
    next(error);
  }
};

export const handleStripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdate(event.data.object);
        break;
      // Add more webhook handlers as needed
    }

    res.json({ received: true });
  } catch (error) {
    Logger.error('Webhook handling failed', { error: error.message });
    next(error);
  }
};
