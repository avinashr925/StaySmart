import mongoose, { Schema, Document } from "mongoose";

export interface IPricingSnapshot {
  nightlyPrice: number;
  nights: number;
  accommodationAmount: number;
  discount: number;
  cleaningFee: number;
  platformFee: number;
  gstRate: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalPrice: number;
  currency: string;
  taxRuleVersion?: string;
}

export interface IBooking extends Document {
  listing: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  cleaningFee: number;
  taxes: number;
  couponApplied?: string;
  orderId?: string;
  paymentMethod?: "razorpay" | "upi" | "mock" | "card" | "netbanking" | "stripe" | "MOCK" | "RAZORPAY" | "STRIPE" | "UPI" | "CARD" | "NETBANKING";
  upiTxnId?: string;
  status: "Pending" | "Confirmed" | "Cancelled" | "PaymentFailed" | "Expired" | "PendingVerification" | "Completed" | "Refunded";
  pricingSnapshot?: IPricingSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing is required"],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
    },
    cleaningFee: {
      type: Number,
      default: 0,
    },
    taxes: {
      type: Number,
      default: 0,
    },
    couponApplied: String,
    orderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "upi", "mock", "card", "netbanking", "stripe", "MOCK", "RAZORPAY", "STRIPE", "UPI", "CARD", "NETBANKING"],
      default: "razorpay",
    },
    upiTxnId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "PaymentFailed", "Expired", "PendingVerification", "Completed", "Refunded"],
      default: "Pending",
    },
    pricingSnapshot: {
      nightlyPrice: { type: Number, required: true },
      nights: { type: Number, required: true },
      accommodationAmount: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      cleaningFee: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      gstRate: { type: Number, required: true },
      gstAmount: { type: Number, required: true },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      totalPrice: { type: Number, required: true },
      currency: { type: String, default: "INR" },
      taxRuleVersion: { type: String, default: "2026.01" },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for history lookups and availability validation
bookingSchema.index({ listing: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ orderId: 1 });

export default mongoose.model<IBooking>("Booking", bookingSchema);
