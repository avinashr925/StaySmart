import mongoose, { Schema, Document } from "mongoose";

export interface IWaitlist extends Document {
  listing: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: "Waiting" | "Notified" | "Expired";
  createdAt: Date;
  updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
  {
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
    status: {
      type: String,
      enum: ["Waiting", "Notified", "Expired"],
      default: "Waiting",
    },
  },
  {
    timestamps: true,
  }
);

waitlistSchema.index({ listing: 1, status: 1 });
waitlistSchema.index({ user: 1 });

export default mongoose.model<IWaitlist>("Waitlist", waitlistSchema);
