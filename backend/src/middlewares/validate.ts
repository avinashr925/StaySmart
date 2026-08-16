import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { AppError } from "../utils/AppError";

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Replace req properties with parsed & sanitized versions
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.slice(1).join("."), // slice(1) removes the root 'body' or 'query' prefix
          message: err.message
        }));
        return next(new AppError(`Validation failed. ${errorMessages}`, 400, fieldErrors));
      }
      next(error);
    }
  };
};
