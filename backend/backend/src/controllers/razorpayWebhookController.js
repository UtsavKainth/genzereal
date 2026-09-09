import crypto from "crypto";

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret) {
      return res.status(500).json({ ok: false, message: "Webhook secret not configured" });
    }

    if (!signature || !req.rawBody) {
      return res.status(400).json({ ok: false, message: "Invalid webhook request" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");

    const isValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );

    if (!isValid) {
      return res.status(401).json({ ok: false, message: "Invalid signature" });
    }

    const event = req.body?.event;

    console.log("Razorpay webhook received:", event);

    if (
      event === "payment.captured" ||
      event === "payment.failed" ||
      event === "order.paid"
    ) {
      console.log("Razorpay event processed:", event);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return res.status(500).json({ ok: false });
  }
};
