import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

const handleCastErrorDB = (err: any) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)?.[0] || "";
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err: any) => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () => new AppError("Your token has expired! Please log in again.", 401);

const sendErrorDev = (err: any, req: Request, res: Response) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: statusCode,
    success: false,
    message: err.message,
    data: {
      stack: err.stack,
      error: err,
    },
    errors: err.errors || null,
    timestamp: new Date().toISOString(),
    requestId: (req.headers["x-request-id"] as string) || `req_dev_${Math.random().toString(36).substring(2, 10)}`,
  });
};

const sendErrorProd = (err: any, req: Request, res: Response) => {
  const statusCode = err.statusCode || 500;
  const requestId = (req.headers["x-request-id"] as string) || `req_prod_${Math.random().toString(36).substring(2, 10)}`;

  if (err.isOperational) {
    res.status(statusCode).json({
      status: statusCode,
      success: false,
      message: err.message,
      data: null,
      errors: err.errors || null,
      timestamp: new Date().toISOString(),
      requestId,
    });
  } else {
    logger.error("Unhandled programming error", { message: err.message, stack: err.stack, name: err.name, requestId });
    res.status(500).json({
      status: 500,
      success: false,
      message: "Something went wrong on the server!",
      data: null,
      errors: null,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
};

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.errors = err.errors;

    if (err.name === "CastError") error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === "ValidationError") error = handleValidationErrorDB(error);
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
