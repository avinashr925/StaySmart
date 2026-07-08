import { Router } from "express";
import * as bookingController from "../controllers/bookingController";
import { protect, restrictTo } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createBookingSchema } from "../validators/bookingValidator";

const router = Router();

router.use(protect);

router.post("/", validate(createBookingSchema), bookingController.createBooking);
router.get("/guest", bookingController.getGuestBookings);
router.get("/host", restrictTo("Host", "Admin"), bookingController.getHostBookings);
router.delete("/:id", bookingController.cancelBooking);
router.get("/listing/:listingId", bookingController.getListingBookedDates);

export default router;
