import { body, query } from 'express-validator';

export const addToWishlistRules = [
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes must be less than 500 characters'),

    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Invalid priority level'),

    body('notifications')
        .optional()
        .isObject()
        .withMessage('Invalid notifications format'),

    body('notifications.priceChange')
        .optional()
        .isBoolean()
        .withMessage('Price change notification must be a boolean'),

    body('notifications.availability')
        .optional()
        .isBoolean()
        .withMessage('Availability notification must be a boolean'),

    body('addedFromPage')
        .optional()
        .trim()
        .isString()
        .withMessage('Invalid page reference')
];

export const updateWishlistRules = [
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes must be less than 500 characters'),

    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Invalid priority level'),

    body('status')
        .optional()
        .isIn(['active', 'archived'])
        .withMessage('Invalid status'),

    body('notifications')
        .optional()
        .isObject()
        .withMessage('Invalid notifications format'),

    body('notifications.priceChange')
        .optional()
        .isBoolean()
        .withMessage('Price change notification must be a boolean'),

    body('notifications.availability')
        .optional()
        .isBoolean()
        .withMessage('Availability notification must be a boolean')
];