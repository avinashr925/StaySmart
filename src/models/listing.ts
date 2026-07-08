import mongoose, { Schema, Document } from "mongoose";

export interface IAvailability {
  startDate: Date;
  endDate: Date;
}

export interface IListing extends Document {
  title: string;
  description: string;
  images: string[];
  price: number;
  country: string;
  city: string;
  address: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  amenities: string[];
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  owner: mongoose.Types.ObjectId;
  rating: number;
  reviewCount: number;
  availability: IAvailability[];
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    images: {
      type: [String],
      default: ["https://images.unsplash.com/photo-1625505826533-5c80aca7d157?auto=format&fit=crop&w=800&q=60"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Coordinates are required"],
        default: [73.7486, 15.5414], // Default Goa [lng, lat]
      },
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    propertyType: {
      type: String,
      required: [true, "Property type is required"],
      default: "Entire home",
    },
    bedrooms: {
      type: Number,
      required: true,
      default: 1,
    },
    bathrooms: {
      type: Number,
      required: true,
      default: 1,
    },
    guests: {
      type: Number,
      required: true,
      default: 2,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner reference is required"],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    availability: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for location geoqueries
listingSchema.index({ location: "2dsphere" });
// Index city/country and price for search filters
listingSchema.index({ city: 1, country: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ title: "text", description: "text" });

export default mongoose.model<IListing>("Listing", listingSchema);
