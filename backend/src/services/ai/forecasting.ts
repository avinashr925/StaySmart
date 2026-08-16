import { logger } from "../../utils/logger";
import Listing from "../../models/listing";
import { getGenAI, GEMINI_MODEL } from "../../config/gemini";

interface IRevenueForecast {
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  expectedOccupancy: number;
  lowDemandPeriods: string[];
  peakDemandPeriods: string[];
  revenueLossDueToPricing: number;
  potentialRevenueGain: number;
  strategy: string;
  chartData: { name: string; revenue: number; occupancy: number }[];
  seasonalTrends: { season: string; factor: number; strategy: string }[];
  aiRationale: string;
}

export const getRevenueForecast = async (listingId: string): Promise<IRevenueForecast> => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  // 1) Compile baseline numbers
  const dailyPrice = listing.price;
  
  // Calculate average occupancy base
  let baselineOccupancy = 65; // default 65% occupancy
  if (listing.rating && listing.rating > 4.5) baselineOccupancy = 75;
  if (listing.reviewCount && listing.reviewCount > 15) baselineOccupancy += 5;

  const weekly = Math.round(dailyPrice * 7 * (baselineOccupancy / 100));
  const monthly = Math.round(dailyPrice * 30 * (baselineOccupancy / 100));
  const quarterly = Math.round(monthly * 3);
  const yearly = Math.round(monthly * 12);

  // Estimating revenue loss: if rating is high, host can probably charge 15% more without hurting occupancy
  let revenueLossDueToPricing = 0;
  let potentialRevenueGain = 0;

  if (listing.rating >= 4.5 && listing.price < 5000) {
    potentialRevenueGain = Math.round(monthly * 0.15); // Could gain 15% more
    revenueLossDueToPricing = Math.round(monthly * 0.10); // Pricing leakage
  }

  // Generate 12-month projections
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = months.map((month, idx) => {
    // Add seasonal variations (Jul-Aug summer peak, Dec holiday peak, etc.)
    let multiplier = 1.0;
    if (idx === 6 || idx === 7) multiplier = 1.3; // Summer peak (July/August)
    if (idx === 11) multiplier = 1.4; // Holiday peak (December)
    if (idx === 1 || idx === 2) multiplier = 0.7; // Winter off-season (Feb/March)

    const occ = Math.min(95, Math.round(baselineOccupancy * multiplier));
    const rev = Math.round(dailyPrice * 30 * (occ / 100));
    return {
      name: month,
      revenue: rev,
      occupancy: occ,
    };
  });

  const seasonalTrends = [
    { season: "Summer (June - August)", factor: 1.3, strategy: "Increase base rate by 20% to capture high leisure demand." },
    { season: "Winter (December - February)", factor: 1.2, strategy: "Implement a 3-night minimum stay for holiday events." },
    { season: "Off-Season (March - May)", factor: 0.75, strategy: "Offer a 15% discount coupon to maintain weekday occupancy." },
  ];

  let lowDemandPeriods = ["February", "March", "September"];
  let peakDemandPeriods = ["July", "August", "December"];
  let strategy = "[Offline Fallback] Premium listing optimization. Increase pricing by 10% during upcoming long weekends.";
  let aiRationale = `[Offline Fallback] Revenue forecasting shows a projected annual revenue of ₹${yearly}. Potential gains of ₹${potentialRevenueGain} are available by capitalizing on high summer demand peaks in July and August.`;

  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `
        Analyze this vacation rental property for revenue forecasting:
        - Title: "${listing.title}"
        - City: ${listing.city}
        - Price per night: ₹${listing.price}
        - Current average rating: ${listing.rating}⭐
        - Amenities: ${listing.amenities.join(", ")}

        Provide a 12-month revenue projection and seasonal demand trends analysis. Specifically estimate:
        1. Expected weekly, monthly, quarterly, and annual revenues
        2. Expected average occupancy percentage
        3. Months of low demand and peak demand
        4. Revenue loss due to pricing gap and potential revenue gains by optimizing rates
        5. Best pricing strategy description
        6. A detailed explanation (aiRationale) explaining the forecast factors.

        Return STRICTLY as a JSON object matching this schema:
        {
          "weekly": number,
          "monthly": number,
          "quarterly": number,
          "yearly": number,
          "expectedOccupancy": number,
          "lowDemandPeriods": ["string", "string"],
          "peakDemandPeriods": ["string", "string"],
          "revenueLossDueToPricing": number,
          "potentialRevenueGain": number,
          "strategy": "string",
          "aiRationale": "string"
        }
        Return raw JSON only, no markdown.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const aiData = JSON.parse(cleanJson);

      return {
        ...aiData,
        chartData,
        seasonalTrends,
      };
    } catch (err) {
      logger.error("Gemini revenue forecast failed, running baseline fallback", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    weekly,
    monthly,
    quarterly,
    yearly,
    expectedOccupancy: baselineOccupancy,
    lowDemandPeriods,
    peakDemandPeriods,
    revenueLossDueToPricing,
    potentialRevenueGain,
    strategy,
    chartData,
    seasonalTrends,
    aiRationale,
  };
};
