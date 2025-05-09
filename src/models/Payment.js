import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  type: {
    type: String,
    enum: ['order', 'subscription', 'deposit', 'rent', 'service'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType'
  },
  itemType: {
    type: String,
    required: true,
    enum: ['Property', 'Product']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'GBP']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'paypal', 'bank_transfer', 'stripe']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  paymentDetails: {
    cardLast4: String,
    bankName: String,
    paypalEmail: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  refundReason: String,
  refundedAt: Date
}, {
  timestamps: true
});

paymentSchema.plugin(mongoosePaginate);

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });

export const Payment = mongoose.model('Payment', paymentSchema); 