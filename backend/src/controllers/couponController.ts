import { Request, Response, NextFunction } from "express";
import Coupon from "../models/coupon";
import Listing from "../models/listing";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const getHostCoupons = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const hostId = req.user?._id;
  const coupons = await Coupon.find({ host: hostId }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: coupons.length,
    data: { coupons },
  });
});

export const createCoupon = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { code, discountPercent, listingId } = req.body;
  const hostId = req.user?._id;

  if (!code || discountPercent === undefined || discountPercent === null || !listingId) {
    return next(new AppError("Coupon code, discount percentage, and listing ID are required", 400));
  }

  const percent = Number(discountPercent);
  if (isNaN(percent) || percent < 5 || percent > 100) {
    return next(new AppError("Discount percentage must be between 5% and 100%", 400));
  }

  // Verify that the listing exists and is owned by the authenticated host
  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }
  if (listing.owner.toString() !== hostId?.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You can only create coupons for your own listings", 403));
  }

  // Check if coupon already exists
  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) {
    return next(new AppError("A coupon with this code already exists", 400));
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountPercent: percent,
    host: hostId,
    eligibleListings: [listingId],
  });

  res.status(201).json({
    status: "success",
    data: { coupon },
  });
});

export const toggleCouponActive = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  if (coupon.host?.toString() !== req.user?._id.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to manage this coupon", 403));
  }

  coupon.active = !coupon.active;
  await coupon.save();

  res.status(200).json({
    status: "success",
    data: { coupon },
  });
});

export const deleteCoupon = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  if (coupon.host?.toString() !== req.user?._id.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to delete this coupon", 403));
  }

  await Coupon.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const validateCoupon = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.params;

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });

  if (!coupon) {
    return next(new AppError("Invalid or inactive coupon code", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      code: coupon.code,
      discountPercent: coupon.discountPercent,
    },
  });
});

export const getAvailableCoupons = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId, bookingAmount } = req.query;
  const userId = req.user?._id;

  const now = new Date();
  
  // Find all active coupons
  const allActiveCoupons = await Coupon.find({ active: true });

  const availableCoupons = allActiveCoupons.filter((c) => {
    // 1) Check expiration
    if (c.expirationDate && new Date(c.expirationDate) < now) {
      return false;
    }

    // 2) Check usage limit
    if (c.usageLimit !== undefined && c.usageLimit !== null && c.usedCount >= c.usageLimit) {
      return false;
    }

    // 3) Check minimum booking amount
    if (bookingAmount && c.minBookingAmount && Number(bookingAmount) < c.minBookingAmount) {
      return false;
    }

    // 4) Check eligible listings
    if (!listingId) return false;
    if (!c.eligibleListings || c.eligibleListings.length === 0) {
      return false; // must be explicitly associated with a listing
    }
    const isEligible = c.eligibleListings.some(
      (id) => id.toString() === listingId.toString()
    );
    if (!isEligible) return false;

    // 5) Check eligible users
    if (userId && c.eligibleUsers && c.eligibleUsers.length > 0) {
      const isEligible = c.eligibleUsers.some(
        (id) => id.toString() === userId.toString()
      );
      if (!isEligible) return false;
    }

    return true;
  });

  res.status(200).json({
    status: "success",
    results: availableCoupons.length,
    data: { coupons: availableCoupons },
  });
});
