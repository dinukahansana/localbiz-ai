import mongoose from 'mongoose';

// Keep image bytes out of campaign lists and store at most one poster for each post.
const campaignPosterSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    postIndex: { type: Number, min: 0, max: 2, required: true },
    headline: { type: String, maxlength: 90, required: true },
    callToAction: { type: String, maxlength: 80, required: true },
    brandColor: { type: String, required: true },
    source: { type: String, enum: ['product-photo', 'deapi'], default: 'product-photo' },
    model: { type: String, default: '' },
    generationId: { type: String, default: '' },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true, bufferCommands: false },
);
campaignPosterSchema.index({ owner: 1, campaign: 1, postIndex: 1 }, { unique: true });

export default mongoose.model('CampaignPoster', campaignPosterSchema);
