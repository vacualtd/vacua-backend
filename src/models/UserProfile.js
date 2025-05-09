import mongoose from 'mongoose';

const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1920&auto=format&fit=crop';

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  avatar: {
    url: {
      type: String,
      default: DEFAULT_AVATAR_URL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1920&auto=format&fit=crop'
    },
    key: String
  },
  bio: {
    type: String,
    maxLength: 500,
    trim: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
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
  // Role-specific information
  studentInfo: {
    nationality: String,
    universityName: String,
    matricNumber: String,
    preferredLocation: String,
    yearOfStudy: Number,
    course: String
  },
  landlordInfo: {
    nationality: String,
    propertyLocation: [String],
    preferredLocation: String,
    businessName: String,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  },
  contacts: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser'
    },
    relationship: {
      type: String,
      enum: ['friend', 'blocked', 'muted'],
      default: 'friend'
    },
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

// Indexes for better query performance
userProfileSchema.index({ userId: 1 }, { unique: true });
userProfileSchema.index({ 'contacts.userId': 1 });
userProfileSchema.index({ status: 1, lastSeen: -1 });
userProfileSchema.index({ 'studentInfo.universityName': 1 });
userProfileSchema.index({ 'landlordInfo.propertyLocation': 1 });

export const UserProfile = mongoose.model('UserProfile', userProfileSchema);