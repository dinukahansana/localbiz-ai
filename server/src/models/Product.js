import mongoose from 'mongoose';

export const currencies = ['LKR', 'USD', 'EUR', 'GBP', 'INR'];

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    // Store whole minor units (for example cents) to avoid floating-point rounding.
    priceMinor: {
      type: Number,
      required: true,
      min: 0,
      max: 999999999,
      validate: Number.isInteger,
    },
    currency: { type: String, required: true, enum: currencies },
    imageUrl: { type: String, maxlength: 2048, default: '' },
    // Photo bytes are private and excluded from ordinary product queries.
    photoData: { type: Buffer, select: false },
    photoVersion: { type: String, default: '' },
  },
  { timestamps: true, bufferCommands: false },
);

export default mongoose.model('Product', productSchema);
