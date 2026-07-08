import { z } from "zod";

export const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().min(10, "Description must be at least 10 characters"),
    images: z.array(z.string().url("Invalid image URL")).optional(),
    price: z.preprocess((val) => Number(val), z.number().nonnegative("Price must be 0 or greater")),
    country: z.string().min(2, "Country is required"),
    city: z.string().min(2, "City is required"),
    address: z.string().min(5, "Address is required"),
    latitude: z.preprocess((val) => Number(val), z.number().min(-90).max(90)).optional(),
    longitude: z.preprocess((val) => Number(val), z.number().min(-180).max(180)).optional(),
    amenities: z.array(z.string()).optional(),
    propertyType: z.string().min(2, "Property type is required"),
    bedrooms: z.preprocess((val) => Number(val), z.number().int().positive("Bedrooms must be positive")),
    bathrooms: z.preprocess((val) => Number(val), z.number().positive("Bathrooms must be positive")),
    guests: z.preprocess((val) => Number(val), z.number().int().positive("Guests count must be positive")),
  }),
});

export const updateListingSchema = createListingSchema.partial();
