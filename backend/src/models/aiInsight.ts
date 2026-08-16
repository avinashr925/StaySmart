import mongoose, { Schema, Document } from "mongoose";

export interface IAIInsight extends Document {
  listing: mongoose.Types.ObjectId;
  insightType: "Pricing" | "Market" | "ReviewSummary" | "Competitor";
  data: any;
  createdAt: Date;
}

const aiInsightSchema = new Schema<IAIInsight>(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    insightType: {
      type: String,
      enum: ["Pricing", "Market", "ReviewSummary", "Competitor"],
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

aiInsightSchema.index({ listing: 1, insightType: 1 });

export default mongoose.model<IAIInsight>("AIInsight", aiInsightSchema);
