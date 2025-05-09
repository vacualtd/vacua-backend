import { Payment } from '../models/Payment.js';
import { Property } from '../models/Property.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { Logger } from '../utils/logger.js';
import Stripe from 'stripe';
import paypal from '@paypal/paypal-js';
import paypalCheckout from '@paypal/checkout-server-sdk';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PayPal configuration
const paypalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
};

// Initialize PayPal
const initializePayPal = async () => {
  try {
    return await paypal.loadScript({ 
      'client-id': paypalConfig.clientId,
      'data-namespace': 'paypal_sdk'
    });
  } catch (error) {
    Logger.error('PayPal initialization failed', { error: error.message });
    throw new ApiError(500, 'Failed to initialize PayPal');
  }
};

// Create Stripe Connect account
export const createStripeConnectAccount = async (userId, businessData) => {
  try {
    const account = await stripe.accounts.create({
      type: 'custom',
      country: businessData.country,
      email: businessData.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: '5734', // Computer Software Stores
        url: businessData.website
      },
      individual: {
        first_name: businessData.firstName,
        last_name: businessData.lastName,
        email: businessData.email,
        phone: businessData.phone,
        address: {
          line1: businessData.address.line1,
          city: businessData.address.city,
          state: businessData.address.state,
          postal_code: businessData.address.postalCode,
          country: businessData.country
        },
        dob: {
          day: businessData.dob.day,
          month: businessData.dob.month,
          year: businessData.dob.year
        }
      }
    });

    // Create account link for verification
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/stripe/return`,
      type: 'account_onboarding',
    });

    return {
      accountId: account.id,
      accountLink: accountLink.url
    };
  } catch (error) {
    Logger.error('Stripe account creation failed', { error: error.message });
    throw new ApiError(500, 'Failed to create Stripe account');
  }
};

// Create PayPal merchant account
export const createPayPalMerchantAccount = async (businessData) => {
  try {
    const paypalSDK = await initializePayPal();
    
    const response = await fetch('https://api-m.sandbox.paypal.com/v1/customer/partner-referrals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        operations: [{
          operation: "API_INTEGRATION",
          api_integration_preference: {
            rest_api_integration: {
              integration_method: "PAYPAL",
              integration_type: "THIRD_PARTY"
            }
          }
        }],
        products: ["EXPRESS_CHECKOUT"],
        legal_consents: [{
          type: "SHARE_DATA_CONSENT",
          granted: true
        }],
        business_entity: {
          business_type: {
            type: "INDIVIDUAL",
            subtype: "SOLE_PROPRIETORSHIP"
          },
          business_industry: {
            category: "1000",
            subcategory: "1001"
          },
          business_incorporation: {
            incorporation_country_code: businessData.country
          },
          names: [{
            type: "LEGAL_NAME",
            name: `${businessData.firstName} ${businessData.lastName}`
          }],
          emails: [{
            type: "CUSTOMER_SERVICE",
            email: businessData.email
          }],
          addresses: [{
            type: "WORK",
            line1: businessData.address.line1,
            city: businessData.address.city,
            state: businessData.address.state,
            postal_code: businessData.address.postalCode,
            country_code: businessData.country
          }],
          phones: [{
            type: "CUSTOMER_SERVICE",
            country_code: "1",
            number: businessData.phone.replace(/\D/g, '')
          }],
          website: businessData.website
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create PayPal merchant account');
    }

    return {
      merchantId: result.merchant_id,
      accountStatus: result.status,
      links: result.links
    };
  } catch (error) {
    Logger.error('PayPal account creation failed', { error: error.message });
    throw new ApiError(500, 'Failed to create PayPal account');
  }
};

// Create PayPal payment
export const createPayPalPayment = async (amount, currency, description) => {
  try {
    const paypalSDK = await initializePayPal();
    
    const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toString()
          },
          description
        }]
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create PayPal payment');
    }

    return result;
  } catch (error) {
    Logger.error('PayPal payment creation failed', { error: error.message });
    throw new ApiError(500, 'Failed to create PayPal payment');
  }
};

// Capture PayPal payment
export const capturePayPalPayment = async (orderId) => {
  try {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    const response = await paypalHttpClient.execute(request);
    return response.result;
  } catch (error) {
    Logger.error('PayPal payment capture failed', { error: error.message });
    throw new ApiError(500, 'Failed to capture PayPal payment');
  }
};

// Get Stripe account balance
export const getStripeBalance = async (accountId) => {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId
    });
    return balance;
  } catch (error) {
    Logger.error('Failed to get Stripe balance', { error: error.message });
    throw new ApiError(500, 'Failed to get account balance');
  }
};

// Transfer funds to connected account
export const transferFunds = async (amount, currency, destinationAccountId) => {
  try {
    const transfer = await stripe.transfers.create({
      amount,
      currency,
      destination: destinationAccountId
    });
    return transfer;
  } catch (error) {
    Logger.error('Fund transfer failed', { error: error.message });
    throw new ApiError(500, 'Failed to transfer funds');
  }
};

export const createPaymentIntent = async ({
  userId,
  type,
  itemId,
  itemType,
  paymentMethod,
  metadata = {}
}) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Get item details based on type
    let amount, item;
    switch (itemType) {
      case 'Property':
        item = await Property.findById(itemId);
        amount = type === 'property_rent' ? item.price : item.salePrice;
        break;
      case 'Product':
        item = await Product.findById(itemId);
        amount = item.price * (metadata.marketplaceDetails?.quantity || 1);
        break;
      default:
        throw new ApiError(400, 'Invalid item type');
    }

    if (!item) {
      throw new ApiError(404, 'Item not found');
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      payment_method_types: [paymentMethod],
      metadata: {
        userId,
        itemId,
        type
      }
    });

    // Create payment record
    const payment = await Payment.create([{
      userId,
      type,
      itemId,
      itemType,
      amount,
      paymentMethod,
      status: 'pending',
      transactionId: paymentIntent.id,
      metadata
    }], { session });

    await session.commitTransaction();

    return {
      paymentIntent: paymentIntent.client_secret,
      payment: payment[0]
    };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    Logger.error('Payment creation failed', { error: error.message });
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const handlePaymentWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
    }
  } catch (error) {
    Logger.error('Webhook handling failed', { error: error.message });
    throw error;
  }
};

const handleSuccessfulPayment = async (paymentIntent) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const payment = await Payment.findOne({ 
      transactionId: paymentIntent.id 
    }).session(session);

    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    payment.status = 'completed';
    payment.paymentDetails = {
      cardLast4: paymentIntent.payment_method_details?.card?.last4,
      bankName: paymentIntent.payment_method_details?.bank?.bank_name
    };

    // Update item status based on payment type
    switch (payment.itemType) {
      case 'Property':
        await handlePropertyPayment(payment, session);
        break;
      case 'Product':
        await handleProductPayment(payment, session);
        break;
    }

    await payment.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// PayPal client configuration
function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.NODE_ENV === 'production'
    ? new paypalCheckout.core.LiveEnvironment(clientId, clientSecret)
    : new paypalCheckout.core.SandboxEnvironment(clientId, clientSecret);
  
  return new paypalCheckout.core.PayPalHttpClient(environment);
}

export const createPayPalOrder = async ({ userId, itemId, itemType, currency }) => {
  try {
    // Get item details based on type
    let item;
    if (itemType === 'Property') {
      item = await Property.findById(itemId);
      if (!item) throw new ApiError(404, 'Property not found');
    } else if (itemType === 'Product') {
      item = await Product.findById(itemId);
      if (!item) throw new ApiError(404, 'Product not found');
    } else {
      throw new ApiError(400, 'Invalid item type');
    }

    // Get access token first
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const { access_token } = await tokenResponse.json();

    // Create order
    const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: itemId,
          description: `Payment for ${itemType}: ${item.name || item.type}`,
          amount: {
            currency_code: currency,
            value: item.price.toString(),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: item.price.toString()
              }
            }
          },
          items: [{
            name: item.name || item.type,
            unit_amount: {
              currency_code: currency,
              value: item.price.toString()
            },
            quantity: '1'
          }]
        }],
        application_context: {
          brand_name: 'Vacua',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      Logger.error('PayPal API error', { error: errorData });
      throw new ApiError(response.status, 'Failed to create PayPal order');
    }

    const order = await response.json();

    // Create payment record in our database
    await Payment.create({
      userId,
      type: 'order',
      itemId,
      itemType,
      amount: item.price,
      currency,
      paymentMethod: 'paypal',
      status: 'pending',
      transactionId: order.id,
      metadata: {
        paypalOrderId: order.id
      }
    });

    return {
      id: order.id,
      status: order.status,
      links: order.links
    };
  } catch (error) {
    Logger.error('PayPal order creation failed', { error: error.message });
    throw error;
  }
};

export const getPayPalOrder = async (orderId, userId) => {
  try {
    // First check if we have this order in our database
    const payment = await Payment.findOne({
      'metadata.paypalOrderId': orderId,
      userId
    });

    if (!payment) {
      throw new ApiError(404, 'Order not found');
    }

    // Get access token
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const { access_token } = await tokenResponse.json();

    // Get order details from PayPal
    const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      Logger.error('PayPal API error', { error: errorData });
      throw new ApiError(response.status, 'Failed to get PayPal order');
    }

    const paypalOrder = await response.json();

    // Combine PayPal data with our database record
    return {
      orderId: paypalOrder.id,
      status: paypalOrder.status,
      intent: paypalOrder.intent,
      paymentSource: paypalOrder.payment_source,
      purchaseUnits: paypalOrder.purchase_units,
      createTime: paypalOrder.create_time,
      updateTime: paypalOrder.update_time,
      links: paypalOrder.links,
      // Our database info
      paymentId: payment._id,
      itemType: payment.itemType,
      itemId: payment.itemId,
      amount: payment.amount,
      currency: payment.currency,
      paymentStatus: payment.status
    };
  } catch (error) {
    Logger.error('Failed to get PayPal order', { error: error.message });
    throw error;
  }
};

export const confirmPayPalPaymentSource = async (orderId, userId, cardDetails) => {
  try {
    // First check if we have this order in our database
    const payment = await Payment.findOne({
      'metadata.paypalOrderId': orderId,
      userId
    });

    if (!payment) {
      throw new ApiError(404, 'Order not found');
    }

    // Get access token
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const { access_token } = await tokenResponse.json();

    // Confirm payment source with PayPal
    const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/confirm-payment-source`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_source: {
          card: {
            number: cardDetails.number,
            expiry: cardDetails.expiry
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      Logger.error('PayPal API error', { error: errorData });
      throw new ApiError(response.status, 'Failed to confirm payment source');
    }

    const paypalOrder = await response.json();

    // Update payment record
    payment.metadata.set('paymentSource', {
      cardLast4: cardDetails.number.slice(-4),
      expiry: cardDetails.expiry
    });
    await payment.save();

    return {
      orderId: paypalOrder.id,
      status: paypalOrder.status,
      links: paypalOrder.links
    };
  } catch (error) {
    Logger.error('Failed to confirm payment source', { error: error.message });
    throw error;
  }
}; 