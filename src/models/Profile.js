import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true,
    unique: true
  },
  displayName: String,
  avatar: {
    url: String,
    key: String
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  lastSeen: Date,
  preferences: {
    notifications: {
      chat: { type: Boolean, default: true },
      calls: { type: Boolean, default: true },
      community: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      showLastSeen: { type: Boolean, default: true },
      showStatus: { type: Boolean, default: true },
      showProfilePhoto: { type: Boolean, default: true },
      showBio: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  contacts: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    relationship: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalCalls: { type: Number, default: 0 },
    communities: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Add indexes for better performance
profileSchema.index({ userId: 1 });
profileSchema.index({ status: 1 });
profileSchema.index({ 'contacts.userId': 1 });

export const Profile = mongoose.model('Profile', profileSchema);
