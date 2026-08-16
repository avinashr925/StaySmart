import { Request, Response, NextFunction } from "express";
import Listing from "../models/listing";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import * as searchService from "../services/ai/search";
import * as pricingService from "../services/ai/pricing";
import * as forecastingService from "../services/ai/forecasting";
import * as optimizerService from "../services/ai/optimizer";
import * as chatService from "../services/ai/chat";
import * as travelPlanner from "../services/ai/travelPlanner";
import { verifyAccessToken } from "../utils/jwt";
import User from "../models/user";

// -------------------------------------------------------------
// 1. SEMANTIC SEARCH & RECOMMENDATIONS
// -------------------------------------------------------------
export const semanticSearch = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return next(new AppError("Please provide a valid query string", 400));
  }

  const parsedParams = await searchService.parseSemanticQuery(query);
  const dbQuery: any = {};

  if (parsedParams.city) {
    dbQuery.city = new RegExp(parsedParams.city, "i");
  }
  if (parsedParams.country) {
    dbQuery.country = new RegExp(parsedParams.country, "i");
  }
  if (parsedParams.priceMax) {
    dbQuery.price = { $lte: parsedParams.priceMax };
  }
  if (parsedParams.propertyType) {
    dbQuery.propertyType = parsedParams.propertyType;
  }
  if (parsedParams.bedrooms) {
    dbQuery.bedrooms = { $gte: parsedParams.bedrooms };
  }
  if (parsedParams.guests) {
    dbQuery.guests = { $gte: parsedParams.guests };
  }
  if (parsedParams.instantBook !== undefined && parsedParams.instantBook !== null) {
    dbQuery.instantBook = parsedParams.instantBook;
  }

  if (parsedParams.keywords && parsedParams.keywords.length > 0) {
    const regexPatterns = parsedParams.keywords.map((kw) => new RegExp(kw, "i"));
    dbQuery.$or = [
      { title: { $in: regexPatterns } },
      { description: { $in: regexPatterns } },
      { amenities: { $in: regexPatterns } },
    ];
  }

  const listings = await Listing.find(dbQuery)
    .populate({ path: "owner", select: "name email avatar isSuperhost" })
    .limit(20);

  // Append explanation details (Phase 13 Explainability)
  const explainedListings = listings.map((l) => {
    const lJson = l.toJSON();
    return {
      ...lJson,
      aiRationale: parsedParams.aiRationale || `Matched because this ${l.propertyType} fits requested parameters in ${l.city}.`,
    };
  });

  res.status(200).json({
    status: "success",
    data: {
      query,
      parsedParams,
      resultsCount: explainedListings.length,
      listings: explainedListings,
    },
  });
});

export const getRecommendations = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const listings = await searchService.getRecommendations(userId?.toString());

  res.status(200).json({
    status: "success",
    results: listings.length,
    data: { listings },
  });
});

// -------------------------------------------------------------
// 2. PRICING & COMPETITORS
// -------------------------------------------------------------
export const getDynamicPricing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;

  if (!listingId) {
    return next(new AppError("Listing ID is required", 400));
  }

  const pricingMetrics = await pricingService.getDynamicPricing(listingId);

  res.status(200).json({
    status: "success",
    data: pricingMetrics,
  });
});

// -------------------------------------------------------------
// 3. REVENUE FORECASTING
// -------------------------------------------------------------
export const getRevenueForecast = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;

  if (!listingId) {
    return next(new AppError("Listing ID is required", 400));
  }

  const forecast = await forecastingService.getRevenueForecast(listingId);

  res.status(200).json({
    status: "success",
    data: { forecast },
  });
});

// -------------------------------------------------------------
// 4. OPTIMIZATION & REVIEWS ANALYSIS
// -------------------------------------------------------------
export const getListingOptimization = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;

  if (!listingId) {
    return next(new AppError("Listing ID is required", 400));
  }

  const optimization = await optimizerService.getListingOptimization(listingId);

  res.status(200).json({
    status: "success",
    data: { optimization },
  });
});

export const getReviewIntelligence = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;

  if (!listingId) {
    return next(new AppError("Listing ID is required", 400));
  }

  const reviewsSummary = await optimizerService.getReviewIntelligence(listingId);

  res.status(200).json({
    status: "success",
    data: { summary: reviewsSummary },
  });
});

// -------------------------------------------------------------
// 5. CHAT ASSISTANTS
// -------------------------------------------------------------
export const chatAssistant = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { message, history, type } = req.body; // type: 'host' | 'guest'

  if (!message) {
    return next(new AppError("Please provide a message", 400));
  }

  const chatHistory = history || [];
  let botResponse: chatService.IChatResponse;

  if (type === "host") {
    // Optional JWT check to populate Host context
    let authenticatedUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = verifyAccessToken(token);
        authenticatedUser = await User.findById(decoded.userId);
      } catch (err) {
        // Ignore token problems for optional endpoint access
      }
    }

    let hostListings: any[] = [];
    if (authenticatedUser) {
      hostListings = await Listing.find({ owner: authenticatedUser._id, maintenanceMode: { $ne: true } })
        .select("title price city description capacity guests bedrooms bathrooms amenities");
    }

    botResponse = await chatService.getHostChatResponse(message, chatHistory, hostListings);
  } else {
    botResponse = await chatService.getGuestChatResponse(message, chatHistory);
  }

  res.status(200).json({
    status: "success",
    data: { 
      response: botResponse.response,
      isFallback: botResponse.isFallback
    },
  });
});

export const generateItinerary = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { destination, days, budget, interests } = req.body;
  if (!destination || !days || !budget) {
    return next(new AppError("Destination, days, and budget are required", 400));
  }

  const itinerary = await travelPlanner.generateItinerary({ destination, days: Number(days), budget: Number(budget), interests });
  res.status(200).json({
    status: "success",
    data: { itinerary },
  });
});
