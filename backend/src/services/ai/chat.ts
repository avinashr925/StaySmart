import { logger } from "../../utils/logger";
import Listing from "../../models/listing";
import { getGenAI, GEMINI_MODEL, handleGeminiError } from "../../config/gemini";

// Interface for structured chat replies
export interface IChatResponse {
  response: string;
  isFallback: boolean;
}
const sanitizeChatHistory = (
  history: { role: "user" | "model"; parts: string }[]
) => {
  const cleaned = history
    .filter(
      (item) =>
        (item.role === "user" || item.role === "model") &&
        typeof item.parts === "string" &&
        item.parts.trim().length > 0
    )
    .map((item) => ({
      role: item.role,
      parts: [{ text: item.parts.trim() }],
    }));

  // Gemini requires the first history message to be from the user.
  while (cleaned.length > 0 && cleaned[0].role !== "user") {
    cleaned.shift();
  }

  // Gemini expects alternating user/model messages.
  const normalized: {
    role: "user" | "model";
    parts: { text: string }[];
  }[] = [];

  for (const item of cleaned) {
    const last = normalized[normalized.length - 1];

    if (!last || last.role !== item.role) {
      normalized.push(item);
    }
  }

  return normalized;
};

// Helper to query real database listings dynamically based on message contents
const fetchRelevantListings = async (message: string): Promise<any[]> => {
  const queryObj: any = { maintenanceMode: { $ne: true } };
  const lowerMsg = message.toLowerCase();

  try {
    // 1. Location match
    const cities = await Listing.distinct("city");
    for (const city of cities) {
      if (new RegExp(`\\b${city}\\b`, "i").test(lowerMsg)) {
        queryObj.city = new RegExp(city, "i");
        break;
      }
    }

    // 2. Pricing filter (e.g. "under 5000" or "below ₹3500")
    const priceMatch = lowerMsg.match(/(?:under|below|less than|max|budget of|₹|\$)\s*(\d+)/i) || lowerMsg.match(/(\d+)\s*(?:per night|night|rs|inr)/i);
    if (priceMatch) {
      const priceValue = parseInt(priceMatch[1], 10);
      if (priceValue > 100 && priceValue < 100000) {
        queryObj.price = { $lte: priceValue };
      }
    }

    // 3. Guest count (e.g. "for 4 people" or "family of 5")
    const guestMatch = lowerMsg.match(/(\d+)\s*(?:people|guest|guests|person|family|adults)/i);
    if (guestMatch) {
      const guestValue = parseInt(guestMatch[1], 10);
      if (guestValue > 0 && guestValue < 20) {
        queryObj.guests = { $gte: guestValue };
      }
    }

    // 4. Feature extraction (e.g. "beach", "pool", "view")
    if (lowerMsg.includes("beach")) {
      queryObj.$or = [
        { title: /beach/i },
        { description: /beach/i },
        { amenities: /beach|coast|ocean/i }
      ];
    } else if (lowerMsg.includes("pool")) {
      queryObj.amenities = /pool|swimming/i;
    }

    const matches = await Listing.find(queryObj).limit(8).select("title price city description rating amenities guests bedrooms bathrooms");
    
    if (matches.length > 0) {
      return matches;
    }
  } catch (err) {
    logger.error("Failed to fetch listings context dynamically", { error: err instanceof Error ? err.message : String(err) });
  }

  // Fallback to general featured listings if no direct filters match
  return Listing.find({ maintenanceMode: { $ne: true } })
    .limit(5)
    .select("title price city description rating amenities guests bedrooms bathrooms");
};

// -------------------------------------------------------------
// 1. HOST ASSISTANT CHATBOT
// -------------------------------------------------------------
export const getHostChatResponse = async (
  message: string,
  history: { role: "user" | "model"; parts: string }[],
  hostListings: any[] = []
): Promise<IChatResponse> => {
  const listingContext = hostListings.length > 0
    ? hostListings.map((l, idx) => `${idx + 1}. "${l.title}" in ${l.city} - Price: ₹${l.price}/night, Capacity: ${l.guests || 2} guests, Bedrooms: ${l.bedrooms || 1}, Bathrooms: ${l.bathrooms || 1}. Amenities: ${l.amenities ? l.amenities.join(", ") : "WiFi, AC"}.`).join("\n")
    : "No listings configured yet.";

  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const systemInstruction = `
        You are "StaySmart Host Intelligence Bot", an expert real estate consultant and vacation rental advisor.
        Your goal is to answer hosts' queries regarding listing optimization, dynamic pricing, maximizing occupancy, guest communication, managing cancellations, and local market trends.
        Provide structured, professional, actionable, and analytical responses using markdown.

        Here are the host's current active listings:
        ${listingContext}

        Use this listing data to provide tailored advice for their properties where applicable.
      `;

      const chat = model.startChat({
        history: sanitizeChatHistory(history),
      });

      const result = await chat.sendMessage(`${systemInstruction}\n\nHost Query: ${message}`);
      return { response: result.response.text(), isFallback: false };
    } catch (err) {
      const response = handleGeminiError(err);
      return { response, isFallback: false };
    }
  }

  return { response: "AI assistant temporarily unavailable.", isFallback: false };
};

// -------------------------------------------------------------
// 2. GUEST ASSISTANT CHATBOT
// -------------------------------------------------------------
export const getGuestChatResponse = async (
  message: string,
  history: { role: "user" | "model"; parts: string }[]
): Promise<IChatResponse> => {
  const listings = await fetchRelevantListings(message);
  const listingContext = listings
    .map(
      (l, idx) =>
        `${idx + 1}. "${l.title}" in ${l.city} - Price: ₹${l.price}/night, Rating: ${l.rating || 4.5}⭐, Capacity: ${l.guests || 2} guests. Amenities: ${l.amenities ? l.amenities.join(", ") : "WiFi, AC"}.`
    )
    .join("\n");

  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const systemInstruction = `
        You are "StaySmart Travel Guide AI", a friendly, premium concierge and tour assistant.
        Your goal is to help guests find homes on StaySmart, draft complete holiday travel itineraries (restaurants, transport, sightseeing), and optimize travel budgets.
        
        Here are the properties currently matching their criteria in our database:
        ${listingContext}

        ALWAYS base your recommendations on these real database properties. Suggest specific matches by name and detail their amenities and prices. Do NOT invent properties that are not listed above. Provide friendly, comprehensive, markdown-formatted responses.
      `;

      const chat = model.startChat({
  history: sanitizeChatHistory(history),
});

      const result = await chat.sendMessage(`${systemInstruction}\n\nGuest Query: ${message}`);
      return { response: result.response.text(), isFallback: false };
    } catch (err) {
      const response = handleGeminiError(err);
      return { response, isFallback: false };
    }
  }

  return { response: "AI assistant temporarily unavailable.", isFallback: false };
};
