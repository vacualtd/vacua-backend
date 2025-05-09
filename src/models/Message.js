import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  content: String,
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'mixed', 'system'],
    default: 'text'
  },
  metadata: {
    hasAttachments: {
      type: Boolean,
      default: false
    },
    attachmentCount: {
      type: Number,
      default: 0
    },
    attachments: [{
      url: String,
      type: String,
      name: String,
      size: Number,
      mimeType: String,
      thumbnailUrl: String
    }]
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser'
    },
    readAt: Date
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.plugin(mongoosePaginate);

// Indexes
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.userId': 1 });
messageSchema.index({ content: 'text' });

export const Message = mongoose.model('Message', messageSchema);