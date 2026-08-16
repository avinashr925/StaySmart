import mongoose, { Schema, Document } from "mongoose";

// -------------------------------------------------------------
// PRICING HISTORY
// -------------------------------------------------------------
export interface IPricingHistory extends Document {
  listing: mongoose.Types.ObjectId;
  price: number;
  date: Date;
}

const pricingHistorySchema = new Schema<IPricingHistory>({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

pricingHistorySchema.index({ listing: 1, date: -1 });

export const PricingHistory = mongoose.model<IPricingHistory>("PricingHistory", pricingHistorySchema);

// -------------------------------------------------------------
// COMPETITOR DATA
// -------------------------------------------------------------
export interface ICompetitorData extends Document {
  city: string;
  name: string;
  price: number;
  rating: number;
  source: "airbnb" | "booking" | "hotel";
  updatedAt: Date;
}

const competitorDataSchema = new Schema<ICompetitorData>(
  {
    city: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    rating: {
      type: Number,
      default: 4.0,
    },
    source: {
      type: String,
      enum: ["airbnb", "booking", "hotel"],
      required: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

competitorDataSchema.index({ city: 1, price: 1 });

export const CompetitorData = mongoose.model<ICompetitorData>("CompetitorData", competitorDataSchema);

// -------------------------------------------------------------
// MARKET TREND
// -------------------------------------------------------------
export interface IMarketTrend extends Document {
  city: string;
  occupancyRate: number; // e.g. 74 for 74%
  bookingVelocity: number; // average days booked in advance
  marketGrowth: number; // percentage change year-over-year
  saturationIndex: number; // listings per sq km or similar rating (1-100)
  month: string; // YYYY-MM
  updatedAt: Date;
}

const marketTrendSchema = new Schema<IMarketTrend>(
  {
    city: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    occupancyRate: {
      type: Number,
      required: true,
      default: 60,
    },
    bookingVelocity: {
      type: Number,
      required: true,
      default: 14,
    },
    marketGrowth: {
      type: Number,
      required: true,
      default: 5,
    },
    saturationIndex: {
      type: Number,
      required: true,
      default: 50,
    },
    month: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

marketTrendSchema.index({ city: 1, month: -1 }, { unique: true });

export const MarketTrend = mongoose.model<IMarketTrend>("MarketTrend", marketTrendSchema);
