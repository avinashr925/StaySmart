import { Request, Response, NextFunction } from "express";
import Listing from "../models/listing";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import * as aiService from "../services/aiService";

export const semanticSearch = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return next(new AppError("Please provide a valid query string in the request body", 400));
  }

  // 1) Parse search parameters from query using Gemini/Heuristic parser
  const parsedParams = await aiService.parseSemanticQuery(query);

  // 2) Build Mongoose query based on extracted criteria
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

  // If there are keywords, create a search regex on title and description
  if (parsedParams.keywords && parsedParams.keywords.length > 0) {
    const regexPatterns = parsedParams.keywords.map(kw => new RegExp(kw, "i"));
    dbQuery.$or = [
      { title: { $in: regexPatterns } },
      { description: { $in: regexPatterns } },
      { amenities: { $in: regexPatterns } }
    ];
  }

  // 3) Retrieve properties from database
  const matchingListings = await Listing.find(dbQuery)
    .populate({ path: "owner", select: "name email avatar" })
    .limit(15);

  res.status(200).json({
    status: "success",
    data: {
      query,
      parsedParams,
      resultsCount: matchingListings.length,
      listings: matchingListings,
    },
  });
});

export const chatAssistant = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { message, history } = req.body;

  if (!message) {
    return next(new AppError("Please provide a message", 400));
  }

  const chatHistory = history || [];
  const botResponse = await aiService.generateChatResponse(message, chatHistory);

  res.status(200).json({
    status: "success",
    data: {
      response: botResponse,
    },
  });
});

export const predictPrice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { city, propertyType, bedrooms, bathrooms, guests, amenitiesCount } = req.query;

  if (!city || !propertyType || !bedrooms || !bathrooms || !guests) {
    return next(new AppError("Please provide all search specifications: city, propertyType, bedrooms, bathrooms, guests", 400));
  }

  const prediction = await aiService.predictListingPrice({
    city: city as string,
    propertyType: propertyType as string,
    bedrooms: Number(bedrooms),
    bathrooms: Number(bathrooms),
    guests: Number(guests),
    amenitiesCount: Number(amenitiesCount) || 0,
  });

  res.status(200).json({
    status: "success",
    data: prediction,
  });
});
