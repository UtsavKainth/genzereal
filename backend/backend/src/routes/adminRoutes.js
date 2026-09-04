import { Router } from "express";
import {
  protect,
  adminOnly,
} from "../middleware/auth.js";
import {
  getAdminDashboard,
  getAllOrders,
  updateOrderStatus,
  updateReturnRequest,
} from "../controllers/adminController.js";

const router = Router();

router.use(protect, adminOnly);

router.get("/dashboard", getAdminDashboard);
router.get("/orders", getAllOrders);
router.patch(
  "/orders/:orderId",
  updateOrderStatus
);

router.patch(
  "/orders/:orderId/return-request",
  updateReturnRequest
);

export default router;