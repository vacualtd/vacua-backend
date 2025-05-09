import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const propertySchema = new mongoose.Schema({
  // Basic Information

  type: {
    type: String,
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
    ],
    required: function () {
      return this.status !== 'draft';
    }
  },

  propertyStyle: {
    type: String,
    enum: [
      'Modern',
      'Traditional',
      'Contemporary',
      'Victorian',
      'Georgian',
      'Colonial',
      'Tudor',
      'Mediterranean',
      'Minimalist'
    ],
    default: 'Modern'
  },

  description: {
    descrptionname: {
      type: String,
      required: function () {
        return this.status !== 'draft';
      },
      trim: true,
      maxLength: 100
    },
    overview: {
      type: String,
      required: function () {
        return this.status !== 'draft';
      },
      trim: true,
      maxLength: 2000
    },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      required: function () {
        return this.status !== 'draft';
      }
    }
  },

  price: {
    type: Number,
    required: function () {
      return this.status !== 'draft';
    },
    min: 0
  },


  // Location
  location: {
    address: {
      type: String,
      required: function() {
        return this.status !== 'draft';
      }
    },
    city: {
      type: String,
      required: function() {
        return this.status !== 'draft';
      }
    },
    state: {
      type: String,
      required: function() {
        return this.status !== 'draft';
      }
    },
    zipCode: {
      type: String,
      required: function() {
        return this.status !== 'draft';
      }
    },
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },

  // Property Details
  rooms: {
    bedrooms: {
      type: Number,
      min: 0,
      default: 0
    },
    bathrooms: {
      type: Number,
      min: 0,
      default: 0
    },
    balconys: {
      type: Number,
      min: 0,
      default: 0
    },
    livingrooms: {
      type: Number,
      min: 0,
      default: 0
    },
    kitchens: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  size: {
    value: {
      type: Number,
      required: function () {
        return this.status !== 'draft';
      },
      min: 0
    },
    unit: {
      type: String,
      enum: ['sqft', 'sqm'],
      default: 'sqft'
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  },


  // Amenities
  amenities: {
    wifi: {
      type: Boolean,
      default: false
    },
    tv: {
      type: Boolean,
      default: false
    },
    airConditioner: {
      type: Boolean,
      default: false
    },
    fireAlarm: {
      type: Boolean,
      default: false
    },
    bathTub: {
      type: Boolean,
      default: false
    },
    washer: {
      type: Boolean,
      default: false
    },
    carPark: {
      type: Boolean,
      default: false
    },
    gym: {
      type: Boolean,
      default: false
    },
    firstAid: {
      type: Boolean,
      default: false
    },
    smokeAlarm: {
      type: Boolean,
      default: false
    },
    FireExtinguisher: {
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

  // Host Information
  host: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser',
      required: true
    },
    name: String
  },

  // Availability
  availability: {
    isAvailable: { type: Boolean, default: true },
    availableFrom: Date,
    availableTo: Date
  },

  // Cancellation Policy
  cancellationPolicy: {
    type: String,
    enum: ['flexible', 'moderate', 'strict'],
    default: 'flexible'
  },

  // Status and Verification
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'unpublished', 'under_review', 'rejected', 'deleted'],
    default: 'draft'
  },
  currentStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 7
  },
  isVerified: {
    type: Boolean,
    default: false
  },

  // Reviews
  reviewsCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  // Additional stats
  viewCount: {
    type: Number,
    default: 0
  },
  responseTime: {
    type: Number,
    default: 0
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  hasResponse: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  bookingHistory: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VUser'
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed'],
      default: 'confirmed'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Rental Terms
  rentalTerms: {
    minimumStay: {
      type: Number,
      default: 6,
      min: 1
    },
    maximumStay: {
      type: Number,
      default: 12,
      min: 1
    },
    leaseType: {
      type: String,
      enum: ['Short-term', 'Long-term', 'Month-to-month', 'Fixed-term'],
      default: 'Long-term'
    },
    depositAmount: {
      type: Number,
      default: 0,
      validate: {
        validator: function(value) {
          // If price exists, ensure deposit is at least equal to one month's rent
          if (this.price) {
            return value >= this.price;
          }
          return true; // Skip validation if price isn't set yet
        },
        message: 'Deposit amount must be at least equal to one month\'s rent'
      }
    },
    petsAllowed: {
      allowed: { type: Boolean, default: false },
      deposit: { type: Number, default: 0 },
      restrictions: [String]
    },
    utilities: {
      included: { type: Boolean, default: false },
      water: { type: Boolean, default: false },
      electricity: { type: Boolean, default: false },
      gas: { type: Boolean, default: false },
      internet: { type: Boolean, default: false },
      estimated_cost: { type: Number, default: 0 }
    }
  },

  // Additional Property Features
  features: {
    furnished: { type: Boolean, default: false },
    appliances: [{
      type: String,
      enum: [
        'Refrigerator',
        'Dishwasher',
        'Washing Machine',
        'Dryer',
        'Microwave',
        'Oven',
        'Stove'
      ]
    }],
    parking: {
      available: { type: Boolean, default: false },
      type: {
        type: String,
        enum: ['Street', 'Garage', 'Driveway', 'None'],
        default: 'None'
      },
      spaces: { type: Number, default: 0 }
    },
    security: {
      system: { type: Boolean, default: false },
      cameras: { type: Boolean, default: false },
      gated: { type: Boolean, default: false },
      doorman: { type: Boolean, default: false }
    },
    outdoor: {
      garden: { type: Boolean, default: false },
      patio: { type: Boolean, default: false },
      bbqArea: { type: Boolean, default: false }
    }
  },

  // Property Condition
  condition: {
    yearBuilt: Number,
    lastRenovated: Date,
    propertyCondition: {
      type: String,
      enum: ['New', 'Excellent', 'Good', 'Fair', 'Needs Work'],
      default: 'Good'
    }
  },

  // Neighborhood
  neighborhood: {
    type: {
      type: String,
      enum: ['Urban', 'Suburban', 'Rural'],
      default: 'Urban'
    },
    safety: {
      type: String,
      enum: ['Very Safe', 'Safe', 'Average', 'Below Average'],
      default: 'Safe'
    },
    nearbyAmenities: [{
      type: String,
      enum: [
        'Schools',
        'Parks',
        'Shopping',
        'Public Transport',
        'Restaurants',
        'Hospitals',
        'Gyms',
        'Universities'
      ]
    }],
    transitScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    walkScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    }
  },

  // Energy Efficiency
  energyEfficiency: {
    rating: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      default: 'C'
    },
    features: [{
      type: String,
      enum: [
        'Solar Panels',
        'Double Glazing',
        'Smart Meter',
        'LED Lighting',
        'Energy Efficient Appliances'
      ]
    }],
    epcCertificate: String
  },

  // Compliance
  compliance: {
    certificates: {
      gaseSafety: { type: Boolean, default: false },
      electricalSafety: { type: Boolean, default: false },
      energyPerformance: { type: Boolean, default: false }
    },
    licenses: {
      hmoLicense: { type: Boolean, default: false },
      rentalLicense: { type: Boolean, default: false }
    },
    lastInspectionDate: Date
  },

  // Additional Property Features
  metadata: {
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    publishedAt: Date,
    unpublishedAt: Date
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  writeConcern: { w: 1 }
});

// Add standard indexes
propertySchema.index({ 'host.userId': 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ createdAt: -1 });
propertySchema.index({ price: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ 'location.city': 1 });

// Add the pagination plugin
propertySchema.plugin(mongoosePaginate);

// Add virtual for total monthly cost without using $function
propertySchema.virtual('totalMonthlyCost').get(function() {
  let total = this.price || 0;
  if (this.rentalTerms?.utilities?.estimated_cost && !this.rentalTerms?.utilities?.included) {
    total += this.rentalTerms.utilities.estimated_cost;
  }
  return total;
});

// Add method to check availability
propertySchema.methods.isAvailableForDates = function(startDate, endDate) {
  if (!this.availability.isAvailable) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start >= this.availability.availableFrom && 
         end <= this.availability.availableTo &&
         !this.isBooked;
};

// Add a pre-save middleware to set deposit amount if not explicitly set
propertySchema.pre('save', function(next) {
  // Only set deposit if price exists and deposit isn't explicitly set
  if (this.price && (!this.rentalTerms.depositAmount || this.rentalTerms.depositAmount === 0)) {
    this.rentalTerms.depositAmount = this.price * 1.5;
  }
  next();
});

export const Property = mongoose.model('Property', propertySchema);