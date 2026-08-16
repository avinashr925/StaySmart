import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  booking: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  gateway: "razorpay" | "upi" | "mock" | "stripe" | "RAZORPAY" | "UPI" | "MOCK" | "STRIPE";
  paymentMethod?: string;
  orderId?: string;
  paymentId?: string;
  signature?: string;
  refundId?: string;
  refundStatus?: "Pending" | "Processing" | "Refunded" | "Failed";
  status: "Pending" | "Succeeded" | "Failed" | "Refunded";
  taxes: number;
  cleaningFee: number;
  platformFee?: number;
  hostAmount?: number;
  transferId?: string;
  transferStatus?: "Pending" | "Settled" | "Failed";
  couponApplied?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking reference is required"],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "inr",
      lowercase: true,
    },
    gateway: {
      type: String,
      enum: ["razorpay", "upi", "mock", "stripe", "RAZORPAY", "UPI", "MOCK", "STRIPE"],
      default: "razorpay",
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "upi", "mock", "card", "netbanking", "stripe", "MOCK", "RAZORPAY", "STRIPE", "UPI", "CARD", "NETBANKING"],
      default: "mock",
    },
    orderId: String,
    paymentId: String,
    signature: String,
    refundId: String,
    refundStatus: {
      type: String,
      enum: ["Pending", "Processing", "Refunded", "Failed"],
      default: "Pending",
    },
    status: {
      type: String,
      enum: ["Pending", "Succeeded", "Failed", "Refunded"],
      default: "Pending",
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    hostAmount: {
      type: Number,
      default: 0,
    },
    transferId: String,
    transferStatus: {
      type: String,
      enum: ["Pending", "Settled", "Failed"],
      default: "Pending",
    },
    taxes: {
      type: Number,
      default: 0,
    },
    cleaningFee: {
      type: Number,
      default: 0,
    },
    couponApplied: String,
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ orderId: 1 });

export default mongoose.model<IPayment>("Payment", paymentSchema);
