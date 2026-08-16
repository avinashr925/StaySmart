import { Router } from "express";
import * as reviewController from "../controllers/reviewController";
import { protect } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createReviewSchema, updateReviewSchema } from "../validators/reviewValidator";
import { upload } from "../config/cloudinary";

const router = Router();

router.get("/listing/:listingId", reviewController.getListingReviews);

router.post(
  "/listing/:listingId",
  protect,
  upload.array("images", 3),
  validate(createReviewSchema),
  reviewController.createReview
);

router.put(
  "/:id",
  protect,
  upload.array("images", 3),
  validate(updateReviewSchema),
  reviewController.updateReview
);

router.delete("/:id", protect, reviewController.deleteReview);

export default router;
