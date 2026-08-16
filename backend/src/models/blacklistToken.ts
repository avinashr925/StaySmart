import mongoose, { Schema, Document } from "mongoose";

export interface IBlacklistToken extends Document {
  token: string;
  createdAt: Date;
}

const blacklistTokenSchema = new Schema<IBlacklistToken>({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hours in seconds - matches maximum JWT token lifetime limit
  },
});

blacklistTokenSchema.index({ token: 1 });

export default mongoose.model<IBlacklistToken>("BlacklistToken", blacklistTokenSchema);
