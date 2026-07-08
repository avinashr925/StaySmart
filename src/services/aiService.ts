import { GoogleGenerativeAI } from "@google/generative-ai";
import Listing from "../models/listing";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn("GEMINI_API_KEY is not configured. Running AI features in HEURISTIC fallback mode.");
}

// -------------------------------------------------------------
// 1. SEMANTIC PROPERTY SEARCH
// -------------------------------------------------------------
interface ISemanticSearchParams {
  city?: string;
  country?: string;
  priceMax?: number;
  propertyType?: string;
  bedrooms?: number;
  guests?: number;
  keywords: string[];
}

export const parseSemanticQuery = async (query: string): Promise<ISemanticSearchParams> => {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Analyze the following search query for a vacation rental listing:
        "${query}"

        Extract the search parameters and return them STRICTLY as a JSON object with this shape:
        {
          "city": "string or null",
          "country": "string or null",
          "priceMax": number or null,
          "propertyType": "string or null (e.g. 'Entire home', 'Private room', 'Shared room', 'Villa', 'Apartment')",
          "bedrooms": number or null,
          "guests": number or null,
          "keywords": ["array", "of", "vibe/amenity", "words", "e.g.", "beach", "quiet", "pool"]
        }

        Do not return any explanation or markdown tags. Return only raw JSON.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      // Strip markdown code block wrappers if generated
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("Gemini semantic parse error:", err);
      // Fallback to heuristic
    }
  }

  // HEURISTIC FALLBACK (Regex & word matching)
  const params: ISemanticSearchParams = { keywords: [] };
  const queryLower = query.toLowerCase();

  // Price match (e.g., "under 6000", "below 5000", "under $100")
  const priceRegex = /(?:under|below|max|budget of)\s*(?:rs\.?|inr|₹|\$)?\s*(\d+)/i;
  const priceMatch = queryLower.match(priceRegex);
  if (priceMatch) {
    params.priceMax = Number(priceMatch[1]);
  }

  // Bedrooms match (e.g., "3 bedroom", "2bhk", "1 bed")
  const bedroomRegex = /(\d+)\s*(?:bedroom|bhk|bed)/i;
  const bedMatch = queryLower.match(bedroomRegex);
  if (bedMatch) {
    params.bedrooms = Number(bedMatch[1]);
  }

  // Guests match (e.g., "for 4 guests", "4 people", "family of 5")
  const guestRegex = /(?:for|accommodate)?\s*(\d+)\s*(?:guest|people|person|family)/i;
  const guestMatch = queryLower.match(guestRegex);
  if (guestMatch) {
    params.guests = Number(guestMatch[1]);
  }

  // Property type match
  const types = ["villa", "apartment", "cabin", "cottage", "house", "room", "castle", "mansion"];
  for (const t of types) {
    if (queryLower.includes(t)) {
      if (t === "villa") params.propertyType = "Villa";
      else if (t === "apartment") params.propertyType = "Apartment";
      else if (t === "cabin") params.propertyType = "Cabin";
      else if (t === "room") params.propertyType = "Private room";
      else params.propertyType = "Entire home";
      break;
    }
  }

  // Destination match (words that might indicate city)
  // Simple heuristic: look for commonly known locations or capitalization
  const destinations = ["goa", "mumbai", "delhi", "bangalore", "shimla", "manali", "kerala", "london", "paris", "new york"];
  for (const dest of destinations) {
    if (queryLower.includes(dest)) {
      params.city = dest.charAt(0).toUpperCase() + dest.slice(1);
      break;
    }
  }

  // Keywords extraction
  const potentialKeywords = ["beach", "pool", "view", "wifi", "ac", "quiet", "luxury", "pet friendly", "nature", "mountain"];
  for (const kw of potentialKeywords) {
    if (queryLower.includes(kw)) {
      params.keywords.push(kw);
    }
  }

  return params;
};

