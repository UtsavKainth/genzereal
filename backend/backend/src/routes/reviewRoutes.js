import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  getProductReviews,
  createOrUpdateReview,
  deleteMyReview,
} from "../controllers/reviewController.js";

const router = Router();

router.get("/:productId", getProductReviews);
router.post("/:productId", protect, createOrUpdateReview);
router.delete("/:productId", protect, deleteMyReview);

export default router;
