import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middlewares/validate";
import { signupSchema, loginSchema } from "../validators/authValidator";
import { protect } from "../middlewares/auth";

const router = Router();

router.post("/signup", validate(signupSchema), authController.signup);
router.post("/login", validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refresh);
router.post("/google", authController.googleLogin);
router.get("/me", protect, authController.getMe);

export default router;
