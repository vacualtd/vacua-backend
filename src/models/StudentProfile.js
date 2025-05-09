import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VUser',
    required: true,
    unique: true
  },
  nationality: {
    type: String,
    required: true
  },
  universityName: {
    type: String,
    required: true
  },
  preferredLocation: {
    type: String,
    required: true
  },
  matricNumber: {
    type: String
  }
}, {
  timestamps: true
});

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);