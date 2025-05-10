import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const sharedBedSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Single Bed', 'Double Bed', 'Bunk Bed', 'Queen Bed', 'King Bed']
  },
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String
  },
  images: [{
    url: String,
    key: String,
    main: {
      type: Boolean,
      default: false
    }
  }],
  bedDetails: {
    bedType: {
      type: String,
      enum: ['Single', 'Double', 'Bunk', 'Queen', 'King']
    },
    isTopBunk: Boolean,
    hasCurtains: Boolean,
    hasStorage: Boolean
  },
  price: {
    type: Number,
    min: 0
  },
  availability: {
    availableFrom: Date,
    availableTo: Date
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'unpublished'],
    default: 'draft'
  }
}, {
  timestamps: true
});

sharedBedSchema.plugin(mongoosePaginate);

sharedBedSchema.methods.isPublishable = function() {
  return this.type && 
         this.location && 
         this.images?.length > 0 && 
         this.bedDetails && 
         this.price && 
         this.availability;
};

export default mongoose.model('SharedBed', sharedBedSchema);
