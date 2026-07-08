import { z } from "zod";

export const createReviewSchema = z.object({
  body: z.object({
    rating: z.preprocess((val) => Number(val), z.number().int().min(1).max(5)),
    comment: z.string().min(3, "Comment must be at least 3 characters"),
    images: z.array(z.string().url("Invalid image URL")).optional(),
  }),
});

export const updateReviewSchema = createReviewSchema.partial();
