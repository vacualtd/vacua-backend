import Stripe from 'stripe';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export const createConnectedAccount = async (userId, accountDetails) => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: accountDetails.country,
      email: accountDetails.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'individual',
      business_profile: {
        url: accountDetails.website || process.env.FRONTEND_URL
      },
      metadata: {
        userId,
        platform: 'vacua'
      }
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/stripe/return`,
      type: 'account_onboarding'
    });

    return {
      accountId: account.id,
      accountLink: accountLink.url,
      requirements: account.requirements,
      payoutsEnabled: account.payouts_enabled
    };
  } catch (error) {
    Logger.error('Failed to create Stripe Connect account', { error: error.message });
    throw new ApiError(500, error.message);
  }
};
