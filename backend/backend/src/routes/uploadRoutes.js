import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { uploadProductImages } from "../controllers/uploadController.js";

const router = Router();

router.post(
  "/product-images",
  protect,
  adminOnly,
  upload.array("images", 8),
  uploadProductImages
);

export default router;