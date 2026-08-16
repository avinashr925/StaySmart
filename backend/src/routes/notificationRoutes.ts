import { Router } from "express";
import * as notificationController from "../controllers/notificationController";
import { protect } from "../middlewares/auth";

const router = Router();

router.use(protect);

router.get("/", notificationController.getNotifications);
router.post("/read-all", notificationController.markAllNotificationsAsRead);
router.post("/read/:id", notificationController.markNotificationAsRead);

export default router;
