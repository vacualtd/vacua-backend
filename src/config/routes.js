import express from 'express';
import { loginRoutes } from '../routes/loginRoutes.js';
import { profileRoutes } from '../routes/profileRoutes.js';
import { marketplaceRoutes } from '../routes/marketplaceRoutes.js';
import { userRoutes } from '../routes/userRoutes.js';
import { propertyRoutes } from '../routes/propertyRoutes.js';
import chatRoutes from '../routes/chatRoutes.js';
import { communityRoutes } from '../routes/communityRoutes.js';
import { callRoutes } from '../routes/callRoutes.js';
import { adminRoutes } from '../routes/adminRoutes.js';
import { paymentRoutes } from '../routes/paymentRoutes.js';
import { authRoutes } from '../routes/authRoutes.js';
import { landlordVerificationRoutes } from '../routes/landlordVerificationRoutes.js';
import { verificationRoutes } from '../routes/verificationRoutes.js';
import sharedBedRoutes from '../routes/sharedBedRoutes.js';
import { bankAccountRoutes } from '../routes/bankAccountRoutes.js';
import stripeConnectRoutes from '../routes/stripeConnectRoutes.js';

const router = express.Router();

// Add login routes
router.use('/login', loginRoutes);

// API Routes
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/user', userRoutes);
router.use('/payment', paymentRoutes);
router.use('/property', propertyRoutes);
router.use('/chat', chatRoutes);
router.use('/community', communityRoutes);
router.use('/call', callRoutes);
router.use('/admin', adminRoutes);
router.use('/landlord-verification', landlordVerificationRoutes);
router.use('/verification', verificationRoutes);
router.use('/shared-beds', sharedBedRoutes);
router.use('/bank-account', bankAccountRoutes);
router.use('/stripe', stripeConnectRoutes); // Add Stripe Connect routes

export default router;

