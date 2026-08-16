import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staysmart";

async function resetData() {
  console.log(`Connecting to MongoDB at: ${MONGO_URL}`);
  
  // Guard 1: Verify environment is local development
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: Cannot run database reset in production environment!");
    process.exit(1);
  }

  // Guard 2: Verify database connection target is local
  const isLocal =
    MONGO_URL.includes("127.0.0.1") ||
    MONGO_URL.includes("localhost") ||
    MONGO_URL.includes("localhost:27017");

  if (!isLocal) {
    console.error("FATAL: Database connection target does not appear to be a local database instance. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URL);

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Could not access Mongoose database object.");
    }

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log("Collections to be reset:", collectionNames);

    // List of application data collections to clear
    const targetCollections = [
      "users",
      "listings",
      "bookings",
      "reviews",
      "wishlists",
      "checkoutlocks",
      "payments",
      "messages",
      "notifications",
      "otps",
      "sessions",
      "supporttickets",
      "waitlists",
      "aiinsights",
      "auditlogs",
      "blacklisttokens",
      "coupons",
      "marketdatas",
      "profiles",
      "geodatacaches"
    ];

    for (const name of targetCollections) {
      if (collectionNames.includes(name)) {
        await db.collection(name).deleteMany({});
        console.log(`✓ Cleared collection: ${name}`);
      }
    }

    console.log("Application data reset completed successfully! 🎉");
  } catch (err: any) {
    console.error("Error during database reset:", err);
  } finally {
    await mongoose.disconnect();
  }
}

resetData();
