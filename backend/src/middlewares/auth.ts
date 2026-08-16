import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { verifyAccessToken } from "../utils/jwt";
import User, { IUser } from "../models/user";
import BlacklistToken from "../models/blacklistToken";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let token = "";

  // 1) Obtain token from Authorization header, cookies, or query parameters
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.query && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }

  // 2) Verify token is not blacklisted
  const isBlacklisted = await BlacklistToken.findOne({ token });
  if (isBlacklisted) {
    return next(new AppError("Security error: Token is revoked. Please log in again.", 401));
  }

  // 3) Verify token signature
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return next(new AppError("Invalid or expired access token. Please log in again.", 401));
  }

  // 4) Check if user still exists
  const currentUser = await User.findById(decoded.userId);
  if (!currentUser || currentUser.isSuspended) {
    return next(new AppError("The user belonging to this token no longer exists or is suspended.", 401));
  }

  req.user = currentUser;
  next();
});

export const restrictTo = (...roles: ("Guest" | "Host" | "PropertyManager" | "Admin" | "SuperAdmin")[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }
    next();
  };
};

export const requireOwner = (modelName: "Listing" | "Booking" | "Review") => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const resourceId = req.params.id || req.params.bookingId || req.params.listingId || req.params.reviewId;
    if (!resourceId) {
      return next(new AppError("Resource ID parameter is missing from request path", 400));
    }

    const Model = mongoose.model(modelName);
    const resource = await Model.findById(resourceId);

    if (!resource) {
      return next(new AppError(`${modelName} not found`, 404));
    }

    // Admins and SuperAdmins can bypass ownership validation checks
    if (req.user?.role === "Admin" || req.user?.role === "SuperAdmin") {
      return next();
    }

    const ownerId = resource.owner || resource.user || resource.author;
    if (!ownerId || ownerId.toString() !== req.user?._id.toString()) {
      return next(new AppError("You do not own this resource.", 403));
    }

    next();
  });
};
