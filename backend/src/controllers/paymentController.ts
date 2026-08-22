import { Request, Response, NextFunction } from "express";
import Listing from "../models/listing";
import User from "../models/user";
import Booking from "../models/booking";
import Payment from "../models/payment";
import Coupon from "../models/coupon";
import { generateInvoicePdf } from "../services/pdfService";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { acquireLock, releaseLock } from "../services/lockService";
import { evaluateRiskScore } from "../services/fraudDetector";
import { logger } from "../utils/logger";
import { sendBookingReceiptEmail } from "../utils/email";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayKeyId,
  refundRazorpayPayment,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhook,
  createPostPaymentTransfer,
} from "../services/razorpay";
import { getSocketIO } from "../server";
import { calculateBookingPrice } from "../services/pricingService";
import { paymentService } from "../services/payment/PaymentService";
import { validateBookingTransition } from "../utils/bookingStateMachine";



const confirmBookingFromCapturedPayment = async (
  booking: any,
  paymentEntity: any,
  paymentSignature?: string
) => {
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.status === "Confirmed") {
    return { booking, alreadyConfirmed: true };
  }
  if (booking.status !== "Pending") {
    throw new AppError("This booking is no longer payable.", 400);
  }

  const listing = await Listing.findById(booking.listing);
  if (!listing) throw new AppError("Listing no longer exists.", 404);

  if (paymentEntity.order_id !== booking.orderId) {
    throw new AppError("Payment order does not match this booking.", 400);
  }

  const amountPaid = Number(paymentEntity.amount);
  const expectedAmount = Math.round(booking.totalPrice * 100);
  if (amountPaid !== expectedAmount || paymentEntity.currency !== "INR") {
    throw new AppError("Payment amount or currency does not match the booking.", 400);
  }

  // Prevent double booking at the exact moment payment is captured.
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listing._id,
      maintenanceMode: { $ne: true },
      availability: {
        $not: {
          $elemMatch: {
            startDate: { $lt: booking.endDate },
            endDate: { $gt: booking.startDate },
          },
        },
      },
    },
    {
      $push: {
        availability: {
          startDate: booking.startDate,
          endDate: booking.endDate,
        },
      },
    },
    { new: true }
  );

  if (!updatedListing) {
    booking.status = "PaymentFailed";
    await booking.save();

    try {
      await refundRazorpayPayment(paymentEntity.id, booking.totalPrice, {
        reason: "StaySmart booking date conflict",
        bookingId: booking._id.toString(),
      });
    } catch (refundError: any) {
      logger.error("Failed to refund payment after booking conflict", {
        paymentId: paymentEntity.id,
        error: refundError.message,
      });
    }

    throw new AppError(
      "Those dates were booked by another guest. The captured payment has been sent for refund.",
      409
    );
  }

  booking.status = "Confirmed";
  booking.paymentMethod = "razorpay";
  await booking.save();

  // Calculate fee splits
  const grossAmount = booking.totalPrice;
  const platformFee = Math.round(grossAmount * 0.10); // 10% platform fee
  const hostAmount = grossAmount - platformFee;

  // Retrieve Host profile to check Linked Account Route eligibility
  const host = await User.findById(listing.owner);
  let transferId = undefined;
  let transferStatus: "Pending" | "Settled" | "Failed" = "Pending";

  if (host?.paymentProfile?.linkedAccountId && host?.paymentProfile?.status === "ACTIVE") {
    try {
      const transfer = await createPostPaymentTransfer(
        paymentEntity.id,
        host.paymentProfile.linkedAccountId,
        hostAmount,
        "INR",
        {
          bookingId: booking._id.toString(),
          paymentId: paymentEntity.id,
        }
      );
      transferId = transfer.id;
      transferStatus = "Settled";
      logger.info("Marketplace split transfer successful", {
        transferId,
        hostId: host._id,
        paymentId: paymentEntity.id,
      });
    } catch (transferError: any) {
      logger.error("Marketplace split transfer failed", {
        paymentId: paymentEntity.id,
        hostId: host._id,
        error: transferError.message,
      });
      transferStatus = "Failed";
    }
  } else {
    logger.info("Host payout route skipped: host linked account is not configured or active.", {
      hostId: host?._id,
      status: host?.paymentProfile?.status,
    });
  }

  const payment = await Payment.findOneAndUpdate(
    { paymentId: paymentEntity.id },
    {
      booking: booking._id,
      user: booking.user,
      amount: booking.totalPrice,
      currency: "inr",
      gateway: "razorpay",
      orderId: booking.orderId,
      paymentId: paymentEntity.id,
      signature: paymentSignature,
      status: "Succeeded",
      taxes: booking.taxes,
      cleaningFee: booking.cleaningFee,
      couponApplied: booking.couponApplied,
      platformFee,
      hostAmount,
      transferId,
      transferStatus,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await releaseLock(
    listing._id.toString(),
    booking.user.toString(),
    booking.startDate,
    booking.endDate
  );

  const guest = await booking.populate("listing");
  const listingForEmail = guest.listing as any;

  if (listingForEmail && booking.user) {
    const user = await User.findById(booking.user);
    if (user?.email) {
      await sendBookingReceiptEmail(user.email, {
        id: booking._id.toString(),
        listingTitle: listingForEmail.title,
        startDate: new Date(booking.startDate).toLocaleDateString(),
        endDate: new Date(booking.endDate).toLocaleDateString(),
        totalPrice: booking.totalPrice,
        paymentId: paymentEntity.id,
      }).catch((err) =>
        logger.error("Receipt email sending failed", { error: err.message })
      );
    }
  }

  const io = getSocketIO();
  if (io && listingForEmail) {
    io.to(`user-${listingForEmail.owner.toString()}`).emit("newBooking", {
      message: `Reservation confirmed for "${listingForEmail.title}"!`,
      booking,
    });
  }

  return { booking, payment, alreadyConfirmed: false };
};

export const checkoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { listingId, startDate, endDate, couponCode } = req.body;
    const userId = req.user?._id;

    if (!userId) return next(new AppError("You are not logged in.", 401));

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      return next(new AppError("Checkout date must be after check-in.", 400));
    }

    const listing = await Listing.findById(listingId);
    if (!listing) return next(new AppError("Listing not found", 404));
    if (listing.owner.toString() === userId.toString()) {
      return next(new AppError("You cannot book your own listing.", 403));
    }
    if (listing.maintenanceMode) {
      return next(new AppError("This listing is currently unavailable for booking.", 400));
    }

    const lockAcquired = await acquireLock(
      listingId,
      userId.toString(),
      start,
      end
    );
    if (!lockAcquired) {
      return next(
        new AppError(
          "These dates are currently reserved or being checked out. Please choose different dates.",
          409
        )
      );
    }

    let pendingBooking: any = null;
    try {
      const pricing = await calculateBookingPrice(
        listingId,
        startDate,
        endDate,
        userId.toString(),
        couponCode
      );

      const fraudCheck = await evaluateRiskScore(
        userId.toString(),
        req.ip || "unknown",
        pricing.totalPrice
      );

      if (fraudCheck.riskStatus === "High") {
        throw new AppError(
          "Transaction declined by StaySmart security checks.",
          403
        );
      }

      const booking = await Booking.create({
        listing: listingId,
        user: userId,
        startDate: start,
        endDate: end,
        totalPrice: pricing.totalPrice,
        cleaningFee: pricing.cleaningFee,
        taxes: pricing.gstAmount,
        couponApplied: couponCode?.toUpperCase(),
        status: "Pending",
        pricingSnapshot: {
          nightlyPrice: pricing.nightlyPrice,
          nights: pricing.nights,
          accommodationAmount: pricing.accommodationAmount,
          discount: pricing.discount,
          cleaningFee: pricing.cleaningFee,
          platformFee: pricing.platformFee,
          gstRate: pricing.gstRate,
          gstAmount: pricing.gstAmount,
          cgst: pricing.cgst,
          sgst: pricing.sgst,
          igst: pricing.igst,
          totalPrice: pricing.totalPrice,
          currency: pricing.currency,
        },
      });

      pendingBooking = booking;

      const host = await User.findById(listing.owner);
      const hostUpiDetails = host?.bankDetails?.upiId ? {
        upiId: host.bankDetails.upiId,
        upiQrCodeUrl: host.bankDetails.upiQrCodeUrl,
        accountHolderName: host.bankDetails.accountHolderName || host.name,
      } : null;

      let order = null;
      const provider = paymentService.getProvider();
      const providerName = paymentService.getProviderName().toLowerCase();

      try {
        order = await provider.createOrder(
          pricing.totalPrice,
          "INR",
          booking._id.toString(),
          {
            bookingId: booking._id.toString(),
            listingId: listingId.toString(),
            userId: userId.toString(),
          }
        );
      } catch (err: any) {
        logger.warn("Order creation failed on active provider, using fallback defaults", { error: err.message });
      }

      if (order) {
        booking.orderId = order.id;
        await booking.save();
      }

      return res.status(200).json({
        status: "success",
        data: {
          gateway: order ? providerName : "upi",
          razorpayAvailable: order && providerName === "razorpay",
          keyId: order && providerName === "razorpay" ? getRazorpayKeyId() : null,
          orderId: order ? order.id : null,
          amount: order ? order.amount : pricing.totalPrice * 100,
          currency: "INR",
          bookingId: booking._id.toString(),
          nights: pricing.nights,
          pricing,
          hostUpiDetails,
        },
      });
    } catch (error) {
      await releaseLock(listingId, userId.toString(), start, end);
      if (pendingBooking?._id) {
        await Booking.findByIdAndUpdate(pendingBooking._id, {
          status: "PaymentFailed",
        }).catch(() => undefined);
      }
      throw error;
    }
  }
);

