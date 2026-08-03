import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  createOrder,
  createPaymentOrder,
  verifyPayment,
  myOrders,
  cancelMyOrder,
} from "../controllers/orderController.js";

const router = Router();
router.use(protect);
router.post("/payment/create", createPaymentOrder);
router.post("/payment/verify", verifyPayment);
router.post("/", createOrder);
router.get("/mine", myOrders);
router.patch("/:orderId/cancel", cancelMyOrder);
export default router;
