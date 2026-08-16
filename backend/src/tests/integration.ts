import axios from "axios";
import mongoose from "mongoose";

const API_URL = process.env.API_URL || "http://localhost:8080";
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staysmart";

async function runTests() {
  try {
    console.log("Running StaySmart production smoke checks...");

    const health = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    if (health.status !== 200) throw new Error("Health endpoint is not available.");
    console.log("✓ API health check passed.");

    const providerName = process.env.PAYMENT_PROVIDER || "mock";
    if (providerName.toLowerCase() === "razorpay") {
      if (!process.env.RAZORPAY_KEY_ID ||
          !process.env.RAZORPAY_KEY_SECRET ||
          !process.env.RAZORPAY_WEBHOOK_SECRET) {
        throw new Error(
          "Razorpay configuration is incomplete. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET."
        );
      }
      console.log("✓ Razorpay configuration is present.");
    } else {
      console.log(`✓ Mock payment provider active ("${providerName}"). Skipping Razorpay credential checks.`);
    }

    await mongoose.connect(MONGO_URL);
    await mongoose.connection.db.admin().ping();
    console.log("✓ MongoDB connection check passed.");
    await mongoose.disconnect();

    console.log("All smoke checks passed.");
  } catch (error: any) {
    console.error("Smoke checks failed:", error.response?.data || error.message);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

runTests();
