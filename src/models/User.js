import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoosePaginate from 'mongoose-paginate-v2';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    sparse: true,
    trim: true,
    unique: true,
    validate: {
      validator: function (v) {
        return !v || /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'Username can only contain letters, numbers, underscores and hyphens'
    }
  },
  password: {
    type: String,
    select: false,
    required: function() {
      return this.isVerified; // Password required only after verification
    }
  },
  passwordHistory: [{
    password: { type: String, select: false },
    changedAt: { type: Date, default: Date.now }
  }],
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['admin', 'landlord', 'student'],
    required: true
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  otpVerified: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'inactive'
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  subscriptionEndDate: Date,
  lastLogin: Date,
  avatar: {
    type: String,
    default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1920&auto=format&fit=crop'
    // Professional male silhouette with high contrast and clean background
  },
  accountStatus: {
    type: String,
    enum: ['active', 'deactivated', 'scheduled_for_deletion', 'deleted'],
    default: 'active'
  },
  deletionDetails: {
    scheduledDate: Date,
    reason: String,
    requestedAt: Date,
    cancelledAt: Date
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  deactivationHistory: [{
    status: String,
    reason: String,
    date: Date
  }],
  identityVerification: {
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'verified', 'rejected'],
      default: 'not_submitted'
    },
    fullName: String,
    dateOfBirth: Date,
    phoneNumber: {
      number: String,
      verified: { type: Boolean, default: false }
    },
    governmentId: {
      type: { type: String, enum: ['passport', 'drivers_license', 'national_id'] },
      number: String,
      verificationStatus: { type: String, default: 'pending' },
      frontImage: {
        url: String,
        key: String
      },
      backImage: {
        url: String,
        key: String
      }
    },
    addressProof: {
      type: { type: String, default: 'utility_bill' },
      status: { type: String, default: 'pending' },
      document: {
        url: String,
        key: String
      }
    },
    submittedAt: Date,
    verifiedAt: Date,
    verifiedBy: mongoose.Schema.Types.ObjectId
  },
  businessVerification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'not_started'],
      default: 'not_started'
    },
    companyDetails: {
      name: String,
      registrationNumber: String,
      taxId: String,
      businessAddress: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
      }
    },
    documents: {
      companyCertificate: {
        url: String,
        key: String,
        verified: {
          type: Boolean,
          default: false
        }
      },
      authorizedRepresentative: {
        idDocument: {
          url: String,
          key: String
        },
        fullName: String,
        position: String,
        verificationStatus: {
          type: String,
          enum: ['pending', 'verified', 'rejected'],
          default: 'pending'
        }
      }
    },
    verificationHistory: [{
      status: String,
      reason: String,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VUser'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  propertyOwnership: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'not_started'],
      default: 'not_started'
    },
    properties: [{
      address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
      },
      documents: {
        ownershipProof: {
          type: {
            type: String,
            enum: ['title_deed', 'purchase_agreement', 'tax_receipt']
          },
          url: String,
          key: String,
          verified: {
            type: Boolean,
            default: false
          }
        },
        utilityBill: {
          url: String,
          key: String,
          date: Date,
          verified: {
            type: Boolean,
            default: false
          }
        },
        authorizationLetter: {
          url: String,
          key: String,
          date: Date,
          verified: {
            type: Boolean,
            default: false
          },
          isRequired: {
            type: Boolean,
            default: false
          }
        }
      },
      verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VUser'
      }
    }]
  },
  studentVerification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    matricNumber: String,
    university: String,
    documents: {
      studentId: {
        url: String,
        key: String,
        verified: {
          type: Boolean,
          default: false
        }
      },
      enrollmentProof: {
        url: String,
        key: String,
        verified: {
          type: Boolean,
          default: false
        }
      }
    },
    verificationHistory: [{
      status: String,
      reason: String,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VUser'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true,
  writeConcern: { w: 1 }
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ 'otp.expiresAt': 1 }, { expireAfterSeconds: 0 }); // TTL index for OTP

// Add the pagination plugin
userSchema.plugin(mongoosePaginate);

export const User = mongoose.model('VUser', userSchema);

