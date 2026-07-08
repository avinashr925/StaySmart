import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// Import Routes
import authRoutes from "./routes/authRoutes";
import listingRoutes from "./routes/listingRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import wishlistRoutes from "./routes/wishlistRoutes";
import aiRoutes from "./routes/aiRoutes";

// Import Middlewares
import { globalErrorHandler } from "./middlewares/errorHandler";
import { AppError } from "./utils/AppError";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
let io: Server | null = null;

export const getSocketIO = () => io;

const PORT = process.env.PORT || 8080;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staysmart";

// 1) Global Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder statically for mock file storage
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

// 2) Connect Database
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB successfully!");
  })
  .catch((err) => {
    console.error("Database connection failure:", err);
  });

// 3) REST Routing
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/ai", aiRoutes);

// Fallback for undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

// 4) Configure WebSockets (Socket.IO)
io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Client connected to socket:", socket.id);

  // Authenticated users join a room matching their ID to receive private notifications
  socket.on("join", (userId: string) => {
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`Socket ${socket.id} joined room user-${userId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// 5) Start Server
server.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
