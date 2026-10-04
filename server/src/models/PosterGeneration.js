import mongoose from 'mongoose';

// Temporary previews are private and expire. Saved posters use CampaignPoster instead.
const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    postIndex: { type: Number, min: 0, max: 2, required: true },
    requestKey: { type: String, required: true },
    providerId: { type: String, select: false },
    model: { type: String, required: true },
    status: {
      type: String,
      enum: ['starting', 'pending', 'processing', 'done', 'error', 'unknown'],
      default: 'starting',
    },
    active: { type: Boolean, default: true },
    headline: { type: String, required: true },
    callToAction: { type: String, required: true },
    brandColor: { type: String, required: true },
    prompt: { type: String, maxlength: 2000, default: '' },
    style: { type: String, enum: ['studio', 'lifestyle', 'bold'], default: 'studio' },
    price: Number,
    progress: { type: Number, default: 0 },
    message: { type: String, default: '' },
    data: { type: Buffer, select: false },
    checkedAt: { type: Date, default: () => new Date(0) },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, bufferCommands: false },
);
schema.index({ owner: 1, requestKey: 1 }, { unique: true });
schema.index({ owner: 1 }, { unique: true, partialFilterExpression: { active: true } });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Atomic counters keep the shared API key's daily limit across restarts and instances.
const budgetSchema = new mongoose.Schema(
  { _id: String, used: { type: Number, default: 0 }, expiresAt: Date },
  { bufferCommands: false },
);
budgetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const ImageBudget = mongoose.model('ImageBudget', budgetSchema);
export default mongoose.model('PosterGeneration', schema);
