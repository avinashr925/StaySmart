import { Request, Response, NextFunction } from "express";
import Review from "../models/review";
import Listing from "../models/listing";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getUploadedUrls } from "../utils/fileUpload";

// Recalculates and updates the average rating and review count of a listing
const updateListingStats = async (listingId: string) => {
  const stats = await Review.aggregate([
    { $match: { listing: new RegExp(listingId) } }, // Use dynamic casting if needed, but since it's ObjectId:
  ]);

  // A more robust way to do this with Mongoose is using mongoose.Types.ObjectId
  const mongoose = require("mongoose");
  const listingObjectId = new mongoose.Types.ObjectId(listingId);

  const aggregateStats = await Review.aggregate([
    { $match: { listing: listingObjectId } },
    {
      $group: {
        _id: "$listing",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (aggregateStats.length > 0) {
    await Listing.findByIdAndUpdate(listingId, {
      rating: Math.round(aggregateStats[0].avgRating * 10) / 10,
      reviewCount: aggregateStats[0].nRating,
    });
  } else {
    await Listing.findByIdAndUpdate(listingId, {
      rating: 0,
      reviewCount: 0,
    });
  }
};

export const createReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;
  const authorId = req.user?._id;
  const { rating, comment } = req.body;

  // 1) Check if listing exists
  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  // 2) Check if user already reviewed
  const existingReview = await Review.findOne({ listing: listingId, author: authorId });
  if (existingReview) {
    return next(new AppError("You have already reviewed this listing. You can update your existing review.", 400));
  }

  const uploadedUrls = getUploadedUrls(req.files);

  // 3) Create review
  const newReview = await Review.create({
    listing: listingId,
    author: authorId,
    rating,
    comment,
    images: uploadedUrls,
  });

  // 4) Update listing stats
  await updateListingStats(listingId);

  res.status(201).json({
    status: "success",
    data: {
      review: newReview,
    },
  });
});

export const updateReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const authorId = req.user?._id;
  const { rating, comment } = req.body;

  const review = await Review.findById(id);
  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // Validate ownership
  if (review.author.toString() !== authorId.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to update this review", 403));
  }

  const uploadedUrls = getUploadedUrls(req.files);

  if (rating) review.rating = rating;
  if (comment) review.comment = comment;
  if (uploadedUrls.length > 0) {
    review.images = uploadedUrls;
  }

  await review.save();

  // Update listing stats
  await updateListingStats(review.listing.toString());

  res.status(200).json({
    status: "success",
    data: {
      review,
    },
  });
});

export const deleteReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const authorId = req.user?._id;

  const review = await Review.findById(id);
  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // Validate ownership
  if (review.author.toString() !== authorId.toString() && req.user?.role !== "Admin") {
    return next(new AppError("You do not have permission to delete this review", 403));
  }

  const listingId = review.listing.toString();
  await Review.findByIdAndDelete(id);

  // Update listing stats
  await updateListingStats(listingId);

  res.status(200).json({
    status: "success",
    message: "Review deleted successfully",
  });
});

export const getListingReviews = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;

  const reviews = await Review.find({ listing: listingId })
    .populate({
      path: "author",
      select: "name email avatar",
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
});
