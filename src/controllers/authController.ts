import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cookie settings
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

const sendTokens = (res: Response, user: any, statusCode: number) => {
  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Save refresh token to user array in DB
  user.refreshTokens.push(refreshToken);
  // Keep refresh token array bounded (e.g. limit to 5 active sessions)
  if (user.refreshTokens.length > 5) {
    user.refreshTokens.shift();
  }
  user.save({ validateBeforeSave: false });

  // Set HTTP-only cookies
  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Remove password from output
  const userOutput = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };

  res.status(statusCode).json({
    status: "success",
    accessToken,
    user: userOutput,
  });
};

export const signup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, role } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("Email is already registered. Please login instead.", 400));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "Guest",
  });

  sendTokens(res, newUser, 201);
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // 2) Find user & select password explicitly since select: false in schema
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password || ""))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) Send tokens
  sendTokens(res, user, 200);
});

export const logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    // Decode user and remove refresh token from database
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
        await user.save({ validateBeforeSave: false });
      }
    } catch (err) {
      // Ignore token verification errors during logout
    }
  }

  // Clear cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

export const refresh = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return next(new AppError("No refresh token provided. Please log in.", 401));
  }

  // 1) Verify token signature
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    return next(new AppError("Invalid or expired refresh token. Please log in again.", 401));
  }

  // 2) Check if user exists & if token is registered in user active refreshTokens
  const user = await User.findById(decoded.userId);
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    // If user exists but token is missing, token reuse might have occurred -> clear all sessions for security
    if (user) {
      user.refreshTokens = [];
      await user.save({ validateBeforeSave: false });
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return next(new AppError("Security alert: Session compromised. Please re-authenticate.", 401));
  }

  // 3) Sign new access token (keep refresh token rotation or re-use existing refresh token)
  const payload = { userId: user._id.toString(), role: user.role };
  const newAccessToken = signAccessToken(payload);

  res.cookie("accessToken", newAccessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000,
  });

  res.status(200).json({
    status: "success",
    accessToken: newAccessToken,
  });
});

export const googleLogin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError("Google idToken is required", 400));
  }

  let email: string | undefined;
  let name: string | undefined;
  let avatar: string | undefined;
  let googleId: string | undefined;

  try {
    // Try to verify token if client ID is configured
    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (payload) {
        email = payload.email;
        name = payload.name;
        avatar = payload.picture;
        googleId = payload.sub;
      }
    } else {
      // Mock validation for test/local runs without client configuration
      // Assuming a JWT decode format since it is a mock implementation
      console.log("No GOOGLE_CLIENT_ID configured, utilizing developer fallback verification");
      const decodedMock = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString());
      email = decodedMock.email;
      name = decodedMock.name;
      avatar = decodedMock.picture;
      googleId = decodedMock.sub || decodedMock.googleId;
    }
  } catch (err: any) {
    return next(new AppError(`Google OAuth verification failed: ${err.message}`, 400));
  }

  if (!email || !name) {
    return next(new AppError("Incomplete profile information returned from Google", 400));
  }

  // Find or create user
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      avatar,
      role: "Guest", // Default role
    });
  } else {
    // Update googleId and avatar if not present
    if (!user.googleId) user.googleId = googleId;
    if (avatar && !user.avatar) user.avatar = avatar;
    await user.save({ validateBeforeSave: false });
  }

  sendTokens(res, user, 200);
});

export const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError("User not found in context", 404));
  }

  res.status(200).json({
    status: "success",
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
    },
  });
});
