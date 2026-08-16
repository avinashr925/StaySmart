import { Router } from "express";
import * as aiController from "../controllers/aiController";
import { protect, requireOwner } from "../middlewares/auth";

const router = Router();

// Public / general AI endpoints
router.post("/search", aiController.semanticSearch);
router.post("/chat", aiController.chatAssistant);

// Protected user-specific AI analytics (requires auth)
router.get("/recommendations", protect, aiController.getRecommendations);
router.post("/itinerary", protect, aiController.generateItinerary);

// These expose commercially sensitive, listing-owner-only intelligence
// (pricing strategy, revenue forecasts, optimization/review analysis).
// requireOwner("Listing") checks req.params.listingId against the listing's
// `owner` field (Admins/SuperAdmins bypass), preventing any authenticated
// user from pulling another host's data by guessing a listing ID.
router.get("/pricing/:listingId", protect, requireOwner("Listing"), aiController.getDynamicPricing);
router.get("/forecast/:listingId", protect, requireOwner("Listing"), aiController.getRevenueForecast);
router.get("/optimize/:listingId", protect, requireOwner("Listing"), aiController.getListingOptimization);
router.get("/reviews/:listingId", protect, requireOwner("Listing"), aiController.getReviewIntelligence);

export default router;
