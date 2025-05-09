import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'itemType',
    required: true
  },
  itemType: {
    type: String,
    enum: ['Property', 'Product'],
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  images: [{
    url: String,
    key: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser'
  }],
  reported: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser'
    },
    reason: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
reviewSchema.index({ itemId: 1, itemType: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ status: 1 });

export const Review = mongoose.model('Review', reviewSchema);