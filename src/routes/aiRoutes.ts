import { Router } from "express";
import * as aiController from "../controllers/aiController";
import { protect } from "../middlewares/auth";

const router = Router();

// Keep these open or protected. Chat assistant and price estimation can require login if desired,
// but for a smooth application demonstration we can keep them accessible or protect them as follows:
router.post("/search", aiController.semanticSearch);
router.post("/chat", aiController.chatAssistant);
router.get("/predict", aiController.predictPrice);

export default router;
