import mongoose, { Schema, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  discountPercent: number;
  host?: mongoose.Types.ObjectId;
  active: boolean;
  expirationDate?: Date;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  eligibleListings?: mongoose.Types.ObjectId[];
  eligibleUsers?: mongoose.Types.ObjectId[];
  usageLimit?: number;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercent: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: [1, "Discount must be at least 1%"],
      max: [100, "Discount cannot exceed 100%"],
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    active: {
      type: Boolean,
      default: true,
    },
    expirationDate: Date,
    minBookingAmount: { type: Number, default: 0 },
    maxDiscountAmount: Number,
    eligibleListings: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    eligibleUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ICoupon>("Coupon", couponSchema);