export const confirmPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { paymentId, paymentIntentId, bookingId, orderId, signature } = req.body;
    const resolvedPaymentId = paymentId || paymentIntentId;

    if (!resolvedPaymentId || !bookingId || !orderId || !signature) {
      return next(
        new AppError(
          "paymentId, bookingId, orderId and signature are required.",
          400
        )
      );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return next(new AppError("Booking not found.", 404));

    // Prevent double-consuming payments
    const existingPayment = await Payment.findOne({ paymentId: resolvedPaymentId });
    if (existingPayment) {
      return next(new AppError("This payment has already been verified and processed.", 400));
    }

    if (booking.user.toString() !== req.user?._id.toString()) {
      return next(new AppError("You are not authorized to confirm this booking.", 403));
    }

    if (!booking.orderId || booking.orderId !== orderId) {
      return next(new AppError("Invalid payment order for this booking.", 400));
    }

    if (
      !paymentService.getProvider().verifySignature(
        booking.orderId!,
        resolvedPaymentId,
        signature
      )
    ) {
      return next(new AppError("Invalid payment signature.", 400));
    }

    const paymentEntity = await paymentService.getProvider().fetchPayment(resolvedPaymentId);

    if (
      paymentEntity.order_id !== booking.orderId ||
      paymentEntity.status !== "captured"
    ) {
      return next(
        new AppError(
          "Payment has not been captured by Razorpay yet.",
          400
        )
      );
    }

    const result = await confirmBookingFromCapturedPayment(
      booking,
      paymentEntity,
      signature
    );

    return res.status(200).json({
      status: "success",
      message: result.alreadyConfirmed
        ? "Payment was already confirmed."
        : "Booking and payment confirmed successfully!",
      data: {
        booking: result.booking,
        payment: result.payment,
      },
    });
  }
);

