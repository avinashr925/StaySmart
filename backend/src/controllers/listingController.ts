import { Request, Response, NextFunction } from "express";
import axios from "axios";
import Listing from "../models/listing";
import Review from "../models/review";
import Booking from "../models/booking";
import User from "../models/user";
import Payment from "../models/payment";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getUploadedUrls } from "../utils/fileUpload";
import { getCachedWeather, getCachedAttractions } from "../services/geodataService";
import { logger } from "../utils/logger";
import CheckoutLock from "../models/checkoutLock";
import AuditLog from "../models/auditLog";

async function geocodeAddress(
  address?: string,
  city?: string,
  country?: string
): Promise<{ lat: number; lng: number } | null> {
  if (!address || !city || !country) return null;
  try {
    const query = encodeURIComponent(`${address}, ${city}, ${country}`);
    logger.info(`[Geocoding] Resolving address: ${address}, ${city}, ${country}`);
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          "User-Agent": "StaySmart-Vacation-Rentals/1.0",
        },
        timeout: 6000,
      }
    );
    if (response.data && response.data.length > 0) {
      const lat = Number(response.data[0].lat);
      const lng = Number(response.data[0].lon);
      logger.info(`[Geocoding] Resolved to lat: ${lat}, lng: ${lng}`);
      return { lat, lng };
    }
  } catch (err: any) {
    logger.error(`[Geocoding Error] Failed to geocode address: ${err.message}`);
  }
  return null;
}


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
  const excludedFields = [
    "page",
    "sort",
    "limit",
    "fields",
    "search",
    "lat",
    "lng",
    "distance",
    "superhost",
    "instantBook",
    "commuteTime",
    "commuteMode",
  ];
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

  // Instant Book Filter
  if (req.query.instantBook) {
    query.instantBook = req.query.instantBook === "true";
  }

  // Superhost Filter
  if (req.query.superhost === "true") {
    const superhosts = await User.find({ role: "Host", isSuperhost: true }).select("_id");
    const superhostIds = superhosts.map((sh) => sh._id);
    query.owner = { $in: superhostIds };
  }

  // Amenities array matching (must contain all selected amenities)
  if (req.query.amenities) {
    const amenitiesArr = (req.query.amenities as string).split(",");
    query.amenities = { $all: amenitiesArr };
  }

  // Geolocation & commute-time radius queries
  if (req.query.lat && req.query.lng) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    let distanceMeters = Number(req.query.distance) || 10000; // Default 10km

    if (req.query.commuteTime) {
      const commuteTime = Number(req.query.commuteTime);
      const mode = (req.query.commuteMode as string) || "driving";
      let speed = 600; // meters per minute (driving = 36km/h)
      if (mode === "walking") speed = 80; // 4.8 km/h
      else if (mode === "transit") speed = 350; // 21 km/h average
      
      distanceMeters = speed * commuteTime;
    }

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

  // 2) Sorting options
  let sortOption: any = { createdAt: -1 };
  if (req.query.sort) {
    const sortVal = req.query.sort as string;
    if (sortVal === "price-asc") sortOption = { price: 1 };
    else if (sortVal === "price-desc") sortOption = { price: -1 };
    else if (sortVal === "rating") sortOption = { rating: -1, reviewCount: -1 };
    else if (sortVal === "newest") sortOption = { createdAt: -1 };
  }

  // 3) Pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // 4) Execute Query
  const totalListings = await Listing.countDocuments(query);
  const listings = await Listing.find(query)
    .populate({ path: "owner", select: "name email avatar isSuperhost" })
    .skip(skip)
    .limit(limit)
    .sort(sortOption);

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

export const uploadListingImage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }
  const urls = getUploadedUrls([req.file]);
  res.status(200).json({
    status: "success",
    data: {
      url: urls[0],
      fileName: req.file.originalname,
    },
  });
});

