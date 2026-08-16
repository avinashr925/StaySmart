import { Request, Response, NextFunction } from "express";
import Booking from "../models/booking";
import Listing from "../models/listing";
import User from "../models/user";
import Waitlist from "../models/waitlist";
import Notification from "../models/notification";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getSocketIO } from "../server";
import { sendBookingCancellationEmail } from "../utils/email";
import Payment from "../models/payment";
import { paymentService } from "../services/payment/PaymentService";
import { logger } from "../utils/logger";
import { validateBookingTransition } from "../utils/bookingStateMachine";

const calculateRefundDetails = (booking: any, payment: any, listing: any) => {
  const now = new Date();
  const startTime = new Date(booking.startDate);
  const diffMs = startTime.getTime() - now.getTime();
  const diffHours = diffMs / (60 * 60 * 1000);

  const policy = listing?.cancellationPolicy || "Moderate";
  let refundPercent = 100;

  if (policy === "Flexible") {
    if (diffHours < 24) {
      refundPercent = 0;
    } else {
      refundPercent = 100;
    }
  } else if (policy === "Strict") {
    if (diffHours < 168) {
      refundPercent = 0;
    } else if (diffHours < 336) {
      refundPercent = 50;
    } else {
      refundPercent = 100;
    }
  } else {
    // Moderate or Custom
    if (diffHours < 48) {
      refundPercent = 0;
    } else if (diffHours < 120) {
      refundPercent = 50;
    } else {
      refundPercent = 100;
    }
  }

  const originalAmount = booking.totalPrice;
  const snapshot = booking.pricingSnapshot;
  let cleaningFee = snapshot?.cleaningFee ?? (payment?.cleaningFee || 0);
  let taxes = snapshot?.gstAmount ?? (payment?.taxes || 0);
  let basePrice = snapshot?.accommodationAmount ?? (originalAmount - cleaningFee - taxes);
  if (basePrice < 0) basePrice = 0;

  let refundableAmount = 0;
  let cancellationFee = 0;

  if (refundPercent === 100) {
    refundableAmount = originalAmount;
    cancellationFee = 0;
  } else if (refundPercent === 50) {
    const refundableBase = Math.round(basePrice * 0.5);
    refundableAmount = refundableBase + cleaningFee + taxes;
    cancellationFee = originalAmount - refundableAmount;
  } else {
    if (diffHours > 0) {
      refundableAmount = cleaningFee + taxes;
      cancellationFee = basePrice;
    } else {
      refundableAmount = 0;
      cancellationFee = originalAmount;
    }
  }

  return {
    originalAmount,
    refundableAmount,
    cancellationFee,
    refundPercent,
    hoursBeforeCheckin: Math.round(diffHours),
    policy,
  };
};

