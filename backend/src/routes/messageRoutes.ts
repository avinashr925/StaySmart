import { Router } from "express";
import * as messageController from "../controllers/messageController";
import { protect } from "../middlewares/auth";
import { upload } from "../config/cloudinary";

const router = Router();

router.use(protect);

router.post("/upload", upload.single("attachment"), messageController.uploadAttachment);
router.post("/", messageController.sendMessage);
router.get("/conversations", messageController.getConversations);
router.get("/history/:otherUserId", messageController.getMessages);
router.post("/read/:otherUserId", messageController.markAsRead);

export default router;
