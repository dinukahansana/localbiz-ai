import mongoose from 'mongoose';

// Phase 2 has one shared workspace. The fixed ID prevents duplicate profiles.
const businessProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'primary' },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    story: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true, bufferCommands: false },
);

export default mongoose.model('BusinessProfile', businessProfileSchema);
