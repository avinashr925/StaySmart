/**
 * Startup environment validation. Import this FIRST in server.ts (before
 * any other module reads process.env) so the process fails fast — before
 * binding a port or connecting to the DB — if a critical secret is missing
 * in production.
 */
import crypto from "crypto";
import { logger } from "../utils/logger";

const isProd = process.env.NODE_ENV === "production";

// Critical core infrastructure
const REQUIRED_IN_PRODUCTION = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "MONGO_URL"] as const;

// Third-party integrations that are required in production
const INTEGRATIONS_IN_PRODUCTION = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GEMINI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS"
] as const;

const isPlaceholderVal = (key: string, val?: string): boolean => {
  if (!val) return true;
  const v = val.trim();
  return (
    v === "" ||
    v.includes("placeholder") ||
    v.includes("your_") ||
    v.startsWith("YOUR_") ||
    v === "GEMINI_API_KEY_PLACEHOLDER"
  );
};

const missingCore = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key] || isPlaceholderVal(key, process.env[key]));
const missingIntegrations = INTEGRATIONS_IN_PRODUCTION.filter((key) => !process.env[key] || isPlaceholderVal(key, process.env[key]));

// StaySmart uses Razorpay as its only payment gateway.
const hasRazorpay = process.env.RAZORPAY_KEY_ID && !isPlaceholderVal("RAZORPAY_KEY_ID", process.env.RAZORPAY_KEY_ID);
const hasRazorpaySecret = process.env.RAZORPAY_KEY_SECRET && !isPlaceholderVal("RAZORPAY_KEY_SECRET", process.env.RAZORPAY_KEY_SECRET);
const hasRazorpayWebhook = process.env.RAZORPAY_WEBHOOK_SECRET && !isPlaceholderVal("RAZORPAY_WEBHOOK_SECRET", process.env.RAZORPAY_WEBHOOK_SECRET);

if (isProd) {
  const errors: string[] = [];
  
  if (missingCore.length > 0) {
    errors.push(`Missing core infrastructure: ${missingCore.join(", ")}`);
  }
  if (missingIntegrations.length > 0) {
    errors.push(`Missing production integration configs: ${missingIntegrations.join(", ")}`);
  }
  if (!hasRazorpay || !hasRazorpaySecret || !hasRazorpayWebhook) {
    errors.push("Razorpay payment configuration is incomplete. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET.");
  }

  if (errors.length > 0) {
    // Fail fast, before the server binds a port or touches the DB.
    // eslint-disable-next-line no-console
    console.error(
      `[env] Refusing to start in production due to configuration error(s):\n- ${errors.join("\n- ")}`
    );
    process.exit(1);
  }
}

// JWT secrets must NEVER silently fall back to a hardcoded or ephemeral value.
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error(
    "Missing required environment variables: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in your .env file."
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: isProd,
  port: process.env.PORT || "8080",
  mongoUrl: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staysmart",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpire: process.env.JWT_ACCESS_EXPIRE || "15m",
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || "7d",
};

