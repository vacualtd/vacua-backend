import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const callSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser',
      required: true
    },
    joinedAt: Date,
    leftAt: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'missed'],
      default: 'pending'
    }
  }],
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: Number,
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'missed', 'failed'],
    default: 'ongoing'
  },
  metadata: {
    quality: String,
    network: String,
    devices: Object
  }
}, {
  timestamps: true
});

callSchema.plugin(mongoosePaginate);

// Indexes
callSchema.index({ initiator: 1, startTime: -1 });
callSchema.index({ 'participants.userId': 1 });
callSchema.index({ status: 1 });

export const Call = mongoose.model('VCall', callSchema);