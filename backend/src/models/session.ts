import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  user: mongoose.Types.ObjectId;
  token: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  isActive: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    token: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      default: "Unknown",
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast verification and revocation
sessionSchema.index({ user: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ isActive: 1 });

export default mongoose.model<ISession>("Session", sessionSchema);
