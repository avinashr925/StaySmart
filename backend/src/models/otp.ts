import mongoose, { Schema, Document } from "mongoose";

export interface IOTPToken extends Document {
  email: string;
  otp: string;
  purpose: "Verification" | "PasswordReset";
  expiresAt: Date;
}

const otpTokenSchema = new Schema<IOTPToken>({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ["Verification", "PasswordReset"],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 300, // 5 minutes TTL
  },
});

otpTokenSchema.index({ email: 1, otp: 1 });

export default mongoose.model<IOTPToken>("OTPToken", otpTokenSchema);
