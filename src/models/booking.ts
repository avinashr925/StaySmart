import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  listing: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: "Pending" | "Confirmed" | "Cancelled";
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
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Confirmed",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for history lookups and availability validation
bookingSchema.index({ listing: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ user: 1 });

export default mongoose.model<IBooking>("Booking", bookingSchema);
