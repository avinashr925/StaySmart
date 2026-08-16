import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

// Must run before any other module reads process.env for secrets — fails
// fast (before binding a port or touching the DB) if production is missing
// a required secret, and generates a safe ephemeral JWT secret for local
// dev instead of ever falling back to a hardcoded value.
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { verifyAccessToken } from "./utils/jwt";
import User from "./models/user";

// Import Routes
import authRoutes from "./routes/authRoutes";
import listingRoutes from "./routes/listingRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import wishlistRoutes from "./routes/wishlistRoutes";
import aiRoutes from "./routes/aiRoutes";
import adminRoutes from "./routes/adminRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import messageRoutes from "./routes/messageRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import couponRoutes from "./routes/couponRoutes";

// Import Middlewares
import { globalErrorHandler } from "./middlewares/errorHandler";
import { AppError } from "./utils/AppError";

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

// Initialize Socket.IO
let io: Server | null = null;

export const getSocketIO = () => io;

const PORT = env.port;
const MONGO_URL = env.mongoUrl;

// 1) Global Middlewares & Security Filters
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(mongoSanitize());

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

// Razorpay requires the RAW, unparsed request body to verify webhook
// signatures (HMAC is computed over the exact bytes sent). This MUST be
// registered before express.json() below, and scoped only to the webhook
// paths so every other route keeps getting normal parsed JSON.
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use("/api/payments/razorpay/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1b) Per-route rate limiting.
// General baseline for the API surface.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: "Too many requests from this IP. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => {
    const url = req.originalUrl || "";
    return (
      url.startsWith("/api/auth/signup") ||
      url.startsWith("/api/auth/login") ||
      url.startsWith("/api/auth/google") ||
      url.startsWith("/api/auth/github") ||
      url.startsWith("/api/auth/send-otp") ||
      url.startsWith("/api/auth/verify-otp") ||
      url.startsWith("/api/auth/forgot-password") ||
      url.startsWith("/api/auth/reset-password") ||
      url.startsWith("/api/ai")
    );
  },
  handler: (req: any, res: any, next: any, options: any) => {
    res.status(options.statusCode).json({
      status: options.statusCode,
      success: false,
      message: options.message,
      data: null,
      errors: null,
      timestamp: new Date().toISOString(),
      requestId: (req.headers["x-request-id"] as string) || `req_limit_${Math.random().toString(36).substring(2, 10)}`,
    });
  },
});

// Tighter limit on auth endpoints to slow down credential-stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 20 : 150,
  message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: any, res: any, next: any, options: any) => {
    res.status(options.statusCode).json({
      status: options.statusCode,
      success: false,
      message: options.message,
      data: null,
      errors: null,
      timestamp: new Date().toISOString(),
      requestId: (req.headers["x-request-id"] as string) || `req_limit_${Math.random().toString(36).substring(2, 10)}`,
    });
  },
});

// Tighter limit on AI endpoints, which proxy to a paid LLM API and are the
// most expensive requests in the system to let run unbounded.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many AI requests from this IP. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: any, res: any, next: any, options: any) => {
    res.status(options.statusCode).json({
      status: options.statusCode,
      success: false,
      message: options.message,
      data: null,
      errors: null,
      timestamp: new Date().toISOString(),
      requestId: (req.headers["x-request-id"] as string) || `req_limit_${Math.random().toString(36).substring(2, 10)}`,
    });
  },
});

app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/auth/github", authLimiter);
app.use("/api/auth/send-otp", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api", generalLimiter);

// Serve uploaded listing/profile files
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Custom lightweight cookie parser middleware to avoid additional dependencies
app.use((req: any, res: any, next: any) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie: string) => {
      const parts = cookie.split("=");
      const key = parts[0].trim();
      const val = parts.slice(1).join("=");
      req.cookies[key] = decodeURIComponent(val || "");
    });
  }
  next();
});

// 2) Connect Database is deferred to the end of startup.

// 3) REST Routing
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/coupons", couponRoutes);

// Health check (deployment/monitoring probes; Docker HEALTHCHECK-compatible —
// exits non-zero status code on DB disconnect so orchestrators can restart).
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    db: dbState === 1 ? "connected" : "disconnected",
  });
});

