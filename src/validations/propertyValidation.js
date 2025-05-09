import { body, query } from 'express-validator';

export const initializePropertyRules = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Property type is required')
    .isIn([
      'A Studio Apartment',
      'House',
      'Apartment',
      'Room',
      'One Bedroom',
      'Two Bedroom',
      'Three Bedroom',
      'Shared Apartment',
      'Townhouse',
      'Duplex',
      'Condo',
      'Basement Apartment',
      'Penthouse',
      'Garden Flat',
      'Maisonette',
      'Cottage',
      'Bungalow',
      'Flat Share',
      'Student Housing'
    ])
    .withMessage('Invalid property type')
];

export const updatePropertySizeRules = [
  body('size')
    .isNumeric()
    .withMessage('Size must be a number')
    .custom(value => value > 0)
    .withMessage('Size must be greater than 0'),

  body('unit')
    .optional()
    .isIn(['sqft', 'sqm'])
    .withMessage('Invalid unit. Must be sqft or sqm'),

  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Dimensions must be an object')
];


export const propertyLocationRules = [
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 600 })
    .withMessage('Address must be between 5 and 600 characters'),
  
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required')
    .matches(/^\d+$/)
    .withMessage('Zip code must contain only numbers'),
  
  body('coordinates')
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object'),
  
  body('coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude value'),
  
  body('coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude value')
];

export const propertyPriceRules = [
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
];

export const updatePropertyDescriptionRules = [
  body('descrptionname')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),

  body('overview')
    .trim()
    .notEmpty()
    .withMessage('Overview is required')
    .isLength({ max: 2000 })
    .withMessage('Overview must be less than 2000 characters'),

  body('cancellationPolicy')
    .optional()
    .isIn(['flexible', 'moderate', 'strict'])
    .withMessage('Invalid cancellation policy')
];

export const propertyFeaturesRules = [
  body('rooms')
    .isObject()
    .withMessage('Rooms configuration is required'),
  body('rooms.bedroom')
    .isInt({ min: 0 })
    .withMessage('Invalid number of bedrooms'),
  body('rooms.bathroom')
    .isInt({ min: 0 })
    .withMessage('Invalid number of bathrooms'),
  body('rooms.balcony')
    .isInt({ min: 0 })
    .withMessage('Invalid number of balconys'),
  body('rooms.livingroom')
    .isInt({ min: 0 })
    .withMessage('Invalid number of livingrooms'),
  body('rooms.kitchen')
    .isInt({ min: 0 })
    .withMessage('Invalid number of kitchens'),
  body('amenities')
    .isArray()
    .withMessage('Amenities must be an array')
];

export const propertyQueryRules = [
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('type')
    .optional()
    .isIn([
      'A Studio Apartment',
      'House',
      'Apartment',
      'Room',
      'One Bedroom',
      'Two Bedroom',
      'Three Bedroom',
      'Shared Apartment',
      'Townhouse',
      'Duplex',
      'Condo',
      'Basement Apartment',
      'Penthouse',
      'Garden Flat',
      'Maisonette',
      'Cottage',
      'Bungalow',
      'Flat Share',
      'Student Housing'
    ])
    .withMessage('Invalid property type'),

  query('propertyStyle')
    .optional()
    .isIn([
      'Modern',
      'Traditional',
      'Contemporary',
      'Victorian',
      'Georgian',
      'Colonial',
      'Tudor',
      'Mediterranean',
      'Minimalist'
    ])
    .withMessage('Invalid property style'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number')
    .custom((value, { req }) => {
      if (req.query.minPrice && Number(value) <= Number(req.query.minPrice)) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    }),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price', 'type'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order')
];

export const propertySizeRules = [
  body('value')
    .notEmpty()
    .withMessage('Size value is required')
    .isFloat({ min: 0 })
    .withMessage('Size must be a positive number'),

  body('unit')
    .optional()
    .isIn(['sqft', 'sqm'])
    .withMessage('Invalid size unit'),

  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Dimensions must be an object'),

  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),

  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),

  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number')
];

export const propertyDescriptionRules = [
  body('descrptionname')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),

  body('overview')
    .trim()
    .notEmpty()
    .withMessage('Overview is required')
    .isLength({ max: 2000 })
    .withMessage('Overview must be less than 2000 characters'),

  body('cancellationPolicy')
    .optional()
    .isIn(['flexible', 'moderate', 'strict'])
    .withMessage('Invalid cancellation policy')
];

export const propertyAmenitiesRules = [
  body('amenities').isArray().withMessage('Amenities must be an array'),
  body('amenities.*').isString().withMessage('Each amenity must be a string')
];

export const propertyRulesRules = [
  body('rules').isArray().withMessage('Rules must be an array'),
  body('rules.*').isString().withMessage('Each rule must be a string')
];

export const propertyAvailabilityRules = [
  body('isAvailable').isBoolean().withMessage('Availability status must be boolean'),
  body('availableFrom').isISO8601().withMessage('Invalid available from date'),
  body('availableTo').isISO8601().withMessage('Invalid available to date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.availableFrom)) {
        throw new Error('Available to date must be after available from date');
      }
      return true;
    })
];

export const propertyPricingRules = [
  body('price').isNumeric().withMessage('Price must be a number')
    .custom(value => value >= 0).withMessage('Price cannot be negative'),
  body('depositAmount').optional().isNumeric().withMessage('Deposit amount must be a number')
    .custom(value => value >= 0).withMessage('Deposit amount cannot be negative'),
  body('utilities').optional().isObject().withMessage('Utilities must be an object'),
  body('utilities.included').optional().isBoolean().withMessage('Utilities included must be boolean'),
  body('utilities.estimated_cost').optional().isNumeric().withMessage('Estimated utility cost must be a number')
];

export const validateLandlordProfile = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s-]+$/)
    .withMessage('Invalid phone number format'),
  
  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  
  body('city')
    .notEmpty()
    .withMessage('City is required'),
  
  body('state')
    .notEmpty()
    .withMessage('State is required'),
  
  body('zipCode')
    .notEmpty()
    .withMessage('Zip code is required')
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Invalid zip code format'),
  
  body('businessLicense')
    .optional()
    .trim(),
  
  body('taxId')
    .optional()
    .trim(),
  
  body('propertyTypes')
    .isArray()
    .withMessage('Property types must be an array')
    .notEmpty()
    .withMessage('At least one property type is required'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
];