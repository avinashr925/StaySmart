import { Request, Response, NextFunction } from "express";
import Wishlist from "../models/wishlist";
import Listing from "../models/listing";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const getWishlist = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  let wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: "listings",
    select: "title images price city country rating",
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, listings: [] });
  }

  res.status(200).json({
    status: "success",
    data: {
      wishlist,
    },
  });
});

export const toggleWishlist = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const { listingId } = req.body;

  if (!listingId) {
    return next(new AppError("Listing ID is required", 400));
  }

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  let wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, listings: [] });
  }

  const listingIndex = wishlist.listings.indexOf(listingId);
  let isAdded = false;

  if (listingIndex > -1) {
    wishlist.listings.splice(listingIndex, 1);
  } else {
    wishlist.listings.push(listingId);
    isAdded = true;
  }

  await wishlist.save();

  res.status(200).json({
    status: "success",
    message: isAdded ? "Listing added to wishlist" : "Listing removed from wishlist",
    data: {
      wishlist,
      isAdded,
    },
  });
});
