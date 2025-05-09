import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: [true, 'User ID is required'],
    index: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: [true, 'Property ID is required']
  },
  notes: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  notifications: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'removed'],
    default: 'active'
  },
  metadata: {
    addedFromPage: String,
    lastViewed: Date,
    viewCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Add compound index for unique user-property pairs
wishlistSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

// Add pre-save middleware to ensure IDs are ObjectIds
wishlistSchema.pre('save', function(next) {
  if (this.userId && typeof this.userId === 'string') {
    this.userId = new mongoose.Types.ObjectId(this.userId);
  }
  if (this.propertyId && typeof this.propertyId === 'string') {
    this.propertyId = new mongoose.Types.ObjectId(this.propertyId);
  }
  next();
});

// Add pagination plugin
wishlistSchema.plugin(mongoosePaginate);

export const Wishlist = mongoose.model('VWishlist', wishlistSchema);