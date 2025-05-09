import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  type: {
    type: String,
    enum: [
      'recommendation',
      'related_item',
      'price_alert',
      'similar_listing',
      'view_history',
      'interaction'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: String,
  data: {
    itemId: mongoose.Schema.Types.ObjectId,
    itemType: {
      type: String,
      enum: ['product', 'property']
    },
    metadata: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  expiresAt: Date
}, {
  timestamps: true
});

notificationSchema.plugin(mongoosePaginate);

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.model('Notification', notificationSchema); 