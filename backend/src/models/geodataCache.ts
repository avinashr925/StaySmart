import mongoose, { Schema, Document } from "mongoose";

export interface IGeodataCache extends Document {
  key: string;
  type: "weather" | "attractions";
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

const geodataCacheSchema = new Schema<IGeodataCache>(
  {
    key: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ["weather", "attractions"] },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// TTL index to automatically prune cache entries after 7 days
geodataCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

export default mongoose.model<IGeodataCache>("GeodataCache", geodataCacheSchema);
