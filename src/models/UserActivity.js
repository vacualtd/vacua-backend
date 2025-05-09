import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  activityType: {
    type: String,
    enum: ['login', 'view_property', 'inquiry', 'booking', 'message'],
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

userActivitySchema.index({ userId: 1, createdAt: -1 });
userActivitySchema.index({ activityType: 1 });

export const UserActivity = mongoose.model('UserActivity', userActivitySchema); 