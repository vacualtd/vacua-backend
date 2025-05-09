import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const inquirySchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'responded', 'closed'],
    default: 'pending'
  },
  hasResponse: {
    type: Boolean,
    default: false
  },
  responseTime: Number, // Time taken to respond in milliseconds
  response: {
    message: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser'
    }
  }
}, {
  timestamps: true
});

inquirySchema.plugin(mongoosePaginate);

export const Inquiry = mongoose.model('Inquiry', inquirySchema); 