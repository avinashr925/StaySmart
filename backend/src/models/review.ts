import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  listing: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing is required"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user can review a listing only once
reviewSchema.index({ listing: 1, author: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", reviewSchema);
