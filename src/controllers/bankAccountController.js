import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import * as stripeService from '../services/stripeService.js';
import { User } from '../models/User.js';

export const createBankAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const accountDetails = {
      ...req.body,
      ipAddress: req.ip
    };

    // Create Stripe Connect account
    const stripeAccount = await stripeService.createConnectAccount(userId, accountDetails);

    // Update user with Stripe account ID
    await User.findByIdAndUpdate(userId, {
      'paymentDetails.stripeAccountId': stripeAccount.id,
      'paymentDetails.hasConnectedAccount': true
    });

    res.json({
      success: true,
      message: 'Bank account created successfully',
      data: {
        accountId: stripeAccount.id,
        status: stripeAccount.payouts_enabled ? 'active' : 'pending',
        requirements: stripeAccount.requirements
      }
    });
  } catch (error) {
    Logger.error('Bank account creation failed', {
      error: error.message,
      userId: req.user?.id
    });
    next(error);
  }
};

export const getBankAccountDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.paymentDetails?.stripeAccountId) {
      throw new ApiError(404, 'No bank account found');
    }

    const account = await stripeService.retrieveConnectAccount(
      user.paymentDetails.stripeAccountId
    );

    res.json({
      success: true,
      data: {
        accountId: account.id,
        status: account.payouts_enabled ? 'active' : 'pending',
        requirements: account.requirements,
        payoutSchedule: account.settings?.payouts?.schedule,
        defaultCurrency: account.default_currency,
        capabilities: account.capabilities
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateBankAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.paymentDetails?.stripeAccountId) {
      throw new ApiError(404, 'No bank account found');
    }

    const updatedAccount = await stripeService.updateConnectAccount(
      user.paymentDetails.stripeAccountId,
      req.body
    );

    res.json({
      success: true,
      message: 'Bank account updated successfully',
      data: {
        accountId: updatedAccount.id,
        status: updatedAccount.payouts_enabled ? 'active' : 'pending',
        requirements: updatedAccount.requirements
      }
    });
  } catch (error) {
    next(error);
  }
};