export const createListing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "Admin" && req.user?.role !== "SuperAdmin") {
    if (!req.user?.isOnboarded) {
      return next(
        new AppError(
          "You must complete Host Onboarding before publishing listings.",
          400
        )
      );
    }
  }

  const uploadedUrls = getUploadedUrls(req.files);
  const uploadedFiles = (req.files || []) as any[];

  // Extract coordinate fields if present
  let lat = req.body.latitude ? Number(req.body.latitude) : null;
  let lng = req.body.longitude ? Number(req.body.longitude) : null;

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    // Attempt geocoding based on address, city, country
    const coords = await geocodeAddress(req.body.address, req.body.city, req.body.country);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    } else {
      return next(
        new AppError(
          "Could not resolve location coordinates. Please verify your address details or input coordinates manually.",
          400
        )
      );
    }
  }

  const listingData = {
    ...req.body,
    owner: req.user?._id,
    location: {
      type: "Point",
      coordinates: [lng, lat],
    },
  };

  // Build imageDetails
  let metadata: any[] = [];
  if (req.body.imageMetadata) {
    metadata = typeof req.body.imageMetadata === "string"
      ? JSON.parse(req.body.imageMetadata)
      : req.body.imageMetadata;
  }

  // Handle pre-uploaded images or existing images sent in JSON body
  let bodyImages: any[] = [];
  if (req.body.existingImages) {
    bodyImages = typeof req.body.existingImages === "string"
      ? JSON.parse(req.body.existingImages)
      : req.body.existingImages;
  } else if (req.body.imageDetails) {
    bodyImages = typeof req.body.imageDetails === "string"
      ? JSON.parse(req.body.imageDetails)
      : req.body.imageDetails;
  }

  const newUploadedDetails = uploadedFiles.map((file: any, idx: number) => {
    const url = uploadedUrls[idx];
    const meta = metadata.find((m: any) => m.fileName === file.originalname) || {};
    return {
      url,
      category: meta.category || "Other",
      order: meta.order !== undefined ? Number(meta.order) : idx,
      isCover: meta.isCover === true || meta.isCover === "true",
    };
  });

  const finalImageDetails = [...bodyImages, ...newUploadedDetails];

  const hasCover = finalImageDetails.some((img: any) => img.isCover);
  if (finalImageDetails.length > 0 && !hasCover) {
    finalImageDetails[0].isCover = true;
  }
  finalImageDetails.sort((a: any, b: any) => a.order - b.order);
  listingData.imageDetails = finalImageDetails;
  listingData.images = finalImageDetails.map((img: any) => img.url);

  // Convert amenities from string format if needed (e.g. CSV from form-data)
  if (typeof req.body.amenities === "string") {
    listingData.amenities = req.body.amenities.split(",").map((s: string) => s.trim());
  }

  // Parse virtualTour if passed as string JSON from form-data
  if (typeof req.body.virtualTour === "string" && req.body.virtualTour.trim() !== "") {
    try {
      listingData.virtualTour = JSON.parse(req.body.virtualTour);
    } catch (e) {
      // parsed values will be validated by the Zod validator schema
    }
  }

  // Parse houseRules if passed as string JSON from form-data
  if (typeof req.body.houseRules === "string" && req.body.houseRules.trim() !== "") {
    try {
      listingData.houseRules = JSON.parse(req.body.houseRules);
    } catch (e) {
      // ignore
    }
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
  if (req.user?.role !== "Admin" && req.user?.role !== "SuperAdmin") {
    const status = req.user?.paymentProfile?.status;
    if (status !== "ACTIVE" && status !== "VERIFICATION_PENDING") {
      return next(
        new AppError(
          "You must complete host payment onboarding (Bank/Razorpay Setup) before modifying listings.",
          400
        )
      );
    }
  }

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
  const uploadedFiles = (req.files || []) as any[];
  const updateData = { ...req.body };

  // Parse imageMetadata if provided
  let metadata: any[] = [];
  if (req.body.imageMetadata) {
    metadata = typeof req.body.imageMetadata === "string"
      ? JSON.parse(req.body.imageMetadata)
      : req.body.imageMetadata;
  }

  // Newly uploaded imageDetails
  const newImageDetails = uploadedFiles.map((file: any, idx: number) => {
    const url = uploadedUrls[idx];
    const meta = metadata.find((m: any) => m.fileName === file.originalname) || {};
    return {
      url,
      category: meta.category || "Other",
      order: meta.order !== undefined ? Number(meta.order) : (listing.imageDetails?.length || 0) + idx,
      isCover: meta.isCover === true || meta.isCover === "true",
    };
  });

  // Existing imageDetails sent from the frontend
  let existingImageDetails: any[] = [];
  if (req.body.existingImages) {
    existingImageDetails = typeof req.body.existingImages === "string"
      ? JSON.parse(req.body.existingImages)
      : req.body.existingImages;
  } else if (req.body.imageDetails) {
    existingImageDetails = typeof req.body.imageDetails === "string"
      ? JSON.parse(req.body.imageDetails)
      : req.body.imageDetails;
  } else {
    existingImageDetails = listing.imageDetails || [];
  }

  const finalImageDetails = [...existingImageDetails, ...newImageDetails];

  const hasCover = finalImageDetails.some((img: any) => img.isCover);
  if (finalImageDetails.length > 0 && !hasCover) {
    finalImageDetails[0].isCover = true;
  }
  finalImageDetails.sort((a: any, b: any) => a.order - b.order);
  updateData.imageDetails = finalImageDetails;
  updateData.images = finalImageDetails.map((img: any) => img.url);

  // Format geolocation fields if changing coordinates or address
  if (req.body.latitude || req.body.longitude || req.body.address || req.body.city || req.body.country) {
    let lat = req.body.latitude ? Number(req.body.latitude) : null;
    let lng = req.body.longitude ? Number(req.body.longitude) : null;

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      const targetAddress = req.body.address || listing.address;
      const targetCity = req.body.city || listing.city;
      const targetCountry = req.body.country || listing.country;
      
      const coords = await geocodeAddress(targetAddress, targetCity, targetCountry);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      } else {
        // Fall back to original coordinates if geocoding fails
        lat = listing.location.coordinates[1];
        lng = listing.location.coordinates[0];
      }
    }
    updateData.location = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }

  if (typeof req.body.amenities === "string") {
    updateData.amenities = req.body.amenities.split(",").map((s: string) => s.trim());
  }

  // Parse virtualTour if passed as string JSON from form-data
  if (typeof req.body.virtualTour === "string" && req.body.virtualTour.trim() !== "") {
    try {
      updateData.virtualTour = JSON.parse(req.body.virtualTour);
    } catch (e) {
      // parsed values will be validated by the Zod validator schema
    }
  }

  // Parse houseRules if passed as string JSON from form-data
  if (typeof req.body.houseRules === "string" && req.body.houseRules.trim() !== "") {
    try {
      updateData.houseRules = JSON.parse(req.body.houseRules);
    } catch (e) {
      // ignore
    }
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

export const getHostAnalytics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const hostId = req.user?._id;
  const listings = await Listing.find({ owner: hostId });
  const listingIds = listings.map((l) => l._id);

  if (listings.length === 0) {
    return res.status(200).json({
      status: "success",
      data: {
        totalEarnings: 0,
        pendingEarnings: 0,
        settledEarnings: 0,
        bookingsCount: 0,
        grossBookingValue: 0,
        platformFees: 0,
        refunds: 0,
        netHostEarnings: 0,
        occupancyRate: 0,
        cancellationRate: 0,
        monthlyEarnings: [],
        transactionHistory: [],
      },
    });
  }

  // Find all bookings for these listings
  const allBookings = await Booking.find({ listing: { $in: listingIds } });
  const bookingIds = allBookings.map((b) => b._id);

  // Find all payment records for these bookings
  const payments = await Payment.find({ booking: { $in: bookingIds } }).populate("user", "name email");

  // Filter payments
  const successfulPayments = payments.filter((p) => p.status === "Succeeded");
  const refundedPayments = payments.filter((p) => p.status === "Refunded");

  // Sum financial fields
  const grossBookingValue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const platformFees = successfulPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
  const totalEarnings = successfulPayments.reduce((sum, p) => sum + (p.hostAmount || (p.amount * 0.90)), 0);
  const pendingEarnings = successfulPayments
    .filter((p) => p.transferStatus === "Pending" || p.transferStatus === "Failed")
    .reduce((sum, p) => sum + (p.hostAmount || (p.amount * 0.90)), 0);
  const settledEarnings = successfulPayments
    .filter((p) => p.transferStatus === "Settled")
    .reduce((sum, p) => sum + (p.hostAmount || (p.amount * 0.90)), 0);

  const refunds = refundedPayments.reduce((sum, p) => sum + p.amount, 0);
  // Corrected calculation: totalEarnings only sums Succeeded payments, so refunded payments are already excluded.
  const netHostEarnings = totalEarnings;

  const bookingsCount = successfulPayments.length;

  // Occupancy Rate (over the last 30 days) - counting both Confirmed and Completed stays
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeBookings = allBookings.filter((b) => b.status === "Confirmed" || b.status === "Completed");
  const recentBookings = activeBookings.filter((b) => b.startDate >= thirtyDaysAgo);
  const totalBookedDays = recentBookings.reduce((sum, b) => {
    const start = Math.max(b.startDate.getTime(), thirtyDaysAgo.getTime());
    const end = b.endDate.getTime();
    const days = (end - start) / (1000 * 60 * 60 * 24);
    return sum + (days > 0 ? days : 0);
  }, 0);

  const potentialDays = listings.length * 30;
  const occupancyRate = potentialDays > 0
    ? Math.min(100, Math.round((totalBookedDays / potentialDays) * 100))
    : 0;

  // Cancellation Rate
  const cancelledCount = allBookings.filter((b) => b.status === "Cancelled").length;
  const cancellationRate = allBookings.length > 0
    ? Math.round((cancelledCount / allBookings.length) * 100)
    : 0;

  // Additional granular stats
  const pendingVerificationCount = allBookings.filter((b) => b.status === "PendingVerification").length;
  const upcomingBookingsCount = allBookings.filter((b) => b.status === "Confirmed" && new Date(b.startDate) > new Date()).length;
  const completedBookingsCount = allBookings.filter((b) => b.status === "Completed" || (b.status === "Confirmed" && new Date(b.endDate) < new Date())).length;
  const cancelledBookingsCount = cancelledCount;
  const totalBookingsCount = allBookings.length;
  const averageBookingValue = bookingsCount > 0 ? (grossBookingValue / bookingsCount) : 0;

  // Transaction History
  const transactionHistory = payments.map((p) => {
    const b = allBookings.find((bk) => bk._id.toString() === p.booking.toString());
    const l = listings.find((ls) => ls._id.toString() === b?.listing.toString());
    return {
      paymentId: p.paymentId || "N/A",
      bookingId: p.booking.toString(),
      listingTitle: l?.title || "Stay Booking",
      guestName: (p.user as any)?.name || "Guest",
      amount: p.amount,
      platformFee: p.platformFee || 0,
      hostAmount: p.hostAmount || (p.amount * 0.90),
      status: p.status,
      transferStatus: p.transferStatus || "Pending",
      createdAt: p.createdAt,
    };
  });

  // Group successful payments by month in local India time
  const monthlyMap: Record<string, number> = {};
  successfulPayments.forEach((p) => {
    try {
      const payDate = new Date(p.createdAt);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
      });
      const parts = formatter.formatToParts(payDate);
      const monthVal = parts.find(part => part.type === 'month')?.value;
      const yearVal = parts.find(part => part.type === 'year')?.value;
      
      if (monthVal && yearVal) {
        const key = `${yearVal}-${monthVal}`;
        const earnings = p.hostAmount || (p.amount * 0.90);
        monthlyMap[key] = (monthlyMap[key] || 0) + earnings;
      }
    } catch (err) {
      console.error("Error formatting payment date", err);
    }
  });

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Generate sliding 12-month window in Indian time
  const monthlyEarnings: Array<{ month: string; earnings: number }> = [];
  const currentDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    const label = `${monthNames[monthIndex]} ${year}`;
    
    const padMonth = String(monthIndex + 1).padStart(2, "0");
    const key = `${year}-${padMonth}`;
    
    const earnings = monthlyMap[key] || 0;
    
    monthlyEarnings.push({
      month: label,
      earnings: Math.round(earnings),
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      totalEarnings,
      pendingEarnings,
      settledEarnings,
      bookingsCount,
      grossBookingValue,
      platformFees,
      refunds,
      netHostEarnings,
      occupancyRate,
      cancellationRate,
      monthlyEarnings,
      transactionHistory,
      pendingVerificationCount,
      upcomingBookingsCount,
      completedBookingsCount,
      cancelledBookingsCount,
      totalBookingsCount,
      averageBookingValue,
    },
  });
});

