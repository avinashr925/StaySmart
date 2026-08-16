import { Request, Response, NextFunction } from "express";
import Notification from "../models/notification";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const getNotifications = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const notifications = await Notification.find({ user: req.user?._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: { notifications },
  });
});

export const markNotificationAsRead = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: req.user?._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError("Notification not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { notification },
  });
});

export const markAllNotificationsAsRead = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  await Notification.updateMany(
    { user: req.user?._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});
