import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VUser',
        required: true
    },
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    type: {
        type: String,
        enum: ['booking', 'subscription', 'commission', 'other'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

transactionSchema.plugin(mongoosePaginate);

export const Transaction = mongoose.model('Transaction', transactionSchema); 