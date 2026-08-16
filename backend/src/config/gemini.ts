import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../utils/logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

let genAI: GoogleGenerativeAI | null = null;

export const isPlaceholderKey = (key?: string): boolean => {
  if (!key) return true;
  const k = key.trim();
  return (
    k === "" ||
    k === "YOUR_ACTUAL_GEMINI_API_KEY" ||
    k === "YOUR_ACTUAL_KEY_HERE" ||
    k === "GEMINI_API_KEY_PLACEHOLDER" ||
    k === "YOUR_REAL_KEY"
  );
};

if (GEMINI_API_KEY && !isPlaceholderKey(GEMINI_API_KEY)) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  logger.info("Gemini configured successfully");
} else {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Gemini API key is not configured in production.");
  }
  logger.warn("Gemini API Key unconfigured. Operating in Local Fallback Mode.");
}

export const getGenAI = (): GoogleGenerativeAI | null => {
  return genAI;
};

export const handleGeminiError = (err: any): string => {
  const errMsg = err instanceof Error ? err.message : String(err);
  let errorType = "API_ERROR";

  if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("key not valid") || errMsg.includes("invalid key")) {
    errorType = "INVALID_KEY";
  } else if (errMsg.includes("model") && (errMsg.includes("not found") || errMsg.includes("404") || errMsg.includes("unavailable"))) {
    errorType = "MODEL_UNAVAILABLE";
  } else if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate limit")) {
    errorType = "RATE_LIMITED";
  } else if (errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("connect") || errMsg.includes("timeout")) {
    errorType = "NETWORK_ERROR";
  }

  logger.error(`[Gemini Error] Type: ${errorType} | Details: ${errMsg}`);
  return "I'm having trouble connecting to the AI assistant right now. Please try again.";
};
