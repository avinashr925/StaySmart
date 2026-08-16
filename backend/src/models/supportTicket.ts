import mongoose, { Schema, Document } from "mongoose";

export interface ISupportTicket extends Document {
  user: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  status: "Open" | "Resolved";
  createdAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Open", "Resolved"],
    default: "Open",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<ISupportTicket>("SupportTicket", supportTicketSchema);
