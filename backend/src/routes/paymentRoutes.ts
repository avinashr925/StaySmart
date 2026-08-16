import { Router } from "express";
import * as paymentController from "../controllers/paymentController";
import { protect } from "../middlewares/auth";

const router = Router();

// Razorpay webhook endpoints are intentionally public; signatures are verified server-side.
router.post("/webhook", paymentController.razorpayWebhook);
router.post("/razorpay/webhook", paymentController.razorpayWebhook);

router.post("/checkout", protect, paymentController.checkoutSession);
router.post("/confirm", protect, paymentController.confirmPayment);
router.post("/mock/confirm", protect, paymentController.confirmMockPayment);
router.post("/upi/checkout", protect, paymentController.upiCheckout);
router.post("/upi/confirm/:bookingId", protect, paymentController.confirmUpiPayment);
router.get("/invoice/:bookingId", protect, paymentController.getInvoice);
router.get("/invoice/:bookingId/pdf", protect, paymentController.downloadInvoicePdf);

export default router;
