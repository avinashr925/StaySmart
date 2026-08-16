import mongoose, { Schema, Document } from "mongoose";

export interface ISavedSearch {
  query: string;
  createdAt: Date;
}

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId;
  kycVerified: boolean;
  kycDocumentUrl?: string;
  bio?: string;
  address?: string;
  savedSearches: ISavedSearch[];
  travelHistory: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required for profile"],
      unique: true,
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    kycDocumentUrl: String,
    bio: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    savedSearches: [
      {
        query: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    travelHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Listing",
      },
    ],
  },
  {
    timestamps: true,
  }
);

profileSchema.index({ user: 1 });

export default mongoose.model<IProfile>("Profile", profileSchema);
