import express from "express";
import { handleRazorpayWebhook } from "../controllers/razorpayWebhookController.js";

const router = express.Router();

router.post("/webhook", handleRazorpayWebhook);

export default router;
