import { z } from "zod";

export const createBookingSchema = z.object({
  body: z.object({
    listingId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Listing ID format"),
    startDate: z.string().datetime({ message: "Start date must be a valid ISO date-time string" }),
    endDate: z.string().datetime({ message: "End date must be a valid ISO date-time string" }),
    totalPrice: z.number().positive("Total price must be a positive number"),
  }),
});
