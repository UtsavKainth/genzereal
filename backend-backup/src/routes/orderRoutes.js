import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { createOrder, myOrders } from "../controllers/orderController.js";
const router = Router();
router.use(protect);
router.post("/", createOrder);
router.get("/mine", myOrders);
export default router;
