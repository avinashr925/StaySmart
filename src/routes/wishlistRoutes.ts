import { Router } from "express";
import * as wishlistController from "../controllers/wishlistController";
import { protect } from "../middlewares/auth";

const router = Router();

router.use(protect);

router.get("/", wishlistController.getWishlist);
router.post("/toggle", wishlistController.toggleWishlist);

export default router;