export const razorpayWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const rawBody = req.body as unknown as Buffer;
    const signature = req.headers["x-razorpay-signature"];

    if (!verifyRazorpayWebhook(rawBody, signature)) {
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid Razorpay webhook signature." });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    const event = payload.event;

    if (event === "payment.captured") {
      const paymentEntity = payload.payload?.payment?.entity;
      if (paymentEntity?.id) {
        const existingPayment = await Payment.findOne({
          paymentId: paymentEntity.id,
        });

        if (!existingPayment) {
          const bookingId = paymentEntity.notes?.bookingId;
          const booking = bookingId
            ? await Booking.findById(bookingId)
            : await Booking.findOne({ orderId: paymentEntity.order_id });

          if (booking) {
            try {
              await confirmBookingFromCapturedPayment(
                booking,
                paymentEntity
              );
            } catch (error: any) {
              logger.error("Razorpay webhook booking confirmation failed", {
                paymentId: paymentEntity.id,
                error: error.message,
              });
            }
          }
        }
      }
    }

    if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const bookingId = paymentEntity?.notes?.bookingId;

      if (bookingId) {
        const booking = await Booking.findById(bookingId);
        if (booking && booking.status === "Pending") {
          booking.status = "PaymentFailed";
          await booking.save();
          await releaseLock(
            booking.listing.toString(),
            booking.user.toString(),
            booking.startDate,
            booking.endDate
          );
        }
      }
    }

    if (event === "refund.created" || event === "refund.processed" || event === "refund.failed") {
      const refundEntity = payload.payload?.refund?.entity;
      if (refundEntity?.id) {
        const payment = await Payment.findOne({
          $or: [
            { refundId: refundEntity.id },
            { paymentId: refundEntity.payment_id },
          ],
        });

        if (payment) {
          if (event === "refund.created") {
            payment.refundId = refundEntity.id;
            payment.refundStatus = "Processing";
            await payment.save();
          } else if (event === "refund.processed") {
            payment.refundId = refundEntity.id;
            payment.refundStatus = "Refunded";
            payment.status = "Refunded";
            await payment.save();

            const booking = await Booking.findById(payment.booking).populate("listing");
            if (booking && booking.status !== "Cancelled") {
              booking.status = "Cancelled";
              await booking.save();

              const listing = booking.listing as any;
              if (listing) {
                listing.availability = listing.availability.filter((slot: any) => {
                  return (
                    slot.startDate.getTime() !== booking.startDate.getTime() ||
                    slot.endDate.getTime() !== booking.endDate.getTime()
                  );
                });
                await listing.save({ validateBeforeSave: false });
              }
            }
          } else if (event === "refund.failed") {
            payment.refundStatus = "Failed";
            await payment.save();
            logger.error("Razorpay webhook reported refund failure", {
              refundId: refundEntity.id,
              paymentId: refundEntity.payment_id,
            });
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  }
);

export const getInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("listing")
      .populate("user");

    if (!booking) return next(new AppError("Booking not found", 404));

    if (
      req.user?.role !== "Admin" &&
      req.user?.role !== "SuperAdmin" &&
      booking.user._id.toString() !== req.user?._id.toString() &&
      (booking.listing as any).owner.toString() !== req.user?._id.toString()
    ) {
      return next(
        new AppError("You do not have permission to view this invoice.", 403)
      );
    }

    const payment = await Payment.findOne({ booking: bookingId });

    res.status(200).json({
      status: "success",
      data: {
        invoice: {
          invoiceNumber: `INV-${booking._id.toString().substring(0, 8).toUpperCase()}`,
          date: booking.createdAt,
          billingDetails: {
            name: (booking.user as any).name,
            email: (booking.user as any).email,
          },
          propertyDetails: {
            title: (booking.listing as any).title,
            location: `${(booking.listing as any).city}, ${(booking.listing as any).country}`,
            city: (booking.listing as any).city,
          },
          stayDetails: {
            startDate: booking.startDate,
            endDate: booking.endDate,
            pricePerNight: (booking.listing as any).price,
          },
          pricingBreakdown: {
            baseAmount:
              booking.pricingSnapshot?.accommodationAmount ||
              (booking.totalPrice -
              (payment?.taxes || 0) -
              (payment?.cleaningFee || 0)),
            cleaningFee: booking.pricingSnapshot?.cleaningFee || payment?.cleaningFee || 0,
            taxes: booking.pricingSnapshot?.gstAmount || payment?.taxes || 0,
            discount: payment?.couponApplied ? "Coupon Applied" : "None",
            discountAmount: booking.pricingSnapshot?.discount || 0,
            totalPaid: booking.totalPrice,
          },
          transactionDetails: {
            paymentId: payment?.paymentId || "N/A",
            paymentIntentId: booking.upiTxnId || payment?.paymentId || "N/A",
            orderId: payment?.orderId || booking.orderId || "N/A",
            gateway: payment?.gateway || "mock",
            paymentMethod: payment?.paymentMethod || booking.paymentMethod || "mock",
            status: payment?.status || "Pending",
            bookingStatus: booking.status,
          },
        },
      },
    });
  }
);

