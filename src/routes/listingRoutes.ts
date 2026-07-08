import { Router } from "express";
import * as listingController from "../controllers/listingController";
import { protect, restrictTo } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createListingSchema, updateListingSchema } from "../validators/listingValidator";
import { upload } from "../config/cloudinary";

const router = Router();

router.get("/", listingController.getAllListings);
router.get("/host", protect, restrictTo("Host", "Admin"), listingController.getHostListings);
router.get("/:id", listingController.getListing);

router.post(
  "/",
  protect,
  restrictTo("Host", "Admin"),
  upload.array("images", 5),
  validate(createListingSchema),
  listingController.createListing
);

router.put(
  "/:id",
  protect,
  restrictTo("Host", "Admin"),
  upload.array("images", 5),
  validate(updateListingSchema),
  listingController.updateListing
);

router.delete("/:id", protect, restrictTo("Host", "Admin"), listingController.deleteListing);

export default router;