export const getListingWeather = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  const [lng, lat] = listing.location.coordinates;
  const weather = await getCachedWeather(lat, lng);

  res.status(200).json({
    status: "success",
    data: { weather },
  });
});

export const getListingAttractions = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  const [lng, lat] = listing.location.coordinates;
  const attractions = await getCachedAttractions(lat, lng, listing.city, listing.country);

  res.status(200).json({
    status: "success",
    data: { attractions },
  });
});

export const getListingCalendar = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  // Check if current user is owner (or Admin)
  if (listing.owner.toString() !== req.user?._id.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to view this listing's calendar", 403));
  }

  const bookings = await Booking.find({
    listing: id,
    status: { $in: ["Confirmed", "Pending", "PendingVerification"] },
  }).populate("user", "name email");

  const locks = await CheckoutLock.find({
    listing: id,
    createdAt: { $gte: new Date(Date.now() - 300 * 1000) } // Active locks (less than 5 min old)
  }).populate("user", "name email");

  res.status(200).json({
    status: "success",
    data: {
      blackoutDates: listing.blackoutDates || [],
      bookings: bookings.map(b => ({
        id: b._id,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
        guest: b.user
      })),
      locks: locks.map(l => ({
        startDate: l.startDate,
        endDate: l.endDate,
        user: l.user
      }))
    }
  });
});

