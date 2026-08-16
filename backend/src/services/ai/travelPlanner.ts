import { logger } from "../../utils/logger";
import { getGenAI, GEMINI_MODEL } from "../../config/gemini";

export interface IItineraryRequest {
  destination: string;
  days: number;
  budget: number;
  interests?: string;
}

export const generateItinerary = async (reqBody: IItineraryRequest): Promise<string> => {
  const { destination, days, budget, interests } = reqBody;

  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `
        You are "StaySmart AI Tour & Travel Planner", an elite concierge.
        Generate a comprehensive day-by-day travel itinerary for a trip to "${destination}".
        - Duration: ${days} days
        - Approximate Budget: ₹${budget} total
        - Specific Traveler Interests/Preferences: ${interests || "General sightseeing, local food, culture"}
        
        For each day, structure details for:
        1. Morning Activity (Sightseeing/Relaxation)
        2. Lunch recommendations (local specialties)
        3. Afternoon & Evening agenda (Adventure or scenic locations)
        4. Budget-aligned dining (estimated costs in INR)
        5. Public transit or transport tips for that specific path.

        Format the output with professional markdown headings, emojis, bullet points, and a concluding section with budget breakdown forecasts.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      logger.error("Gemini Itinerary generator failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Authoritative deterministic fallback generator
  return `
# 🗺️ [Offline Fallback] Your Customized StaySmart Itinerary: ${destination}

Here is your exclusive travel itinerary crafted for a **${days}-day** trip with a budget of **₹${budget.toLocaleString()}**.

---

## 🗓️ Day 1: Arrival & Coastal Discovery
*   **Morning**: Check in to your StaySmart vacation home. Settle in and enjoy a welcome coconut drink.
*   **Lunch**: Dine at a local beachfront cafe. Enjoy fresh regional specialties (approx. ₹600).
*   **Afternoon**: Explore local historical sights or walk along the main boardwalk.
*   **Evening**: Sunset watch at a scenic viewpoint followed by a seafood dinner (approx. ₹1,200).
*   **Transport**: Local rickshaws or walk.

## 🗓️ Day 2: Culture & Hidden Gems
*   **Morning**: Visit nearby historic temples/churches or take a local heritage walk (budget friendly).
*   **Lunch**: Sample traditional street food options at the central market (approx. ₹400).
*   **Afternoon**: Join a guided spice plantation or pottery workshop (Interests: *${interests || "Culture"}*).
*   **Evening**: Dine at a garden cafe with live music (approx. ₹900).
*   **Transport**: Rent a scooter or call transit cabs.

${days > 2 ? `
## 🗓️ Day 3: Leisure & Departure Prep
*   **Morning**: Buy local souvenirs and artisanal crafts at the flea market.
*   **Lunch**: Traditional thali lunch at a highly-rated family restaurant (approx. ₹700).
*   **Afternoon**: Relax at a quiet park or enjoy an in-house spa treatment.
*   **Evening**: Sunset cruise along the backwaters with dinner (approx. ₹1,500).
*   **Transport**: Pre-booked cabs.
` : ""}

---

## 📊 Estimated Budget Allocation
- **Lodging/Stay**: Included in booking.
- **Dining/Food**: ₹${(days * 1800).toLocaleString()}
- **Sightseeing & Local Guides**: ₹${(budget * 0.15).toLocaleString()}
- **Local Transit/Transport**: ₹${(days * 600).toLocaleString()}
- **Contingency / Souvenirs**: Balance remaining.
`;
};
