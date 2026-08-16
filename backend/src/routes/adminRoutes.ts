import { Router } from "express";
import * as adminController from "../controllers/adminController";
import { protect, restrictTo } from "../middlewares/auth";

const router = Router();

// Apply protection and restrict to Admins for all routes here
router.use(protect);
router.use(restrictTo("Admin", "SuperAdmin"));

router.post("/approve-host/:hostId", adminController.approveHost);
router.post("/suspend-user/:userId", adminController.suspendUser);
router.delete("/listings/:listingId", adminController.deleteListingAdmin);
router.post("/listings/:listingId/moderate", adminController.moderateListing);
router.get("/feature-flags", adminController.getFeatureFlags);
router.post("/feature-flags", adminController.updateFeatureFlag);
router.get("/analytics", adminController.getSystemAnalytics);
router.get("/audit-logs", adminController.getAuditLogs);
router.get("/tickets", adminController.getSupportTickets);
router.post("/tickets/:ticketId", adminController.updateTicketStatus);

export default router;