export const blockListingDates = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { startDate, endDate, type, reason } = req.body;

  if (!startDate || !endDate) {
    return next(new AppError("Start date and end date are required.", 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return next(new AppError("Invalid date range.", 400));
  }

  const listing = await Listing.findById(id);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  // Check ownership
  if (listing.owner.toString() !== req.user?._id.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to modify this listing's calendar", 403));
  }

  // Prevent blocking dates that have confirmed bookings
  const confirmedBooking = await Booking.findOne({
    listing: id,
    status: "Confirmed",
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } },
    ],
  });

  if (confirmedBooking) {
    return next(
      new AppError(
        "These dates contain an existing reservation. You cannot block them.",
        400
      )
    );
  }

  // Add the blackout dates
  listing.blackoutDates.push({
    startDate: start,
    endDate: end,
    type: type || "host-blocked",
    reason: reason || "",
  } as any);

  await listing.save({ validateBeforeSave: false });
  clearListCache();

  // Create audit log for the operation
  await AuditLog.create({
    user: req.user?._id,
    action: "listing_dates_blocked",
    targetType: "Listing",
    targetId: id,
    metadata: {
      startDate: start,
      endDate: end,
      type: type || "host-blocked",
      reason: reason || "",
    },
    ipAddress: req.ip || "unknown",
  }).catch((err) => logger.error("Failed to create audit log for block-dates", { error: err.message }));

  res.status(200).json({
    status: "success",
    message: `Dates blocked successfully as ${type || "host-blocked"}.`,
    data: { blackoutDates: listing.blackoutDates },
  });
});

