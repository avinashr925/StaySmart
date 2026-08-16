import mongoose from "mongoose";

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staysmart";

async function verifyDatabaseConnection() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB.");
    console.log("StaySmart seed is intentionally disabled: listings, hosts, guests, reviews, and bookings must come from real application activity.");
    console.log("No demo records were created.");
  } finally {
    await mongoose.disconnect();
  }
}

verifyDatabaseConnection().catch((error) => {
  console.error("Database verification failed:", error);
  process.exit(1);
});
