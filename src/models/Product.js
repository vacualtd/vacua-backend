import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    required: true,
    enum: ['product', 'service', 'giveaway']
  },
  category: {
    type: String,
    enum: [
      'furniture',
      'electronics',
      'books',
      'clothing',
      'kitchenware',
      'sports',
      'other'
    ],
    default: 'other'
  },
  condition: {
    type: String,
    enum: ['new', 'like-new', 'good', 'fair', 'poor'],
    default: 'good'
  },
  images: [{
    url: String,
    key: String
  }],
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'deleted'],
    default: 'active'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    soldAt: Date
  }
}, {
  timestamps: true
});

// Add pagination plugin
productSchema.plugin(mongoosePaginate);

// Add indexes
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ status: 1 });
productSchema.index({ userId: 1 });
productSchema.index({ type: 1 });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

export const Product = mongoose.model('Product', productSchema);