export const getRefundPreview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?._id;

  const booking = await Booking.findById(id).populate("listing");
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  const isGuest = booking.user.toString() === userId.toString();
  const isHost = booking.listing && (booking.listing as any).owner?.toString() === userId.toString();
  const isAdmin = req.user?.role === "Admin";
  if (!isGuest && !isHost && !isAdmin) {
    return next(new AppError("You are not authorized to view this refund preview", 403));
  }

  const payment = await Payment.findOne({ booking: id });
  const refundDetails = calculateRefundDetails(booking, payment, booking.listing);

  res.status(200).json({
    status: "success",
    data: refundDetails,
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

  const isGuest = booking.user.toString() === userId.toString();
  const isHost = listing && listing.owner.toString() === userId.toString();
  const isAdmin = req.user?.role === "Admin";

  if (!isGuest && !isHost && !isAdmin) {
    return next(new AppError("You are not authorized to cancel this booking", 403));
  }

  const payment = await Payment.findOne({ booking: id });
  const refundDetails = calculateRefundDetails(booking, payment, listing);

  if (payment && payment.status === "Succeeded" && refundDetails.refundableAmount > 0) {
    const gatewayUpper = String(payment.gateway).toUpperCase();
    if (gatewayUpper === "RAZORPAY" || gatewayUpper === "MOCK") {
      try {
        const provider = paymentService.getProvider();
        const reverseTransfer = !!payment.transferId;
        const refundRes = await provider.refund(
          payment.paymentId!,
          refundDetails.refundableAmount,
          {
            reason: "StaySmart booking cancelled by guest",
            bookingId: booking._id.toString(),
          },
          reverseTransfer
        );
        payment.refundId = refundRes.id;
        payment.status = "Refunded";
        payment.refundStatus = "Refunded";
        await payment.save();
      } catch (err: any) {
        logger.error("Refund failed during cancellation", { error: err.message });
        return next(new AppError(`Refund failed: ${err.message}`, 400));
      }
    }
  }

  validateBookingTransition(booking.status, "Cancelled");
  booking.status = "Cancelled";
  await booking.save();

  const guestUser = await User.findById(booking.user);
  if (guestUser?.email && listing) {
    await sendBookingCancellationEmail(guestUser.email, {
      id: booking._id.toString(),
      listingTitle: listing.title,
      startDate: booking.startDate.toLocaleDateString(),
      endDate: booking.endDate.toLocaleDateString(),
      refundAmount: refundDetails.refundableAmount,
    });
  }

  if (listing) {
    listing.availability = listing.availability.filter((slot: any) => {
      return (
        slot.startDate.getTime() !== booking.startDate.getTime() ||
        slot.endDate.getTime() !== booking.endDate.getTime()
      );
    });
    await listing.save({ validateBeforeSave: false });
  }

  const io = getSocketIO();
  if (io) {
    const notifyId = isGuest ? listing.owner.toString() : booking.user.toString();
    io.to(`user-${notifyId}`).emit("bookingCancelled", {
      message: `Booking #${booking._id} has been cancelled.`,
      bookingId: booking._id,
    });
  }

  const waitlistedGuests = await Waitlist.find({
    listing: listing._id,
    status: "Waiting",
    $or: [
      { startDate: { $lt: booking.endDate }, endDate: { $gt: booking.startDate } },
    ],
  });

  for (const wait of waitlistedGuests) {
    wait.status = "Notified";
    await wait.save();

    await Notification.create({
      user: wait.user,
      title: "Waitlist Alert: Stay dates opened!",
      body: `Good news! "${listing.title}" is now available for booking from ${new Date(wait.startDate).toLocaleDateString()} to ${new Date(wait.endDate).toLocaleDateString()}! Book now before someone else does.`,
      type: "System",
      link: `/listings/${listing._id}`,
    });

    if (io) {
      io.to(`user-${wait.user.toString()}`).emit("newNotification", {
        message: `Waitlist Alert: "${listing.title}" dates opened!`,
      });
    }
  }

  res.status(200).json({
    status: "success",
    message: "Booking cancelled successfully",
    data: { booking, refundDetails },
  });
});

export const joinWaitlist = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId, startDate, endDate } = req.body;
  const userId = req.user?._id;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return next(new AppError("End date must be after start date", 400));
  }

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  const waitlist = await Waitlist.create({
    listing: listingId,
    user: userId,
    startDate: start,
    endDate: end,
    status: "Waiting",
  });

  res.status(201).json({
    status: "success",
    message: "Successfully joined waitlist for this stay!",
    data: { waitlist },
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

export const getChatBookingContext = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId, otherUserId } = req.query;
  const userId = req.user?._id;

  if (!listingId || !otherUserId) {
    return next(new AppError("listingId and otherUserId are required", 400));
  }

  // Find listing
  const listing = await Listing.findById(listingId);
  if (!listing) return next(new AppError("Listing not found", 404));

  const isOwner = listing.owner.toString() === userId?.toString();
  const guestId = isOwner ? otherUserId : userId;

  // Find latest active booking (Confirmed or Pending)
  const booking = await Booking.findOne({
    listing: listingId,
    user: guestId,
    status: { $in: ["Confirmed", "Pending", "PendingVerification"] }
  }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: { booking }
  });
});

