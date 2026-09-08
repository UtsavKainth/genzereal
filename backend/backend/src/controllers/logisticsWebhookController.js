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
    status.includes("picked_up") ||
    status.includes("shipped")
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

const STATUS_RANK = {
  placed: 0,
  confirmed: 1,
  packed: 2,
  dispatched: 3,
  out_for_delivery: 4,
  delivered: 5,
};

function shouldApplyStatus(currentStatus, nextStatus) {
  if (!nextStatus || currentStatus === nextStatus) {
    return false;
  }

  // Final states must never move backwards.
  if (
    currentStatus === "delivered" ||
    currentStatus === "cancelled"
  ) {
    return false;
  }

  // Cancellation is allowed until delivery.
  if (nextStatus === "cancelled") {
    return currentStatus !== "delivered";
  }

  const currentRank =
    STATUS_RANK[currentStatus] ?? -1;

  const nextRank =
    STATUS_RANK[nextStatus] ?? -1;

  return nextRank > currentRank;
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
      shouldApplyStatus(
        order.status,
        nextStatus
      )
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
