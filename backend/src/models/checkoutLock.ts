import mongoose, { Schema, Document } from "mongoose";

export interface ICheckoutLock extends Document {
  listing: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

const checkoutLockSchema = new Schema<ICheckoutLock>({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // MongoDB TTL index: automatically deletes document after 300 seconds (5 minutes)
  },
});

// Index to find overlapping locks quickly
checkoutLockSchema.index({ listing: 1, startDate: 1, endDate: 1 });

export default mongoose.model<ICheckoutLock>("CheckoutLock", checkoutLockSchema);
