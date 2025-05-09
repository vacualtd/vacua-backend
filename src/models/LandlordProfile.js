import mongoose from 'mongoose';

const landlordProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: [true, 'User ID is required'],
    unique: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxLength: 500
  },
  profilePicture: {
    url: String,
    key: String
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String
  },
  businessHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    visibility: {
      profile: { type: String, enum: ['public', 'private'], default: 'public' },
      contact: { type: String, enum: ['public', 'private'], default: 'public' }
    }
  },
  businessName: {
    type: String,
    trim: true
  },
  businessLicense: String,
  taxId: String,
  propertyTypes: [{
    type: String,
    required: true,
    enum: [
      'A Studio Apartment',
      'House',
      'Apartment',
      'Room',
      'One Bedroom',
      'Two Bedroom',
      'Three Bedroom',
      'Shared Apartment',
      'Townhouse',
      'Duplex',
      'Condo',
      'Basement Apartment',
      'Penthouse',
      'Garden Flat',
      'Maisonette',
      'Cottage',
      'Bungalow',
      'Flat Share',
      'Student Housing'
    ]
  }],
  description: String,
  isComplete: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware to ensure userId is set
landlordProfileSchema.pre('save', function(next) {
  if (!this.userId) {
    next(new Error('User ID is required'));
  }
  next();
});

// Update validation for profile update
landlordProfileSchema.statics.validateProfileUpdate = function(profileData) {
  const validFields = [
    'firstName',
    'lastName',
    'phoneNumber',
    'address',
    'city',
    'state',
    'zipCode',
    'bio',
    'socialLinks',
    'businessHours',
    'settings'
  ];

  const updates = {};
  for (const [key, value] of Object.entries(profileData)) {
    if (validFields.includes(key) && value !== undefined && value !== null) {
      updates[key] = value;
    }
  }

  return updates;
};

export const LandlordProfile = mongoose.model('LandlordProfile', landlordProfileSchema);