import Stripe from 'stripe';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';

// Initialize Stripe with platform account
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  stripeAccount: process.env.STRIPE_PLATFORM_ACCOUNT
});

export const createConnectAccount = async (userId, accountDetails) => {
  try {
    // Ensure required environment variables
    if (!process.env.STRIPE_CONNECT_CLIENT_ID || !process.env.STRIPE_PLATFORM_ACCOUNT) {
      throw new Error('Stripe Connect configuration is missing');
    }

    // Create account token first
    const accountToken = await stripe.tokens.create({
      account: {
        individual: {
          first_name: accountDetails.firstName,
          last_name: accountDetails.lastName,
          email: accountDetails.email,
          phone: accountDetails.phone,
          address: {
            line1: accountDetails.address.line1,
            city: accountDetails.address.city,
            postal_code: accountDetails.address.postalCode,
            state: accountDetails.address.state,
            country: accountDetails.country
          },
          dob: {
            day: parseInt(accountDetails.dob.day),
            month: parseInt(accountDetails.dob.month),
            year: parseInt(accountDetails.dob.year)
          }
        },
        business_type: 'individual',
        tos_shown_and_accepted: true
      }
    });

    // Create the Connect account
    const account = await stripe.accounts.create({
      type: 'custom',
      country: accountDetails.country,
      email: accountDetails.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      account_token: accountToken.id,
      external_account: {
        object: 'bank_account',
        country: accountDetails.country,
        currency: accountDetails.currency?.toLowerCase() || 'usd',
        account_number: accountDetails.accountNumber,
        routing_number: accountDetails.routingNumber || null,
        account_holder_name: `${accountDetails.firstName} ${accountDetails.lastName}`,
        account_holder_type: 'individual'
      },
      metadata: {
        userId: userId,
        platform: 'vacua'
      }
    });

    // Create account link for verification
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/stripe/return`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });

    Logger.info('Stripe Connect account created', {
      userId,
      stripeAccountId: account.id
    });

    return {
      accountId: account.id,
      accountLink: accountLink.url,
      requirements: account.requirements,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted
    };

  } catch (error) {
    Logger.error('Failed to create Stripe Connect account', {
      error: error.message,
      userId
    });
    throw new ApiError(500, error.message);
  }
};

export const retrieveConnectAccount = async (accountId) => {
  try {
    return await stripe.accounts.retrieve(accountId);
  } catch (error) {
    Logger.error('Failed to retrieve Stripe Connect account', {
      error: error.message,
      accountId
    });
    throw new ApiError(500, 'Failed to retrieve bank account details');
  }
};

export const updateConnectAccount = async (accountId, updateData) => {
  try {
    return await stripe.accounts.update(accountId, updateData);
  } catch (error) {
    Logger.error('Failed to update Stripe Connect account', {
      error: error.message,
      accountId
    });
    throw new ApiError(500, 'Failed to update bank account details');
  }
};
