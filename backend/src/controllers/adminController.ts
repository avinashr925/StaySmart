import { Request, Response, NextFunction } from "express";
import User from "../models/user";
import Listing from "../models/listing";
import Booking from "../models/booking";
import AuditLog from "../models/auditLog";
import SupportTicket from "../models/supportTicket";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const approveHost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { hostId } = req.params;

  const host = await User.findById(hostId);
  if (!host) {
    return next(new AppError("User not found", 404));
  }

  if (host.role !== "Host") {
    return next(new AppError("User is not registered as a Host", 400));
  }

  host.isHostApproved = true;
  host.hostApprovedAt = new Date();
  await host.save({ validateBeforeSave: false });

  // Create Audit Log
  await AuditLog.create({
    user: req.user?._id,
    action: "HOST_APPROVAL",
    targetType: "User",
    targetId: hostId,
    ipAddress: req.ip || "127.0.0.1",
    metadata: { hostEmail: host.email },
  });

  res.status(200).json({
    status: "success",
    message: "Host approved successfully",
    data: { host },
  });
});

export const suspendUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const { isSuspended } = req.body;

  if (typeof isSuspended !== "boolean") {
    return next(new AppError("Please provide a boolean value for isSuspended in request body", 400));
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return next(new AppError("User not found", 404));
  }

  targetUser.isSuspended = isSuspended;
  if (isSuspended) {
    targetUser.refreshTokens = []; // Log out of all sessions
  }
  await targetUser.save({ validateBeforeSave: false });

  // Create Audit Log
  await AuditLog.create({
    user: req.user?._id,
    action: isSuspended ? "USER_SUSPENSION" : "USER_UNSUSPENSION",
    targetType: "User",
    targetId: userId,
    ipAddress: req.ip || "127.0.0.1",
    metadata: { userEmail: targetUser.email },
  });

  res.status(200).json({
    status: "success",
    message: `User ${isSuspended ? "suspended" : "unsuspended"} successfully`,
    data: { user: targetUser },
  });
});

export const deleteListingAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  await Listing.findByIdAndDelete(listingId);

  // Create Audit Log
  await AuditLog.create({
    user: req.user?._id,
    action: "LISTING_DELETION",
    targetType: "Listing",
    targetId: listingId,
    ipAddress: req.ip || "127.0.0.1",
    metadata: { title: listing.title },
  });

  res.status(200).json({
    status: "success",
    message: "Listing deleted by Admin successfully",
  });
});

export const getSystemAnalytics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const totalUsers = await User.countDocuments();
  const totalListings = await Listing.countDocuments();
  
  // Calculate total transactions & completed payout sums
  const bookings = await Booking.find({ status: "Confirmed" });
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);

  // Platform commission earnings at 8%
  const platformCommission = Number((totalRevenue * 0.08).toFixed(2));

  // Find host approvals pending
  const pendingHostsCount = await User.countDocuments({ role: "Host", isHostApproved: false });

  res.status(200).json({
    status: "success",
    data: {
      metrics: {
        totalUsers,
        totalListings,
        totalBookings,
        totalRevenue,
        platformCommission,
        pendingHostsCount,
      },
    },
  });
});

export const getAuditLogs = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const logs = await AuditLog.find()
    .populate({ path: "user", select: "name email avatar" })
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    status: "success",
    results: logs.length,
    data: { logs },
  });
});

export const moderateListing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId } = req.params;
  const { status } = req.body; // 'Approved' | 'Rejected' | 'Pending'

  if (!["Approved", "Rejected", "Pending"].includes(status)) {
    return next(new AppError("Please provide a valid moderation status", 400));
  }

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  listing.moderationStatus = status;
  await listing.save({ validateBeforeSave: false });

  await AuditLog.create({
    user: req.user?._id,
    action: `LISTING_MODERATION_${status.toUpperCase()}`,
    targetType: "Listing",
    targetId: listingId,
    ipAddress: req.ip || "127.0.0.1",
    metadata: { title: listing.title },
  });

  res.status(200).json({
    status: "success",
    message: `Listing moderation status set to ${status}`,
    data: { listing },
  });
});

let featureFlags: { [key: string]: boolean } = {
  enableAiPricing: true,
  maintenanceModeGlobal: false,
};

export const getFeatureFlags = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: "success",
    data: { flags: featureFlags },
  });
});

export const updateFeatureFlag = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, value } = req.body;
  if (typeof value !== "boolean") {
    return next(new AppError("Feature flag value must be a boolean", 400));
  }
  featureFlags[name] = value;
  res.status(200).json({
    status: "success",
    message: `Feature flag ${name} updated to ${value}`,
    data: { flags: featureFlags },
  });
});

export const getSupportTickets = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const tickets = await SupportTicket.find()
    .populate({ path: "user", select: "name email" })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: { tickets },
  });
});

export const updateTicketStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { ticketId } = req.params;
  const { status } = req.body; // 'Open' | 'Resolved'

  const ticket = await SupportTicket.findByIdAndUpdate(ticketId, { status }, { new: true });
  if (!ticket) {
    return next(new AppError("Support ticket not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Ticket status updated",
    data: { ticket },
  });
});

export const createSupportTicket = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return next(new AppError("Subject and message are required", 400));
  }

  const ticket = await SupportTicket.create({
    user: req.user?._id,
    subject,
    message,
  });

  res.status(201).json({
    status: "success",
    message: "Support ticket submitted successfully!",
    data: { ticket },
  });
});
