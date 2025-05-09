import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const sharedBedSchema = new mongoose.Schema({
  // Basic Information
  type: {
    type: String,
    enum: ['Single Bed', 'Double Bed', 'Bunk Bed', 'Queen Bed', 'King Bed'],
    required: true
  },

  description: {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100
    },
    overview: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000
    }
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  // Location (same as property)
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Shared Bed Specific Details
  bedDetails: {
    bedType: {
      type: String,
      required: true,
      enum: ['Single', 'Double', 'Bunk', 'Queen', 'King']
    },
    isTopBunk: {
      type: Boolean,
      default: false
    },
    hasCurtains: {
      type: Boolean,
      default: false
    },
    hasStorage: {
      type: Boolean,
      default: false
    }
  },

  // Amenities specific to shared beds
  amenities: {
    hasPowerOutlet: {
      type: Boolean,
      default: false
    },
    hasReadingLight: {
      type: Boolean,
      default: false
    },
    hasPrivacyCurtain: {
      type: Boolean,
      default: false
    },
    hasLocker: {
      type: Boolean,
      default: false
    },
    hasWifi: {
      type: Boolean,
      default: false
    }
  },

  // Images
  images: [{
    url: String,
    key: String,
    main: { type: Boolean, default: false }
  }],

  // Host Information (student only)
  host: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    isStudent: {
      type: Boolean,
      required: true,
      default: true
    }
  },

  // Availability
  availability: {
    isAvailable: { type: Boolean, default: true },
    availableFrom: Date,
    availableTo: Date,
    minimumStay: {
      type: Number,
      default: 1,
      min: 1
    },
    maximumStay: {
      type: Number,
      default: 365,
      min: 1
    }
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'deleted'],
    default: 'draft'
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  // Additional stats
  viewCount: {
    type: Number,
    default: 0
  },

  isActive: {
    type: Boolean,
    default: true
  },

  metadata: {
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    publishedAt: Date,
    unpublishedAt: Date
  }
}, {
  timestamps: true
});

// Add indexes
sharedBedSchema.index({ 'host.userId': 1 });
sharedBedSchema.index({ status: 1 });
sharedBedSchema.index({ price: 1 });
sharedBedSchema.index({ 'location.city': 1 });

// Add plugins
sharedBedSchema.plugin(mongoosePaginate);

// Middleware to ensure only students can create listings
sharedBedSchema.pre('save', async function(next) {
  if (this.isNew) {
    const User = mongoose.model('User');
    const user = await User.findById(this.host.userId);
    if (!user || user.role !== 'student') {
      throw new Error('Only students can create shared bed listings');
    }
  }
  next();
});

export const SharedBed = mongoose.model('SharedBed', sharedBedSchema);
