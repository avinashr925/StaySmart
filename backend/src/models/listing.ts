import mongoose, { Schema, Document } from "mongoose";

export interface IAvailability {
  startDate: Date;
  endDate: Date;
}

export interface IBlackoutDate {
  startDate: Date;
  endDate: Date;
  type?: "host-blocked" | "maintenance";
  reason?: string;
}

export interface IHotspot {
  pitch: number;
  yaw: number;
  type: "info" | "scene";
  text: string;
  targetRoomId?: string;
}

export interface IRoom {
  id: string;
  name: string;
  panorama: string;
  hotspots?: IHotspot[];
}

export interface IVirtualTour {
  enabled: boolean;
  rooms: IRoom[];
}

export interface IHouseRules {
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  childrenAllowed: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  checkInFrom?: string;
  checkInUntil?: string;
  checkOutBy?: string;
  customRules?: string[];
}

export interface IImageDetail {
  url: string;
  category: "Living Room" | "Bedroom" | "Kitchen" | "Bathroom" | "Exterior" | "Other";
  order: number;
  isCover: boolean;
}

export interface IListing extends Document {
  title: string;
  description: string;
  images: string[];
  imageDetails?: IImageDetail[];
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
  instantBook: boolean;
  maintenanceMode: boolean;
  blackoutDates: IBlackoutDate[];
  moderationStatus: "Pending" | "Approved" | "Rejected";
  virtualTour?: IVirtualTour;
  houseRules?: IHouseRules;
  cancellationPolicy: "Flexible" | "Moderate" | "Strict" | "Custom";
  cancellationPolicyDetails?: string;
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
      default: [],
    },
    imageDetails: [
      {
        url: { type: String, required: true },
        category: { type: String, enum: ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Exterior", "Other"], default: "Other" },
        order: { type: Number, default: 0 },
        isCover: { type: Boolean, default: false }
      }
    ],
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
        validate: {
          validator: function (val: number[]) {
            return (
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: "Coordinates must be a valid [longitude, latitude] pair.",
        },
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
    instantBook: {
      type: Boolean,
      default: true,
    },
    availability: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      },
    ],
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    blackoutDates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        type: { type: String, enum: ["host-blocked", "maintenance"], default: "host-blocked" },
        reason: { type: String, default: "" },
      },
    ],
    moderationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved",
    },
    cancellationPolicy: {
      type: String,
      enum: ["Flexible", "Moderate", "Strict", "Custom"],
      default: "Moderate",
    },
    cancellationPolicyDetails: {
      type: String,
      default: "",
    },
    houseRules: {
      smokingAllowed: { type: Boolean, default: false },
      petsAllowed: { type: Boolean, default: false },
      partiesAllowed: { type: Boolean, default: false },
      childrenAllowed: { type: Boolean, default: true },
      quietHoursStart: { type: String, default: "" },
      quietHoursEnd: { type: String, default: "" },
      checkInFrom: { type: String, default: "14:00" },
      checkInUntil: { type: String, default: "22:00" },
      checkOutBy: { type: String, default: "11:00" },
      customRules: { type: [String], default: [] }
    },
    virtualTour: {
      enabled: { type: Boolean, default: false },
      rooms: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          panorama: { type: String, required: true },
          hotspots: [
            {
              pitch: { type: Number, required: true },
              yaw: { type: Number, required: true },
              type: { type: String, enum: ["info", "scene"], default: "info" },
              text: { type: String, required: true },
              targetRoomId: { type: String },
            },
          ],
        },
      ],
    },
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
