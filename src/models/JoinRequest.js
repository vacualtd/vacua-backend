import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const joinRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    maxLength: 500
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser'
  },
  reviewedAt: Date,
  reviewNote: String
}, {
  timestamps: true
});

// Add compound index to prevent duplicate requests
joinRequestSchema.index({ userId: 1, communityId: 1 }, { unique: true });

joinRequestSchema.plugin(mongoosePaginate);

export const JoinRequest = mongoose.model('JoinRequest', joinRequestSchema);