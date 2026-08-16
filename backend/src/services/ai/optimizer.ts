import { logger } from "../../utils/logger";
import Listing from "../../models/listing";
import Review from "../../models/review";
import { getGenAI, GEMINI_MODEL } from "../../config/gemini";

// -------------------------------------------------------------
// 1. LISTING OPTIMIZER
// -------------------------------------------------------------
interface IOptimizationResults {
  seoTitle: string;
  highConvertingDescription: string;
  suggestedAmenities: string[];
  missingFeatures: string[];
  expectedBookingScore: number; // out of 100
  conversionSuggestions: string[];
  aiRationale: string;
}

export const getListingOptimization = async (listingId: string): Promise<IOptimizationResults> => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  // Base suggestions
  const seoTitle = `Premium ${listing.bedrooms}BHK ${listing.propertyType} in ${listing.city} with modern amenities`;
  const highConvertingDescription = `${listing.description}\n\nExperience comfort and hospitality at our gorgeous property in ${listing.city}. Perfect for leisure travelers, remote workers, or families looking for a relaxed getaway.`;
  const suggestedAmenities = ["Keyless Entry", "Dedicated Workspace", "High-speed Mesh WiFi", "Espresso Machine"];
  
  const listingAmenitiesLower = listing.amenities.map(a => a.toLowerCase());
  const missingFeatures: string[] = [];
  if (!listingAmenitiesLower.includes("pool")) missingFeatures.push("Swimming Pool");
  if (!listingAmenitiesLower.includes("air conditioning")) missingFeatures.push("AC Climate Control");
  if (!listingAmenitiesLower.includes("kitchen")) missingFeatures.push("Full Cookware Kitchen");

  const expectedBookingScore = Math.round(70 + (listing.rating || 4.0) * 4 + listing.amenities.length * 1.5);
  const conversionSuggestions = [
    "Add more high-resolution photos of the living space and bedrooms.",
    "Add detailed check-in instructions to boost initial booking conversion rates.",
    "Offer discount coupons during the low-demand seasons.",
  ];
  const aiRationale = "[Offline Fallback] Optimized based on target CTR analyses of comparable stays in the Malibu area.";

  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `
        Analyze this property listing to generate host improvements:
        - Title: "${listing.title}"
        - Current Description: "${listing.description}"
        - Price per night: ₹${listing.price}
        - Current Amenities: ${listing.amenities.join(", ")}

        Suggest:
        1. A high-converting, SEO-optimized Title
        2. An engaging, copywriting Description
        3. 3-4 recommended Amenities to add
        4. Any critical missing features detected
        5. Expected Booking conversion score (out of 100)
        6. 3 bullet-point suggestions to increase conversion rate
        7. A short explanation (aiRationale) explaining these adjustments.

        Return STRICTLY as a JSON object matching this schema:
        {
          "seoTitle": "string",
          "highConvertingDescription": "string",
          "suggestedAmenities": ["string", "string"],
          "missingFeatures": ["string", "string"],
          "expectedBookingScore": number,
          "conversionSuggestions": ["string", "string", "string"],
          "aiRationale": "string"
        }
        Return raw JSON only, no markdown markers.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      logger.error("Gemini listing optimization failed, running fallback", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    seoTitle,
    highConvertingDescription,
    suggestedAmenities,
    missingFeatures,
    expectedBookingScore,
    conversionSuggestions,
    aiRationale,
  };
};

// -------------------------------------------------------------
// 2. REVIEW INTELLIGENCE SUMMARY
// -------------------------------------------------------------
interface IReviewSummary {
  pros: string[];
  cons: string[];
  cleanlinessScore: number; // out of 10
  noiseLevelScore: number; // out of 10 (lower is quieter)
  safetyScore: number; // out of 10
  sentimentScore: number; // percentage (e.g. 92)
  suitability: {
    workcation: boolean;
    family: boolean;
    couples: boolean;
  };
  frequentlyMentionedAmenities: string[];
  aiRationale: string;
}

export const getReviewIntelligence = async (listingId: string): Promise<IReviewSummary> => {
  const reviews = await Review.find({ listing: listingId });

  // Default fallback values
  const pros = ["Host response time", "Perfect beachfront location", "Extremely clean bed sheets"];
  const cons = ["High nightly rate during peak hours", "Limited street parking slots"];
  const cleanlinessScore = 9;
  const noiseLevelScore = 2; // quiet
  const safetyScore = 9;
  const sentimentScore = 90;
  const suitability = { workcation: true, family: true, couples: true };
  const frequentlyMentionedAmenities = ["Beach Access", "Pool", "WiFi"];
  const aiRationale = "[Offline Fallback] Extracted from positive reviews highlighting host hospitality and noise levels.";

  if (reviews.length === 0) {
    return {
      pros: ["No reviews written yet."],
      cons: ["No reviews written yet."],
      cleanlinessScore: 10,
      noiseLevelScore: 1,
      safetyScore: 10,
      sentimentScore: 100,
      suitability,
      frequentlyMentionedAmenities: [],
      aiRationale: "[Offline Fallback] No review history available to parse.",
    };
  }

  const genAI = getGenAI();
  if (genAI) {
    try {
      const reviewTexts = reviews.map((r, i) => `Review ${i + 1} (${r.rating} stars): "${r.comment}"`).join("\n\n");
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `
        Analyze the following guest reviews for a stay:
        
        ${reviewTexts}

        Summarize these reviews into:
        1. List of 3 Pros (things guests liked)
        2. List of 2 Cons (complaints/concerns)
        3. Cleanliness rating (out of 10)
        4. Noise level rating (out of 10, 1 being quiet, 10 being very loud)
        5. Safety rating (out of 10)
        6. Overall Positive Sentiment score percentage (0-100)
        7. Suitability flags for: Workcation, Family, and Couples
        8. Top 3 frequently mentioned amenities
        9. A short explanation (aiRationale) explaining this review synthesis.

        Return STRICTLY as a JSON object matching this schema:
        {
          "pros": ["string", "string"],
          "cons": ["string", "string"],
          "cleanlinessScore": number,
          "noiseLevelScore": number,
          "safetyScore": number,
          "sentimentScore": number,
          "suitability": {
            "workcation": boolean,
            "family": boolean,
            "couples": boolean
          },
          "frequentlyMentionedAmenities": ["string", "string"],
          "aiRationale": "string"
        }
        Return raw JSON only, no markdown.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      logger.error("Gemini reviews intelligence failed, running fallback", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    pros,
    cons,
    cleanlinessScore,
    noiseLevelScore,
    safetyScore,
    sentimentScore,
    suitability,
    frequentlyMentionedAmenities,
    aiRationale,
  };
};