// Interactive API Swagger Docs
app.get("/api-docs", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>StaySmart API Reference Documentation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2.5rem; background: #fafafa; color: #1f2937; }
          h1 { color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; font-size: 2.25rem; font-weight: 800; }
          .endpoint { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .method { display: inline-block; font-weight: 800; padding: 0.35rem 0.85rem; border-radius: 6px; color: white; margin-right: 1rem; font-size: 0.8rem; }
          .get { background: #10b981; }
          .post { background: #3b82f6; }
          .put { background: #f59e0b; }
          .delete { background: #ef4444; }
          .path { font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 1.05rem; font-weight: 600; color: #111827; }
          .roles { font-size: 0.75rem; color: #4b5563; margin-top: 0.6rem; font-weight: 600; background: #f3f4f6; display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; }
          p { margin: 0.8rem 0 0; color: #4b5563; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <h1>StaySmart API Reference System Specs</h1>
        <div class="endpoint">
          <span class="method post">POST</span><span class="path">/api/auth/signup</span>
          <p>Register a new Guest or Host account.</p>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span><span class="path">/api/auth/login</span>
          <p>Sign in with email and password to retrieve token details.</p>
        </div>
        <div class="endpoint">
          <span class="method get">GET</span><span class="path">/api/auth/sessions</span>
          <div><span class="roles">Authentication required: Guest | Host | Admin</span></div>
          <p>List all active device sessions logged into this account (browsers, IPs, device types).</p>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span><span class="path">/api/payments/checkout</span>
          <div><span class="roles">Authentication required: Guest</span></div>
          <p>Acquires a 5-minute checkout lock and creates a Razorpay order.</p>
        </div>
        <div class="endpoint">
          <span class="method get">GET</span><span class="path">/api/ai/pricing/:listingId</span>
          <div><span class="roles">Authentication required: Host | Admin</span></div>
          <p>Consult AI Pricing intelligence regarding seasonality, weekend demand, and competitor stay percentiles.</p>
        </div>
        <div class="endpoint">
          <span class="method get">GET</span><span class="path">/api/ai/recommendations</span>
          <div><span class="roles">Authentication required: Guest</span></div>
          <p>Calculate similarity-based listing suggestions based on history and wishlists.</p>
        </div>
      </body>
    </html>
  `);
});

// Fallback for undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

// 4) Configure WebSockets (Socket.IO)
io = new Server(server, {
  cors: {
    origin: env.frontendUrl,
    credentials: true,
  },
});

io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token && socket.handshake.headers.cookie) {
      const cookieValue = socket.handshake.headers.cookie
        .split("; ")
        .find((row) => row.startsWith("accessToken="))
        ?.split("=")[1];
      if (cookieValue) {
        token = decodeURIComponent(cookieValue);
      }
    }

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = verifyAccessToken(token as string);
    const userExists = await User.findById(decoded.userId);
    if (!userExists || userExists.isSuspended) {
      return next(new Error("Authentication error: User not found or suspended"));
    }

    (socket as any).userId = decoded.userId;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  const verifiedUserId = (socket as any).userId;
  logger.debug("Client connected to socket", { socketId: socket.id, userId: verifiedUserId });

  if (verifiedUserId) {
    socket.join(`user-${verifiedUserId}`);
    logger.debug("Socket joined verified user room", { socketId: socket.id, userId: verifiedUserId });
  }

  // Authenticated users join a room matching their ID to receive private notifications
  socket.on("join", (userId: string) => {
    if (userId === verifiedUserId) {
      socket.join(`user-${userId}`);
      logger.debug("Socket joined user room", { socketId: socket.id, userId });
    } else {
      logger.warn("Socket client attempted unauthorized room join", {
        socketId: socket.id,
        requestedUserId: userId,
        verifiedUserId,
      });
    }
  });

  // Real-time chat events: typing indicator
  socket.on("typing", ({ senderId, receiverId }) => {
    if (senderId === verifiedUserId) {
      socket.to(`user-${receiverId}`).emit("typing", { senderId });
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    if (senderId === verifiedUserId) {
      socket.to(`user-${receiverId}`).emit("stopTyping", { senderId });
    }
  });

  socket.on("disconnect", () => {
    logger.debug("Client disconnected", { socketId: socket.id });
  });
});

// Process-level safety nets: an uncaught error inside route handlers already
// can't crash the process (catchAsync routes every async controller error
// through the Express error middleware). These two handlers cover the
// remaining gap — errors thrown outside the request/response cycle
// (background timers, unhandled promise rejections, etc.) — by logging with
// full context and shutting down deliberately so a process manager (Docker,
// PM2, systemd) can restart into a known-good state, rather than continuing
// to serve traffic from a process in an undefined state.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", {
    reason: reason instanceof Error
      ? reason.message
      : (reason && typeof reason === "object" ? JSON.stringify(reason) : String(reason)),
    stack: reason instanceof Error ? reason.stack : (reason as any)?.stack || undefined,
  });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception — shutting down", { error: err.message, stack: err.stack });
  process.exit(1);
});

// 5) Start Server after database connection succeeds
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    logger.info("Connected to MongoDB successfully!");

    server.listen(PORT, () => {
      logger.info(`Server is running in ${env.nodeEnv} mode on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error("Database connection failure — shutting down", { error: err.message });
    process.exit(1);
  }
};

startServer();
