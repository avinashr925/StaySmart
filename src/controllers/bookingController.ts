import { Request, Response, NextFunction } from "express";
import Booking from "../models/booking";
import Listing from "../models/listing";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getSocketIO } from "../server"; // We will export this from server.ts

export const createBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId, startDate, endDate } = req.body;
  const userId = req.user?._id;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return next(new AppError("End date must be after start date", 400));
  }

  // 1) Find listing
  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  // 2) Check for overlapping bookings
  const overlappingBooking = await Booking.findOne({
    listing: listingId,
    status: { $ne: "Cancelled" },
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } },
    ],
  });

  if (overlappingBooking) {
    return next(new AppError("This property is already booked for the selected dates.", 400));
  }

  // 3) Calculate pricing
  const oneDayMs = 24 * 60 * 60 * 1000;
  const nights = Math.ceil((end.getTime() - start.getTime()) / oneDayMs);
  const totalPrice = nights * listing.price;

  // 4) Create booking
  const newBooking = await Booking.create({
    listing: listingId,
    user: userId,
    startDate: start,
    endDate: end,
    totalPrice,
    status: "Confirmed",
  });

  // 5) Update listing availability array
  listing.availability.push({ startDate: start, endDate: end });
  await listing.save({ validateBeforeSave: false });

  // 6) Emit real-time Socket.IO notification to the host if they are online
  const io = getSocketIO();
  if (io) {
    // Notify host room
    io.to(`user-${listing.owner.toString()}`).emit("newBooking", {
      message: `New booking for your listing: "${listing.title}"`,
      booking: newBooking,
    });
  }

  res.status(201).json({
    status: "success",
    data: {
      booking: newBooking,
    },
  });
});

export const cancelBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?._id;

  const booking = await Booking.findById(id).populate("listing");
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  const listing: any = booking.listing;

  // Validate authorization: Guest who booked, Host who owns the listing, or Admin
  const isGuest = booking.user.toString() === userId.toString();
  const isHost = listing && listing.owner.toString() === userId.toString();
  const isAdmin = req.user?.role === "Admin";

  if (!isGuest && !isHost && !isAdmin) {
    return next(new AppError("You are not authorized to cancel this booking", 403));
  }

  booking.status = "Cancelled";
  await booking.save();

  // Remove availability block from Listing
  if (listing) {
    listing.availability = listing.availability.filter((slot: any) => {
      return (
        slot.startDate.getTime() !== booking.startDate.getTime() ||
        slot.endDate.getTime() !== booking.endDate.getTime()
      );
    });
    await listing.save({ validateBeforeSave: false });
  }

  // Socket notification to guest or host
  const io = getSocketIO();
  if (io) {
    const notifyId = isGuest ? listing.owner.toString() : booking.user.toString();
    io.to(`user-${notifyId}`).emit("bookingCancelled", {
      message: `Booking #${booking._id} has been cancelled.`,
      bookingId: booking._id,
    });
  }

  res.status(200).json({
    status: "success",
    message: "Booking cancelled successfully",
    data: { booking },
  });
});

export const getGuestBookings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  const bookings = await Booking.find({ user: userId })
    .populate({
      path: "listing",
      select: "title images price city country address",
    })
    .sort({ startDate: -1 });

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

export const getHostBookings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  // Find all listings owned by this Host
  const hostListings = await Listing.find({ owner: userId }).select("_id");
  const listingIds = hostListings.map((l) => l._id);

  // Find bookings for those listings
  const bookings = await Booking.find({ listing: { $in: listingIds } })
    .populate({
      path: "listing",
      select: "title images price city country",
    })
    .populate({
      path: "user",
      select: "name email avatar",
    })
    .sort({ startDate: -1 });

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

export const getListingBookedDates = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;

  const bookings = await Booking.find({
    listing: listingId,
    status: { $ne: "Cancelled" },
  }).select("startDate endDate");

  const bookedDates = bookings.map((b) => ({
    startDate: b.startDate,
    endDate: b.endDate,
  }));

  res.status(200).json({
    status: "success",
    data: { bookedDates },
  });
});
