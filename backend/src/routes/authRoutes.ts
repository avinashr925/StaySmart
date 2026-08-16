import { Router } from "express";
import * as authController from "../controllers/authController";
import * as adminController from "../controllers/adminController";
import { validate } from "../middlewares/validate";
import { signupSchema, loginSchema } from "../validators/authValidator";
import { protect } from "../middlewares/auth";
import { upload } from "../config/cloudinary";

const router = Router();

// Public auth endpoints
router.post("/signup", validate(signupSchema), authController.signup);
router.post("/login", validate(loginSchema), authController.login);
router.post("/check-username", authController.checkUsername);
router.post("/check-email", authController.checkEmail);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refresh);
router.post("/google", authController.googleLogin);
router.post("/github", authController.githubLogin);
router.post("/send-otp", authController.sendVerificationOTP);
router.post("/verify-otp", authController.verifyEmailOTP);

// Password recovery
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);
router.get("/verify-email/:token", authController.verifyEmail);

// Protected endpoints
router.use(protect);

router.get("/me", authController.getMe);
router.put("/profile", authController.updateProfile);
router.post("/host/onboarding", authController.onboardHostPayment);
router.post("/host/onboarding/sync", authController.syncHostPaymentStatus);
router.post("/profile/upload-avatar", upload.single("avatar"), authController.uploadAvatar);
router.delete("/profile/avatar", authController.deleteAvatar);
router.put("/update-password", authController.updatePassword);

// Device session management
router.get("/sessions", authController.getActiveSessions);
router.delete("/sessions/other", authController.revokeAllOtherSessions);
router.delete("/sessions/:sessionId", authController.revokeSession);
router.post("/tickets", adminController.createSupportTicket);

export default router;
