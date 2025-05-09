import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group', 'community'], // Add 'community' type
    required: true
  },
  name: {
    type: String,
    required: function() {
      return this.type === 'community' || this.type === 'group';
    }
  },
  description: {
    type: String,
    required: function() {
      return this.type === 'community';
    }
  },
  avatar: {
    url: String,
    key: String
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true // Ensure this is required
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser'
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'mixed', 'system'],
      default: 'text'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    muted: {
      type: Boolean,
      default: false
    },
    encrypted: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    memberCount: {
      type: Number,
      default: 0
    },
    messageCount: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    statusUpdatedAt: Date,
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser'
    },
    statusReason: String,
    createdByAdmin: {
      type: Boolean,
      default: false
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    guidelines: {
      type: String,
      maxLength: 2000
    },
    settings: {
      whoCanPost: {
        type: String,
        enum: ['all', 'moderators', 'admin'],
        default: 'all'
      },
      requireApproval: {
        type: Boolean,
        default: false
      },
      isPublic: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ 'members.userId': 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ name: 'text', description: 'text' });
chatSchema.index({ status: 1 });
chatSchema.index({ isActive: 1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ 'metadata.lastActivity': -1 });

// Add pagination plugin
chatSchema.plugin(mongoosePaginate);

// Virtual for unread count
chatSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(msg => 
    !msg.readBy.includes(this.members[0].userId)
  ).length;
});

// Method to check if user is member
chatSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.userId.toString() === userId.toString());
};

// Method to add message
chatSchema.methods.addMessage = async function(messageData) {
  const message = await mongoose.model('Message').create({
    ...messageData,
    chatId: this._id
  });
  
  this.messages.push(message._id);
  this.metadata.messageCount += 1;
  this.lastMessage = {
    content: message.content,
    sender: message.sender,
    timestamp: message.createdAt,
    type: message.type
  };
  this.metadata.lastActivity = new Date();
  
  await this.save();
  return message;
};

// Add a static method to create or get private chat
chatSchema.statics.createOrGetPrivateChat = async function(initiatorId, recipientId) {
  try {
    // First try to find existing chat
    let chat = await this.findOne({
      type: 'private',
      members: {
        $all: [
          { $elemMatch: { userId: initiatorId } },
          { $elemMatch: { userId: recipientId } }
        ]
      },
      isActive: true
    });

    // If chat exists, return it
    if (chat) {
      return chat;
    }

    // Create new chat if none exists
    chat = await this.create({
      type: 'private',
      members: [
        { userId: initiatorId, role: 'member' },
        { userId: recipientId, role: 'member' }
      ],
      createdBy: initiatorId,
      initiator: initiatorId,
      isActive: true,
      status: 'active',
      metadata: {
        memberCount: 2,
        messageCount: 0,
        lastActivity: new Date()
      }
    });

    return chat;
  } catch (error) {
    throw error;
  }
};

export const Chat = mongoose.model('Chat', chatSchema);