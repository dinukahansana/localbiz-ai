import mongoose from 'mongoose';

const postScheduleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    postIndex: { type: Number, min: 0, max: 2, required: true },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'published', 'cancelled'], default: 'scheduled' },
    // This records the user's manual confirmation, not a social platform response.
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true, bufferCommands: false },
);
postScheduleSchema.index({ owner: 1, campaign: 1, postIndex: 1 }, { unique: true });

export default mongoose.model('PostSchedule', postScheduleSchema);
