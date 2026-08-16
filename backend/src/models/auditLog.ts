import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  user: mongoose.Types.ObjectId;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
  ipAddress: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Actor user reference is required"],
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only log creations
  }
);

auditLogSchema.index({ user: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetId: 1 });

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