// -------------------------------------------------------------
// 2. AI TRAVEL ASSISTANT CHATBOT
// -------------------------------------------------------------
export const generateChatResponse = async (
  userMessage: string,
  chatHistory: { role: "user" | "model"; parts: string }[]
): Promise<string> => {
  // Fetch active listings to feed as context
  const listings = await Listing.find({}).limit(8).select("title price city description rating amenities");
  const listingContext = listings
    .map(
      (l, idx) =>
        `${idx + 1}. "${l.title}" in ${l.city} - Price: ₹${l.price}/night, Rating: ${l.rating} stars. Amenities: ${l.amenities.join(
          ", "
        )}. Description: ${l.description.slice(0, 100)}...`
    )
    .join("\n");

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const systemInstruction = `
        You are "StaySmart AI", a premium travel advisor and assistant for StaySmart, a vacation rental platform.
        Your goal is to answer queries about destinations, itinerary planning, and recommend stays.
        
        Here is a list of available properties in StaySmart that you can recommend to the user. Whenever appropriate, mention one or more of these properties and explain why they suit the user's travel plans:
        
        ${listingContext}

        Provide professional, friendly, and structured responses. Use markdown, bullet points, and highlight listing names.
      `;

      // Structure chat format for Gemini API
      const chat = model.startChat({
        history: chatHistory.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.parts }],
        })),
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const promptWithInstruction = `${systemInstruction}\n\nUser Message: ${userMessage}`;
      const result = await chat.sendMessage(promptWithInstruction);
      return result.response.text();
    } catch (err) {
      console.error("Gemini chat error:", err);
      // Fallback
    }
  }

  // HEURISTIC FALLBACK CHAT RESPONSE
  const msgLower = userMessage.toLowerCase();
  let response = "Hello! I am your StaySmart AI helper. ";

  if (msgLower.includes("recommend") || msgLower.includes("suggest") || msgLower.includes("find")) {
    response += "Based on our current listings, I highly recommend checking out:\n";
    listings.slice(0, 3).forEach((l) => {
      response += `- **${l.title}** in *${l.city}* (₹${l.price}/night) - Rated ${l.rating}⭐. It features ${l.amenities.slice(0, 3).join(", ")}.\n`;
    });
    response += "\nYou can view more properties by using the search bar on our home page!";
  } else if (msgLower.includes("price") || msgLower.includes("cost") || msgLower.includes("cheap")) {
    response += "Our prices vary depending on the destination and season. Stays start as low as ₹1000/night! Let me know where you are heading, and I can suggest options within your budget.";
  } else {
    response += "I'm here to help you plan your perfect holiday! Ask me for itinerary tips, local dining suggestions, or check out our premium listings on the map.";
  }

  return response;
};

// -------------------------------------------------------------
// 3. SMART PRICE PREDICTOR
// -------------------------------------------------------------
interface IPricePredictParams {
  city: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  amenitiesCount: number;
}

export const predictListingPrice = async (specs: IPricePredictParams): Promise<{ predictedPrice: number; reasoning: string }> => {
  // Let's first establish a baseline using our database averages
  const localListings = await Listing.find({ city: new RegExp(specs.city, "i") }).select("price");
  let avgCityPrice = 2500; // default baseline

  if (localListings.length > 0) {
    const sum = localListings.reduce((acc, curr) => acc + curr.price, 0);
    avgCityPrice = sum / localListings.length;
  }

  // Heuristic calculation (used for fallback or baseline check)
  const baseValue = avgCityPrice;
  const bedroomVal = specs.bedrooms * 800;
  const bathroomVal = specs.bathrooms * 400;
  const guestVal = specs.guests * 300;
  const amenityVal = specs.amenitiesCount * 100;
  
  let predictedHeuristicPrice = Math.round(baseValue + bedroomVal + bathroomVal + guestVal + amenityVal);
  // Add some property type weight
  if (specs.propertyType.toLowerCase() === "villa") predictedHeuristicPrice = Math.round(predictedHeuristicPrice * 1.3);
  if (specs.propertyType.toLowerCase() === "shared room") predictedHeuristicPrice = Math.round(predictedHeuristicPrice * 0.5);

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        You are a real estate price evaluation assistant.
        Predict the fair night rental price (in INR - ₹) for this vacation listing:
        - City: ${specs.city}
        - Property Type: ${specs.propertyType}
        - Bedrooms: ${specs.bedrooms}
        - Bathrooms: ${specs.bathrooms}
        - Guests Capacity: ${specs.guests}
        - Number of Premium Amenities: ${specs.amenitiesCount}

        Average rental price in this city is ₹${Math.round(avgCityPrice)} per night.
        
        Our estimated baseline is ₹${predictedHeuristicPrice}.

        Provide your response in JSON format matching this pattern:
        {
          "predictedPrice": number,
          "reasoning": "short 1-2 sentence explanation of your pricing evaluation"
        }
        Do not return markdown markers. Return raw JSON.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("Gemini pricing prediction error:", err);
    }
  }

  // FALLBACK
  return {
    predictedPrice: predictedHeuristicPrice,
    reasoning: `Calculated from city baseline of ₹${Math.round(avgCityPrice)} adjusted for ${specs.bedrooms} bedrooms, ${specs.bathrooms} bathrooms, and ${specs.guests} guests capability.`,
  };
};
