import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const communityEventSchema = new mongoose.Schema({
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VUser',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    image: {
        url: String,
        key: String
    },
    location: {
        type: String,
        required: true
    },
    maxParticipants: {
        type: Number
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VUser'
        },
        status: {
            type: String,
            enum: ['going', 'maybe', 'not_going'],
            default: 'going'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VUser'
    },
    reviewedAt: Date,
    reviewNote: String,
    metadata: {
        category: String,
        tags: [String],
        isPrivate: {
            type: Boolean,
            default: false
        },
        requiresApproval: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

communityEventSchema.plugin(mongoosePaginate);

export const CommunityEvent = mongoose.model('CommunityEvent', communityEventSchema);
