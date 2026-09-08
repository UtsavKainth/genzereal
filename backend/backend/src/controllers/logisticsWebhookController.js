import Order from "../models/Order.js";

function mapShippingStatus(value) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status.includes("delivered") &&
    !status.includes("rto")
  ) {
    return "delivered";
  }

  if (
    status.includes("out for delivery") ||
    status.includes("out_for_delivery")
  ) {
    return "out_for_delivery";
  }

  if (
    status.includes("in transit") ||
    status.includes("in_transit") ||
    status.includes("picked up") ||
    status.includes("picked_up")
  ) {
    return "dispatched";
  }

  if (
    status.includes("pickup") ||
    status.includes("awb") ||
    status.includes("new")
  ) {
    return null;
  }

  if (
    status.includes("cancelled") ||
    status.includes("canceled")
  ) {
    return "cancelled";
  }

  return null;
}

export async function logisticsStatusWebhook(req, res) {
  try {
    const expectedKey =
      process.env.LOGISTICS_WEBHOOK_SECRET;

    const receivedKey =
      req.get("x-api-key");

    if (
      !expectedKey ||
      !receivedKey ||
      receivedKey !== expectedKey
    ) {
      return res.status(401).json({
        ok: false,
      });
    }

    const awb = String(
      req.body?.awb ||
      req.body?.awb_code ||
      ""
    ).trim();

    if (!awb) {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    const order = await Order.findOne({
      $or: [
        { "shiprocket.awbCode": awb },
        { "courier.awbNumber": awb },
      ],
    });

    if (!order) {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    const shippingStatus =
      req.body?.current_status ||
      req.body?.shipment_status ||
      "";

    const nextStatus =
      mapShippingStatus(shippingStatus);

    order.shiprocket.status =
      String(shippingStatus || "");

    if (
      req.body?.courier_name &&
      !order.shiprocket.courierName
    ) {
      order.shiprocket.courierName =
        req.body.courier_name;
    }

    if (
      nextStatus &&
      order.status !== nextStatus
    ) {
      order.status = nextStatus;

      order.statusHistory.push({
        status: nextStatus,
        message:
          `Shipment update: ${shippingStatus}`,
        changedAt: new Date(),
      });
    }

    await order.save();

    return res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "Logistics webhook error:",
      error
    );

    return res.status(200).json({
      ok: false,
    });
  }
}
