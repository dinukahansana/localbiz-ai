import mongoose from 'mongoose';

export const platforms = ['facebook', 'instagram'];
export const tones = ['friendly', 'professional', 'playful'];
export const languages = ['English', 'Sinhala', 'Tamil'];

const postSchema = new mongoose.Schema(
  {
    angle: { type: String, required: true, maxlength: 80 },
    caption: { type: String, required: true, maxlength: 2200 },
    callToAction: { type: String, required: true, maxlength: 200 },
    hashtags: { type: [String], required: true },
    imageIdea: { type: String, required: true, maxlength: 600 },
  },
  { _id: false },
);

const campaignSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Keep readable context even if a product is renamed or removed later.
    productName: { type: String, required: true, maxlength: 100 },
    businessName: { type: String, required: true, maxlength: 100 },
    goal: { type: String, required: true, maxlength: 600 },
    audience: { type: String, required: true, maxlength: 300 },
    platform: { type: String, enum: platforms, required: true },
    tone: { type: String, enum: tones, required: true },
    language: { type: String, enum: languages, required: true },
    title: { type: String, required: true, maxlength: 100 },
    posts: {
      type: [postSchema],
      required: true,
      validate: (posts) => posts.length === 3,
    },
  },
  { timestamps: true, bufferCommands: false },
);

export default mongoose.model('Campaign', campaignSchema);
