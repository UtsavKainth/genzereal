import { Router } from "express";
import {
  getProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

/* Public Routes */
router.get("/", getProducts);

/* Admin Routes */
router.get("/admin", protect, adminOnly, getAdminProducts);

router.post("/", protect, adminOnly, createProduct);

router.put("/:productId", protect, adminOnly, updateProduct);

router.delete("/:productId", protect, adminOnly, deleteProduct);

export default router;