import { Router } from "express";
import * as couponController from "../controllers/couponController";
import { protect, restrictTo } from "../middlewares/auth";

const router = Router();

// Public validation endpoint
router.get("/validate/:code", couponController.validateCoupon);

// Guest/general booking available coupons
router.get("/available", protect, couponController.getAvailableCoupons);

// Host routes
router.use(protect);
router.get("/host", restrictTo("Host", "Admin"), couponController.getHostCoupons);
router.post("/host", restrictTo("Host", "Admin"), couponController.createCoupon);
router.patch("/host/:id/toggle", restrictTo("Host", "Admin"), couponController.toggleCouponActive);
router.delete("/host/:id", restrictTo("Host", "Admin"), couponController.deleteCoupon);

export default router;
