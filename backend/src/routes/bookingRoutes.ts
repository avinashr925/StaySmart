import { Router } from "express";
import * as bookingController from "../controllers/bookingController";
import { protect, restrictTo } from "../middlewares/auth";

const router = Router();

router.use(protect);

router.post("/waitlist", bookingController.joinWaitlist);
router.get("/guest", bookingController.getGuestBookings);
router.get("/host", restrictTo("Host", "Admin"), bookingController.getHostBookings);
router.get("/:id/refund-preview", bookingController.getRefundPreview);
router.delete("/:id", bookingController.cancelBooking);
router.get("/chat-context", bookingController.getChatBookingContext);
router.get("/listing/:listingId", bookingController.getListingBookedDates);

export default router;