export const unblockListingDates = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return next(new AppError("Start date and end date are required.", 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const listing = await Listing.findById(id);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  // Check ownership
  if (listing.owner.toString() !== req.user?._id.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to modify this listing's calendar", 403));
  }

  // Filter out the exact blackout slot (or any overlapping blackout slot)
  const originalLength = listing.blackoutDates.length;
  listing.blackoutDates = listing.blackoutDates.filter((slot: any) => {
    const sStart = new Date(slot.startDate);
    const sEnd = new Date(slot.endDate);
    return !(sStart.getTime() === start.getTime() && sEnd.getTime() === end.getTime());
  });

  if (listing.blackoutDates.length === originalLength) {
    listing.blackoutDates = listing.blackoutDates.filter((slot: any) => {
      const sStart = new Date(slot.startDate);
      const sEnd = new Date(slot.endDate);
      return !(sStart < end && sEnd > start);
    });
  }

  await listing.save({ validateBeforeSave: false });
  clearListCache();

  // Create audit log for the operation
  await AuditLog.create({
    user: req.user?._id,
    action: "listing_dates_unblocked",
    targetType: "Listing",
    targetId: id,
    metadata: {
      startDate: start,
      endDate: end,
    },
    ipAddress: req.ip || "unknown",
  }).catch((err) => logger.error("Failed to create audit log for unblock-dates", { error: err.message }));

  res.status(200).json({
    status: "success",
    message: "Dates unblocked successfully.",
    data: { blackoutDates: listing.blackoutDates },
  });
});
