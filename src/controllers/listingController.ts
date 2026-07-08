import { Request, Response, NextFunction } from "express";
import Listing from "../models/listing";
import Review from "../models/review";
import Booking from "../models/booking";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getUploadedUrls } from "../utils/fileUpload";

// Simple In-Memory Cache for listings
// Key: stringified query params, Value: listings data, Expiry: 1 minute
interface ICacheEntry {
  data: any;
  timestamp: number;
}
const listCache = new Map<string, ICacheEntry>();
const CACHE_DURATION_MS = 60 * 1000; // 1 minute

const clearListCache = () => {
  listCache.clear();
};

export const getAllListings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // Generate cache key
  const cacheKey = JSON.stringify(req.query);
  const cached = listCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return res.status(200).json(cached.data);
  }

  // 1) Filtering
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields", "search", "lat", "lng", "distance"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // Construct MongoDB query
  const query: any = {};

  // Text search
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search as string, "i");
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { city: searchRegex },
      { country: searchRegex },
      { address: searchRegex },
    ];
  }

  // Numeric range filters (price, bedrooms, bathrooms, guests)
  if (req.query.priceMin || req.query.priceMax) {
    query.price = {};
    if (req.query.priceMin) query.price.$gte = Number(req.query.priceMin);
    if (req.query.priceMax) query.price.$lte = Number(req.query.priceMax);
  }

  if (req.query.bedrooms) query.bedrooms = { $gte: Number(req.query.bedrooms) };
  if (req.query.bathrooms) query.bathrooms = { $gte: Number(req.query.bathrooms) };
  if (req.query.guests) query.guests = { $gte: Number(req.query.guests) };

  // Exact Match Filters
  if (req.query.city) query.city = new RegExp(req.query.city as string, "i");
  if (req.query.country) query.country = new RegExp(req.query.country as string, "i");
  if (req.query.propertyType) query.propertyType = req.query.propertyType;

  // Amenities array matching (must contain all selected amenities)
  if (req.query.amenities) {
    const amenitiesArr = (req.query.amenities as string).split(",");
    query.amenities = { $all: amenitiesArr };
  }

  // Geolocation queries (within radius in meters)
  if (req.query.lat && req.query.lng) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const distanceMeters = Number(req.query.distance) || 10000; // Default 10km

    query.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: distanceMeters,
      },
    };
  }

  // 2) Pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // 3) Execute Query
  const totalListings = await Listing.countDocuments(query);
  const listings = await Listing.find(query)
    .populate({ path: "owner", select: "name email avatar" })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const result = {
    status: "success",
    results: listings.length,
    total: totalListings,
    page,
    totalPages: Math.ceil(totalListings / limit),
    data: { listings },
  };

  // Cache the result
  listCache.set(cacheKey, { data: result, timestamp: Date.now() });

  res.status(200).json(result);
});

export const getListing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const listing = await Listing.findById(id).populate({
    path: "owner",
    select: "name email avatar role",
  });

  if (!listing) {
    return next(new AppError("Listing not found with that ID", 404));
  }

  // Fetch reviews separately
  const reviews = await Review.find({ listing: id }).populate({
    path: "author",
    select: "name email avatar",
  });

  res.status(200).json({
    status: "success",
    data: {
      listing,
      reviews,
    },
  });
});

export const createListing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const uploadedUrls = getUploadedUrls(req.files);
  
  // Extract coordinate fields if present
  const lat = req.body.latitude ? Number(req.body.latitude) : 15.5414;
  const lng = req.body.longitude ? Number(req.body.longitude) : 73.7486;

  const listingData = {
    ...req.body,
    owner: req.user?._id,
    location: {
      type: "Point",
      coordinates: [lng, lat],
    },
  };

  if (uploadedUrls.length > 0) {
    listingData.images = uploadedUrls;
  }

  // Convert amenities from string format if needed (e.g. CSV from form-data)
  if (typeof req.body.amenities === "string") {
    listingData.amenities = req.body.amenities.split(",").map((s: string) => s.trim());
  }

  const newListing = await Listing.create(listingData);
  
  // Invalidate cache
  clearListCache();

  res.status(201).json({
    status: "success",
    data: {
      listing: newListing,
    },
  });
});

export const updateListing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return next(new AppError("Listing not found with that ID", 404));
  }

  // Check if current user is owner (or Admin)
  if (listing.owner.toString() !== req.user?._id.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to edit this listing", 403));
  }

  const uploadedUrls = getUploadedUrls(req.files);
  const updateData = { ...req.body };

  if (uploadedUrls.length > 0) {
    updateData.images = uploadedUrls;
  }

  // Format geolocation fields if changing coordinates
  if (req.body.latitude || req.body.longitude) {
    const lat = req.body.latitude ? Number(req.body.latitude) : listing.location.coordinates[1];
    const lng = req.body.longitude ? Number(req.body.longitude) : listing.location.coordinates[0];
    updateData.location = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }

  if (typeof req.body.amenities === "string") {
    updateData.amenities = req.body.amenities.split(",").map((s: string) => s.trim());
  }

  const updatedListing = await Listing.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  // Invalidate cache
  clearListCache();

  res.status(200).json({
    status: "success",
    data: {
      listing: updatedListing,
    },
  });
});

export const deleteListing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return next(new AppError("Listing not found with that ID", 404));
  }

  // Check owner authorization
  if (listing.owner.toString() !== req.user?._id.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to delete this listing", 403));
  }

  await Listing.findByIdAndDelete(id);

  // Clean up reviews and bookings
  await Review.deleteMany({ listing: id });
  await Booking.deleteMany({ listing: id });

  // Invalidate cache
  clearListCache();

  res.status(200).json({
    status: "success",
    message: "Listing and associated reviews/bookings deleted successfully",
  });
});

export const getHostListings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const hostId = req.user?._id;
  const listings = await Listing.find({ owner: hostId }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: listings.length,
    data: { listings },
  });
});
