import { z } from "zod";

const imageUrlSchema = z.string().refine((val) => {
  try {
    new URL(val);
    return true;
  } catch {
    return val.startsWith("/") || val.startsWith("uploads/");
  }
}, {
  message: "Invalid image URL or path"
});

export const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().min(10, "Description must be at least 10 characters"),
    images: z.array(imageUrlSchema).optional(),
    imageMetadata: z.preprocess((val) => {
      if (typeof val === "string" && val.trim() !== "") {
        try { return JSON.parse(val); } catch (e) { return val; }
      }
      return val;
    }, z.array(z.object({
      fileName: z.string(),
      category: z.enum(["Living Room", "Bedroom", "Kitchen", "Bathroom", "Exterior", "Other"]),
      order: z.preprocess((v) => Number(v), z.number()),
      isCover: z.preprocess((v) => v === "true" || v === true, z.boolean()),
    }))).optional(),
    existingImages: z.preprocess((val) => {
      if (typeof val === "string" && val.trim() !== "") {
        try { return JSON.parse(val); } catch (e) { return val; }
      }
      return val;
    }, z.array(z.object({
      url: imageUrlSchema,
      category: z.enum(["Living Room", "Bedroom", "Kitchen", "Bathroom", "Exterior", "Other"]),
      order: z.preprocess((v) => Number(v), z.number()),
      isCover: z.preprocess((v) => v === "true" || v === true, z.boolean()),
    }))).optional(),
    price: z.preprocess((val) => Number(val), z.number().nonnegative("Price must be 0 or greater")),
    country: z.string().min(2, "Country is required"),
    city: z.string().min(2, "City is required"),
    address: z.string().min(5, "Address is required"),
    latitude: z.preprocess((val) => Number(val), z.number().min(-90).max(90)).optional(),
    longitude: z.preprocess((val) => Number(val), z.number().min(-180).max(180)).optional(),
    amenities: z.preprocess((val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return [];
        return val.split(",").map((s) => s.trim());
      }
      return val;
    }, z.array(z.string())).optional(),
    propertyType: z.string().min(2, "Property type is required"),
    bedrooms: z.preprocess((val) => Number(val), z.number().int().positive("Bedrooms must be positive")),
    bathrooms: z.preprocess((val) => Number(val), z.number().positive("Bathrooms must be positive")),
    guests: z.preprocess((val) => Number(val), z.number().int().positive("Guests count must be positive")),
    virtualTour: z.preprocess((val) => {
      if (typeof val === "string" && val.trim() !== "") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
      return val;
    }, z.object({
      enabled: z.boolean().default(false),
      rooms: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          panorama: imageUrlSchema,
          hotspots: z.array(
            z.object({
              pitch: z.preprocess((v) => Number(v), z.number()),
              yaw: z.preprocess((v) => Number(v), z.number()),
              type: z.enum(["info", "scene"]),
              text: z.string().min(1),
              targetRoomId: z.string().optional(),
            })
          ).optional(),
        })
      ),
    }).refine((tour) => {
      if (!tour.enabled || !tour.rooms) return true;
      const roomIds = new Set(tour.rooms.map((r) => r.id));
      for (const room of tour.rooms) {
        if (room.hotspots) {
          for (const h of room.hotspots) {
            if (h.type === "scene" && (!h.targetRoomId || !roomIds.has(h.targetRoomId))) {
              return false;
            }
          }
        }
      }
      return true;
    }, {
      message: "Virtual Tour hotspots of type 'scene' must point to a valid Room ID in the tour.",
    })).optional(),
    houseRules: z.preprocess((val) => {
      if (typeof val === "string" && val.trim() !== "") {
        try { return JSON.parse(val); } catch (e) { return val; }
      }
      return val;
    }, z.object({
      smokingAllowed: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
      petsAllowed: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
      partiesAllowed: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
      childrenAllowed: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(true),
      quietHoursStart: z.string().optional().default(""),
      quietHoursEnd: z.string().optional().default(""),
      checkInFrom: z.string().optional().default("14:00"),
      checkInUntil: z.string().optional().default("22:00"),
      checkOutBy: z.string().optional().default("11:00"),
      customRules: z.array(z.string()).optional().default([]),
    })).optional(),
    cancellationPolicy: z.enum(["Flexible", "Moderate", "Strict", "Custom"]).optional().default("Moderate"),
    cancellationPolicyDetails: z.string().optional().default(""),
  }),
});

export const updateListingSchema = z.object({
  body: createListingSchema.shape.body.partial(),
});
