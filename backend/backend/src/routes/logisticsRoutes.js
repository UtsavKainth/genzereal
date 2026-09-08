import { Router } from "express";
import { logisticsStatusWebhook } from "../controllers/logisticsWebhookController.js";

const router = Router();

router.post("/status-update", logisticsStatusWebhook);

export default router;
