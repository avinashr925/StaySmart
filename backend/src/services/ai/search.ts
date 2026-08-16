import { logger } from "../../utils/logger";
import Listing from "../../models/listing";
import Wishlist from "../../models/wishlist";
import Booking from "../../models/booking";
import { getGenAI, GEMINI_MODEL } from "../../config/gemini";

interface ISearchParams {
  city?: string;
  country?: string;
  priceMax?: number;
  propertyType?: string;
  bedrooms?: number;
  guests?: number;
  keywords: string[];
  instantBook?: boolean;
  superhost?: boolean;
  aiRationale: string;
}

// -------------------------------------------------------------
// 1. SEMANTIC PROPERTY SEARCH
// -------------------------------------------------------------
export const parseSemanticQuery = async (query: string): Promise<ISearchParams> => {
  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `
        Analyze this search query for a vacation rental listing:
        "${query}"

        Extract parameters and return STRICTLY a JSON object with this shape:
        {
          "city": "string or null",
          "country": "string or null",
          "priceMax": number or null,
          "propertyType": "string or null (e.g. 'Entire home', 'Private room', 'Villa', 'Apartment', 'Cabin')",
          "bedrooms": number or null,
          "guests": number or null,
          "keywords": ["array", "of", "vibe/amenity", "words", "e.g.", "beach", "quiet", "pool"],
          "instantBook": boolean or null,
          "superhost": boolean or null,
          "aiRationale": "a short 1-sentence explanation of why these search filters were extracted"
        }
        Return ONLY raw JSON. No explanations, no markdown ticks.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      logger.error("Gemini semantic parsing failed, running fallback", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // DETERMINISTIC HEURISTIC FALLBACK
  const queryLower = query.toLowerCase();
  const params: ISearchParams = {
    keywords: [],
    aiRationale: "[Local Heuristic] Extracted from search query matching keywords and patterns.",
  };

  if (queryLower.includes("under") || queryLower.includes("below") || queryLower.includes("limit")) {
    const match = queryLower.match(/(?:under|below|limit of|₹|\$)\s*(\d+)/);
    if (match) params.priceMax = Number(match[1]);
  }

  if (queryLower.includes("beach")) params.keywords.push("Beach Access");
  if (queryLower.includes("pool")) params.keywords.push("Pool");
  if (queryLower.includes("wifi")) params.keywords.push("WiFi");
  if (queryLower.includes("ac")) params.keywords.push("Air Conditioning");
  if (queryLower.includes("pet")) params.keywords.push("Pet Friendly");

  if (queryLower.includes("villa")) params.propertyType = "Villa";
  else if (queryLower.includes("cabin")) params.propertyType = "Cabin";
  else if (queryLower.includes("apartment")) params.propertyType = "Apartment";

  const destinations = ["Malibu", "Goa", "Florence", "Cancun", "Aspen"];
  for (const d of destinations) {
    if (queryLower.includes(d.toLowerCase())) {
      params.city = d;
      break;
    }
  }

  return params;
};

// -------------------------------------------------------------
// 2. PERSONALIZED RECOMMENDATIONS (Similarity-Based / Cold-Start)
// -------------------------------------------------------------
export const getRecommendations = async (userId?: string): Promise<any[]> => {
  // Cold-Start Strategy: if no user is authenticated, return top-rated properties
  if (!userId) {
    return Listing.find({}).sort({ rating: -1, reviewCount: -1 }).limit(6);
  }

  try {
    // 1) Fetch user wishlist
    const wishlistObj = await Wishlist.findOne({ user: userId });
    const wishlistedIds = wishlistObj?.listings.map(id => id.toString()) || [];

    // 2) Fetch user past bookings
    const bookings = await Booking.find({ user: userId }).populate("listing");
    const bookedListingIds = bookings.map(b => b.listing ? (b.listing as any)._id.toString() : "");

    // Compile historical user preferences
    const historyIds = [...new Set([...wishlistedIds, ...bookedListingIds])];

    if (historyIds.length === 0) {
      // User is logged in but has no history yet: recommend highly-rated listings in popular cities
      return Listing.find({}).sort({ rating: -1 }).limit(6);
    }

    // Extract preferred features (city, propertyType, amenities) from user history
    const historyListings = await Listing.find({ _id: { $in: historyIds } });
    
    const preferredTypes = historyListings.map(l => l.propertyType);
    const preferredCities = historyListings.map(l => l.city);
    const preferredAmenities = historyListings.flatMap(l => l.amenities);

    // Dynamic scoring query: find stays matching these parameters (excluding already booked properties)
    const candidates = await Listing.find({
      _id: { $nin: historyIds },
    }).populate("owner");

    const scoredCandidates = candidates.map(l => {
      let score = 0;
      if (preferredTypes.includes(l.propertyType)) score += 5;
      if (preferredCities.includes(l.city)) score += 4;
      
      // Count matching amenities
      const matchAmenities = l.amenities.filter(a => preferredAmenities.includes(a));
      score += matchAmenities.length * 2;

      // Add rating bonus
      score += l.rating * 1.5;

      return { listing: l, score };
    });

    // Sort candidates by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.slice(0, 6).map(item => {
      const listingJson = item.listing.toJSON();
      return {
        ...listingJson,
        aiRationale: `Recommended based on your affinity for ${listingJson.propertyType}s in ${listingJson.city} and ${listingJson.amenities[0] || "WiFi"}.`,
      };
    });
  } catch (err) {
    logger.error("Personalized recommendation error", { error: err instanceof Error ? err.message : String(err) });
    return Listing.find({}).sort({ rating: -1 }).limit(6);
  }
};
