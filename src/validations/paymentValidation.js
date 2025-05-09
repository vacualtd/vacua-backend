import { body } from 'express-validator';

export const accountCreationRules = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('address.line1').notEmpty().withMessage('Address line 1 is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.postalCode').notEmpty().withMessage('Postal code is required'),
  body('dob.day').isInt({ min: 1, max: 31 }).withMessage('Valid day is required'),
  body('dob.month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required'),
  body('dob.year').isInt({ min: 1900 }).withMessage('Valid year is required')
];

export const paymentIntentRules = [
  body('type').notEmpty().withMessage('Payment type is required'),
  body('itemId').notEmpty().withMessage('Item ID is required'),
  body('itemType').isIn(['Property', 'Product']).withMessage('Valid item type is required'),
  body('paymentMethod').isIn(['card', 'paypal']).withMessage('Valid payment method is required')
];

export const transferFundsRules = [
  body('amount').isNumeric().withMessage('Valid amount is required'),
  body('currency').isIn(['usd', 'eur', 'gbp']).withMessage('Valid currency is required'),
  body('destination').notEmpty().withMessage('Destination account is required')
];

export const paypalOrderRules = [
  body('itemId')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('itemType')
    .isIn(['Property', 'Product'])
    .withMessage('Valid item type is required'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP'])
    .withMessage('Valid currency code is required')
];

export const paypalPaymentSourceRules = [
  body('number')
    .matches(/^\d{16}$/)
    .withMessage('Valid card number is required'),
  body('expiry')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Valid expiry date is required (YYYY-MM format)')
]; 