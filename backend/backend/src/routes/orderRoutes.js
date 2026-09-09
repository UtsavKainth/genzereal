import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  createPaymentOrder,
  verifyPayment,
  myOrders,
  cancelMyOrder,
  requestReturnExchange,
  trackMyOrder,
} from "../controllers/orderController.js";

const router = Router();
router.use(protect);
router.post("/payment/create", createPaymentOrder);
router.post("/payment/verify", verifyPayment);
router.get("/mine", myOrders);
router.get("/:orderId/tracking", trackMyOrder);
router.patch("/:orderId/cancel", cancelMyOrder);
router.patch("/:orderId/return-request", requestReturnExchange);
export default router;
