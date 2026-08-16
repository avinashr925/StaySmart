import { logger } from "../../utils/logger";
import Listing from "../../models/listing";
import { PricingHistory } from "../../models/marketData";
import AIInsight from "../../models/aiInsight";
import { getGenAI, GEMINI_MODEL } from "../../config/gemini";

interface IPricingMetrics {
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  expectedOccupancy: number; // percentage (e.g. 75)
  projectedRevenue: number;
  confidenceScore: number; // percentage (e.g. 88)
  competitorAvg: number;
  competitorMin: number;
  competitorMax: number;
  pricePercentile: number;
  competitivenessScore: number; // score out of 100
  aiRationale: string;
  comparables: any[];
}

export const getDynamicPricing = async (listingId: string): Promise<IPricingMetrics> => {
  const listing = await Listing.findById(listingId).populate("owner");
  if (!listing) {
    throw new Error("Listing not found");
  }

  // 1) Find comparable listings in same city/location
  const comparables = await Listing.find({
    city: new RegExp(listing.city, "i"),
    _id: { $ne: listingId },
  }).limit(5);

  // 2) Gather competitor stats
  let competitorAvg = listing.price;
  let competitorMin = listing.price;
  let competitorMax = listing.price;

  if (comparables.length > 0) {
    const prices = comparables.map((c) => c.price);
    const sum = prices.reduce((acc, p) => acc + p, 0);
    competitorAvg = Math.round(sum / comparables.length);
    competitorMin = Math.min(...prices);
    competitorMax = Math.max(...prices);
  } else {
    // Generate deterministic ranges if no comparable listings exist
    competitorAvg = Math.round(listing.price * 0.95);
    competitorMin = Math.round(listing.price * 0.7);
    competitorMax = Math.round(listing.price * 1.4);
  }

  // Calculate pricing percentile rank
  let pricePercentile = 50; // average
  if (listing.price > competitorMax) pricePercentile = 90;
  else if (listing.price < competitorMin) pricePercentile = 10;
  else if (competitorMax !== competitorMin) {
    pricePercentile = Math.round(((listing.price - competitorMin) / (competitorMax - competitorMin)) * 100);
  }

  // Competitiveness calculation (lower price + higher rating + more amenities = higher competitiveness)
  const priceRatio = competitorAvg / listing.price; // > 1 means cheap, < 1 means expensive
  const ratingFactor = (listing.rating || 4.0) / 5.0;
  const amenitiesFactor = Math.min(1, listing.amenities.length / 8);

  let competitivenessScore = Math.round((priceRatio * 40 + ratingFactor * 40 + amenitiesFactor * 20));
  competitivenessScore = Math.min(100, Math.max(10, competitivenessScore));

  // Base calculations
  let recommendedPrice = Math.round((listing.price + competitorAvg) / 2);
  let minPrice = Math.round(listing.price * 0.8);
  let maxPrice = Math.round(listing.price * 1.3);
  let expectedOccupancy = Math.round(60 + (priceRatio - 1) * 30 + (ratingFactor - 0.8) * 100);
  expectedOccupancy = Math.min(95, Math.max(20, expectedOccupancy));
  let projectedRevenue = Math.round(recommendedPrice * 30 * (expectedOccupancy / 100));
  let confidenceScore = 85;
  let aiRationale = `[Local Heuristic] Recommended pricing is ₹${recommendedPrice} per night. This is aligned with the city average of ₹${competitorAvg}. Expected occupancy is ${expectedOccupancy}% due to your high competitiveness ranking.`;

  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `
        Analyze this property for dynamic pricing:
        - Title: "${listing.title}"
        - City: ${listing.city}
        - Current Price: ₹${listing.price}/night
        - Rating: ${listing.rating}⭐ (${listing.reviewCount} reviews)
        - Bedrooms: ${listing.bedrooms}, Bathrooms: ${listing.bathrooms}, Guests: ${listing.guests}
        - Amenities: ${listing.amenities.join(", ")}
        - Competitor Stays Avg: ₹${competitorAvg}/night
        - Competitor Stays Min: ₹${competitorMin}/night
        - Competitor Stays Max: ₹${competitorMax}/night

        Evaluate seasonal adjustments, weekend occupancy, and competitor comparison. Recommend:
        1. optimal Nightly Suggested Price
        2. Minimum profitable price floor
        3. Maximum ceiling price
        4. Expected occupancy rate (percentage)
        5. Projected 30-day revenue
        6. Confidence Score (percentage)
        7. A detailed 2-sentence explanation (aiRationale) explaining WHY this recommendation was generated.

        Return STRICTLY as a JSON object matching this schema:
        {
          "recommendedPrice": number,
          "minPrice": number,
          "maxPrice": number,
          "expectedOccupancy": number,
          "projectedRevenue": number,
          "confidenceScore": number,
          "aiRationale": "string"
        }
        Return raw JSON only, no markdown markers.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const aiData = JSON.parse(cleanJson);

      recommendedPrice = aiData.recommendedPrice;
      minPrice = aiData.minPrice;
      maxPrice = aiData.maxPrice;
      expectedOccupancy = aiData.expectedOccupancy;
      projectedRevenue = aiData.projectedRevenue;
      confidenceScore = aiData.confidenceScore;
      aiRationale = aiData.aiRationale;
    } catch (err) {
      logger.error("Gemini pricing evaluation failed, running fallback calculation", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Format comparable properties to return to UI
  const formattedComps = comparables.map((c) => ({
    id: c._id,
    title: c.title,
    price: c.price,
    rating: c.rating,
    bedrooms: c.bedrooms,
    propertyType: c.propertyType,
    images: c.images,
  }));

  // Save Pricing History Timeline & AI Audits
  await PricingHistory.create({ listing: listingId, price: recommendedPrice }).catch(() => {});
  await AIInsight.create({
    listing: listingId,
    insightType: "Pricing",
    data: {
      recommendedPrice,
      minPrice,
      maxPrice,
      expectedOccupancy,
      projectedRevenue,
      confidenceScore,
      competitorAvg,
      pricePercentile,
      competitivenessScore,
      aiRationale,
    },
  }).catch(() => {});

  return {
    recommendedPrice,
    minPrice,
    maxPrice,
    expectedOccupancy,
    projectedRevenue,
    confidenceScore,
    competitorAvg,
    competitorMin,
    competitorMax,
    pricePercentile,
    competitivenessScore,
    aiRationale,
    comparables: formattedComps,
  };
};