export const downloadInvoicePdf = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("listing")
      .populate("user");

    if (!booking) return next(new AppError("Booking not found", 404));

    if (
      req.user?.role !== "Admin" &&
      req.user?.role !== "SuperAdmin" &&
      booking.user._id.toString() !== req.user?._id.toString() &&
      (booking.listing as any).owner.toString() !== req.user?._id.toString()
    ) {
      return next(
        new AppError("You do not have permission to view this receipt.", 403)
      );
    }

    const payment = await Payment.findOne({ booking: bookingId });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-STAY-${booking._id
        .toString()
        .substring(18, 24)
        .toUpperCase()}.pdf`
    );

    generateInvoicePdf(res, booking, payment);
  }
);

export const upiCheckout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { listingId, startDate, endDate, couponCode, upiTxnId } = req.body;
    const userId = req.user?._id;

    if (!userId) return next(new AppError("You are not logged in.", 401));
    if (!upiTxnId) return next(new AppError("UPI Transaction Reference ID is required.", 400));

    // 12-digit alphanumeric transaction ID check
    if (!/^[a-zA-Z0-9]{12}$/.test(upiTxnId.trim())) {
      return next(new AppError("Invalid UPI Transaction Reference ID format. Must be 12 alphanumeric characters.", 400));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      return next(new AppError("Checkout date must be after check-in.", 400));
    }

    const listing = await Listing.findById(listingId);
    if (!listing) return next(new AppError("Listing not found", 404));
    if (listing.owner.toString() === userId.toString()) {
      return next(new AppError("You cannot book your own listing.", 403));
    }
    if (listing.maintenanceMode) {
      return next(new AppError("This listing is currently unavailable for booking.", 400));
    }

    // Check if there is an existing pending booking for this user, listing, and dates
    let existingBooking = await Booking.findOne({
      listing: listingId,
      user: userId,
      startDate: start,
      endDate: end,
      status: "Pending",
    });

    if (existingBooking) {
      existingBooking.paymentMethod = "upi";
      existingBooking.upiTxnId = upiTxnId.trim();
      existingBooking.status = "PendingVerification";
      await existingBooking.save();

      const pricing = existingBooking.pricingSnapshot || {
        nightlyPrice: existingBooking.totalPrice / (Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1),
        nights: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        accommodationAmount: existingBooking.totalPrice - existingBooking.cleaningFee - existingBooking.taxes,
        discount: 0,
        cleaningFee: existingBooking.cleaningFee,
        platformFee: 0,
        gstRate: 0.08,
        gstAmount: existingBooking.taxes,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalPrice: existingBooking.totalPrice,
        currency: "INR",
      };

      const hostPayout = (pricing as any).hostPayout || pricing.totalPrice * 0.90;
      const platformFee = (pricing as any).platformFee || (pricing.totalPrice - hostPayout);

      // Upsert Payment
      await Payment.findOneAndUpdate(
        { booking: existingBooking._id },
        {
          user: userId,
          amount: existingBooking.totalPrice,
          currency: "inr",
          gateway: "upi",
          paymentMethod: "upi",
          paymentId: upiTxnId.trim(),
          status: "Pending",
          taxes: existingBooking.taxes,
          cleaningFee: existingBooking.cleaningFee,
          couponApplied: existingBooking.couponApplied,
          platformFee: platformFee,
          hostAmount: hostPayout,
        },
        { upsert: true, new: true }
      );

      const hostUser = await User.findById(listing.owner);
      const io = getSocketIO();
      if (io && hostUser) {
        io.to(`user-${hostUser._id.toString()}`).emit("newBooking", {
          message: `New manual UPI booking pending verification for "${listing.title}"!`,
          booking: existingBooking,
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Direct UPI booking submitted for verification.",
        data: {
          booking: existingBooking,
          nights: pricing.nights,
          pricing,
        },
      });
    }

    const lockAcquired = await acquireLock(
      listingId,
      userId.toString(),
      start,
      end
    );
    if (!lockAcquired) {
      return next(
        new AppError(
          "These dates are currently reserved or being checked out. Please choose different dates.",
          409
        )
      );
    }

    let pendingBooking: any = null;
    try {
      const pricing = await calculateBookingPrice(
        listingId,
        startDate,
        endDate,
        userId.toString(),
        couponCode
      );

      const fraudCheck = await evaluateRiskScore(
        userId.toString(),
        req.ip || "unknown",
        pricing.totalPrice
      );

      if (fraudCheck.riskStatus === "High") {
        throw new AppError(
          "Transaction declined by StaySmart security checks.",
          403
        );
      }

      // Check date conflicts
      const hasConflict = await Listing.exists({
        _id: listing._id,
        availability: {
          $elemMatch: {
            startDate: { $lt: end },
            endDate: { $gt: start },
          },
        },
      });

      if (hasConflict) {
        throw new AppError("Those dates are no longer available. Please select different dates.", 400);
      }

      const booking = await Booking.create({
        listing: listingId,
        user: userId,
        startDate: start,
        endDate: end,
        totalPrice: pricing.totalPrice,
        cleaningFee: pricing.cleaningFee,
        taxes: pricing.gstAmount,
        couponApplied: couponCode?.toUpperCase(),
        paymentMethod: "upi",
        upiTxnId: upiTxnId.trim(),
        status: "PendingVerification",
        pricingSnapshot: {
          nightlyPrice: pricing.nightlyPrice,
          nights: pricing.nights,
          accommodationAmount: pricing.accommodationAmount,
          discount: pricing.discount,
          cleaningFee: pricing.cleaningFee,
          platformFee: pricing.platformFee,
          gstRate: pricing.gstRate,
          gstAmount: pricing.gstAmount,
          cgst: pricing.cgst,
          sgst: pricing.sgst,
          igst: pricing.igst,
          totalPrice: pricing.totalPrice,
          currency: pricing.currency,
        },
      });

      pendingBooking = booking;

      await Payment.create({
        booking: booking._id,
        user: userId,
        amount: pricing.totalPrice,
        currency: "inr",
        gateway: "upi",
        paymentId: upiTxnId.trim(),
        status: "Pending",
        taxes: pricing.gstAmount,
        cleaningFee: pricing.cleaningFee,
        couponApplied: couponCode?.toUpperCase(),
        platformFee: pricing.totalPrice - pricing.hostPayout,
        hostAmount: pricing.hostPayout,
      });

      const hostUser = await User.findById(listing.owner);
      const io = getSocketIO();
      if (io && hostUser) {
        io.to(`user-${hostUser._id.toString()}`).emit("newBooking", {
          message: `New manual UPI booking pending verification for "${listing.title}"!`,
          booking,
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Direct UPI booking submitted for verification.",
        data: {
          booking,
          nights: pricing.nights,
          pricing,
        },
      });
    } catch (error) {
      await releaseLock(listingId, userId.toString(), start, end);
      if (pendingBooking?._id) {
        await Booking.findByIdAndUpdate(pendingBooking._id, {
          status: "PaymentFailed",
        }).catch(() => undefined);
      }
      throw error;
    }
  }
);

export const confirmUpiPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookingId } = req.params;
    const { action } = req.body; // "approve" or "reject"
    const hostId = req.user?._id;

    if (!bookingId) return next(new AppError("Booking ID is required.", 400));
    if (!action || !["approve", "reject"].includes(action)) {
      return next(new AppError("Action must be either 'approve' or 'reject'.", 400));
    }

    const booking = await Booking.findById(bookingId).populate("listing");
    if (!booking) return next(new AppError("Booking not found.", 404));

    if (booking.status !== "PendingVerification") {
      return next(new AppError("This booking is not in a pending verification state.", 400));
    }

    const listing = booking.listing as any;
    if (!listing) return next(new AppError("Listing not found.", 404));

    if (listing.owner.toString() !== hostId.toString() && req.user?.role !== "Admin" && req.user?.role !== "SuperAdmin") {
      return next(new AppError("You do not have permission to verify payments for this property.", 403));
    }

    if (action === "approve") {
      const updatedListing = await Listing.findOneAndUpdate(
        {
          _id: listing._id,
          maintenanceMode: { $ne: true },
          availability: {
            $not: {
              $elemMatch: {
                startDate: { $lt: booking.endDate },
                endDate: { $gt: booking.startDate },
              },
            },
          },
        },
        {
          $push: {
            availability: {
              startDate: booking.startDate,
              endDate: booking.endDate,
            },
          },
        },
        { new: true }
      );

      if (!updatedListing) {
        booking.status = "PaymentFailed";
        await booking.save();

        await Payment.findOneAndUpdate(
          { booking: booking._id },
          { status: "Failed" }
        );

        return next(new AppError("Double booking conflict. Those dates are no longer available.", 409));
      }

      booking.status = "Confirmed";
      await booking.save();

      await Payment.findOneAndUpdate(
        { booking: booking._id },
        { status: "Succeeded", transferStatus: "Settled" }
      );

      await releaseLock(
        listing._id.toString(),
        booking.user.toString(),
        booking.startDate,
        booking.endDate
      );

      const guestUser = await User.findById(booking.user);
      if (guestUser?.email) {
        await sendBookingReceiptEmail(guestUser.email, {
          id: booking._id.toString(),
          listingTitle: listing.title,
          startDate: new Date(booking.startDate).toLocaleDateString(),
          endDate: new Date(booking.endDate).toLocaleDateString(),
          totalPrice: booking.totalPrice,
          paymentId: booking.upiTxnId || "Direct UPI",
        }).catch((err) =>
          logger.error("Receipt email sending failed", { error: err.message })
        );
      }

      const io = getSocketIO();
      if (io) {
        io.to(`user-${booking.user.toString()}`).emit("bookingConfirmed", {
          message: `Your booking for "${listing.title}" has been confirmed by the host!`,
          booking,
        });
      }

      return res.status(200).json({
        status: "success",
        message: "UPI Booking approved and confirmed successfully.",
        data: { booking },
      });
    } else {
      booking.status = "Cancelled";
      await booking.save();

      await Payment.findOneAndUpdate(
        { booking: booking._id },
        { status: "Failed" }
      );

      await releaseLock(
        listing._id.toString(),
        booking.user.toString(),
        booking.startDate,
        booking.endDate
      );

      const io = getSocketIO();
      if (io) {
        io.to(`user-${booking.user.toString()}`).emit("bookingRejected", {
          message: `Your manual UPI booking for "${listing.title}" was rejected by the host.`,
          booking,
        });
      }

      return res.status(200).json({
        status: "success",
        message: "UPI Booking payment rejected. Booking cancelled.",
        data: { booking },
      });
    }
  }
);

export const confirmMockPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookingId, status, paymentMethod } = req.body;
    const userId = req.user?._id;

    if (!bookingId || !status) {
      return next(new AppError("bookingId and status are required.", 400));
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return next(new AppError("Booking not found.", 404));

    if (booking.user.toString() !== userId?.toString()) {
      return next(new AppError("You are not authorized to confirm this booking.", 403));
    }

    if (booking.status === "Confirmed") {
      return res.status(200).json({
        status: "success",
        message: "Payment was already confirmed.",
        data: { booking },
      });
    }

    const listing = await Listing.findById(booking.listing);
    if (!listing) return next(new AppError("Listing no longer exists.", 404));

    // Transition validation
    validateBookingTransition(booking.status, status === "SUCCESS" ? "Confirmed" : "PaymentFailed");

    if (status === "SUCCESS") {
      // Double booking check immediately
      const updatedListing = await Listing.findOneAndUpdate(
        {
          _id: listing._id,
          maintenanceMode: { $ne: true },
          availability: {
            $not: {
              $elemMatch: {
                startDate: { $lt: booking.endDate },
                endDate: { $gt: booking.startDate },
              },
            },
          },
        },
        {
          $push: {
            availability: {
              startDate: booking.startDate,
              endDate: booking.endDate,
            },
          },
        },
        { new: true }
      );

      if (!updatedListing) {
        booking.status = "PaymentFailed";
        await booking.save();
        return next(new AppError("Those dates are no longer available (double booking conflict).", 409));
      }

      booking.status = "Confirmed";
      booking.paymentMethod = paymentMethod || "mock";
      await booking.save();

      // Platform splits
      const platformCommission = Math.round(booking.totalPrice * 0.10);
      const hostAmount = booking.totalPrice - platformCommission;

      const mockPaymentId = `mock_pay_${Math.random().toString(36).substring(2, 12)}`;

      const host = await User.findById(listing.owner);
      const transferStatus = host?.paymentProfile?.status === "ACTIVE" ? "Settled" : "Pending";

      const payment = await Payment.create({
        booking: booking._id,
        user: booking.user,
        amount: booking.totalPrice,
        currency: "inr",
        gateway: "mock",
        paymentMethod: paymentMethod || "mock",
        paymentId: mockPaymentId,
        status: "Succeeded",
        taxes: booking.taxes,
        cleaningFee: booking.cleaningFee,
        couponApplied: booking.couponApplied,
        platformFee: platformCommission,
        hostAmount,
        transferStatus,
      });

      await releaseLock(
        listing._id.toString(),
        booking.user.toString(),
        booking.startDate,
        booking.endDate
      );

      // Send confirmation socket event
      const io = getSocketIO();
      if (io) {
        io.to(`user-${listing.owner.toString()}`).emit("newBooking", {
          message: `Reservation confirmed for "${listing.title}"!`,
          booking,
        });
      }

      const userObj = await User.findById(booking.user);
      if (userObj?.email) {
        await sendBookingReceiptEmail(userObj.email, {
          id: booking._id.toString(),
          listingTitle: listing.title,
          startDate: new Date(booking.startDate).toLocaleDateString(),
          endDate: new Date(booking.endDate).toLocaleDateString(),
          totalPrice: booking.totalPrice,
          paymentId: mockPaymentId,
        }).catch((err) =>
          logger.error("Receipt email sending failed", { error: err.message })
        );
      }

      return res.status(200).json({
        status: "success",
        message: "Mock Payment success! Booking confirmed.",
        data: { booking, payment },
      });
    } else {
      booking.status = "PaymentFailed";
      await booking.save();

      await releaseLock(
        listing._id.toString(),
        booking.user.toString(),
        booking.startDate,
        booking.endDate
      );

      return res.status(200).json({
        status: "success",
        message: "Mock Payment failed. Booking status set to PaymentFailed.",
        data: { booking },
      });
    }
  }
);
