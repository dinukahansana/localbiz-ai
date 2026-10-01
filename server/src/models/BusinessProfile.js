import mongoose from 'mongoose';

// Each profile uses its owner's ID; legacy Phase 2 records remain untouched.
const businessProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    story: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true, bufferCommands: false },
);

export default mongoose.model('BusinessProfile', businessProfileSchema);
