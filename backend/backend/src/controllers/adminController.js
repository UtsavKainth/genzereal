import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { sendOrderStatusUpdate } from "../utils/mailer.js";
import { generateShiprocketLabel } from "../services/shiprocketService.js";

const ALLOWED_STATUSES = [
  "placed",
  "confirmed",
  "packed",
  "dispatched",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const STATUS_ORDER = {
  placed: 0,
  confirmed: 1,
  packed: 2,
  dispatched: 3,
  out_for_delivery: 4,
  delivered: 5,
};

const STATUS_MESSAGES = {
  placed: "Your order has been placed successfully",
  confirmed: "Your order has been confirmed",
  packed: "Your order has been packed",
  dispatched: "Your order has been dispatched",
  out_for_delivery: "Your order is out for delivery",
  delivered: "Your order has been delivered successfully",
  cancelled: "Your order has been cancelled",
};

const normalizeStatus = (status) =>
  status === "booked" ? "placed" : status;

async function restoreOrderStock(items = []) {
  for (const item of items) {
    const productId = Number(item.productId);
    const size = String(item.size || "").trim();
    const qty = Math.max(1, Number(item.qty) || 1);

    if (
      !Number.isFinite(productId) ||
      !size ||
      size === "Not selected"
    ) {
      continue;
    }

    await Product.updateOne(
      {
        id: productId,
        "sizes.size": size,
      },
      {
        $inc: {
          "sizes.$.stock": qty,
          totalStock: qty,
        },
      }
    );
  }
}

async function sendStatusEmailSafely(order) {
  try {
    await sendOrderStatusUpdate(order);

    return {
      sent: true,
      error: "",
    };
  } catch (error) {
    console.error(
      "Order status email failed:",
      error.message
    );

    return {
      sent: false,
      error: error.message,
    };
  }
}

export async function getAdminDashboard(req, res) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalCustomers,
      revenueResult,
      todayOrders,
      todayRevenueResult,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments(),

      Order.countDocuments({
        status: {
          $in: [
            "placed",
            "confirmed",
            "packed",
            "dispatched",
            "out_for_delivery",
          ],
        },
      }),

      Order.countDocuments({
        status: "delivered",
      }),

      Order.countDocuments({
        status: "cancelled",
      }),

      User.countDocuments(),

      Order.aggregate([
        {
          $match: {
            status: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $ifNull: [
                  "$total",
                  "$subtotal",
                ],
              },
            },
          },
        },
      ]),

      Order.countDocuments({
        createdAt: {
          $gte: todayStart,
        },
      }),

      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: todayStart,
            },
            status: {
              $ne: "cancelled",
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $ifNull: [
                  "$total",
                  "$subtotal",
                ],
              },
            },
          },
        },
      ]),

      Order.find()
        .sort({
          createdAt: -1,
        })
        .limit(10),
    ]);

    return res.json({
      stats: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        totalCustomers,
        todayOrders,

        totalRevenue:
          revenueResult[0]?.totalRevenue ||
          0,

        todayRevenue:
          todayRevenueResult[0]
            ?.totalRevenue || 0,
      },

      recentOrders,
    });
  } catch (error) {
    console.error(
      "Admin dashboard failed:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load admin dashboard",
    });
  }
}

export async function getAllOrders(req, res) {
  try {
    const {
      status = "",
      search = "",
      paymentMethod = "",
    } = req.query;

    const query = {};

    if (
      status &&
      status !== "all" &&
      ALLOWED_STATUSES.includes(status)
    ) {
      query.status = status;
    }

    if (
      paymentMethod &&
      paymentMethod !== "all"
    ) {
      query.paymentMethod =
        paymentMethod;
    }

    const cleanSearch = String(
      search || ""
    ).trim();

    if (cleanSearch) {
      query.$or = [
        {
          orderNumber: {
            $regex: cleanSearch,
            $options: "i",
          },
        },
        {
          customerName: {
            $regex: cleanSearch,
            $options: "i",
          },
        },
        {
          customerEmail: {
            $regex: cleanSearch,
            $options: "i",
          },
        },
        {
          customerPhone: {
            $regex: cleanSearch,
            $options: "i",
          },
        },
      ];
    }

    const orders = await Order.find(query)
      .sort({
        createdAt: -1,
      });

    return res.json({
      orders,
    });
  } catch (error) {
    console.error(
      "Fetch all orders failed:",
      error
    );

    return res.status(500).json({
      message: "Unable to load orders",
    });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const requestedStatus =
      normalizeStatus(
        String(req.body.status || "").trim()
      );

    const courierName = String(
      req.body.courierName ||
        req.body.courier?.name ||
        ""
    ).trim();

    const trackingNumber = String(
      req.body.trackingNumber ||
        req.body.awbNumber ||
        req.body.courier?.awbNumber ||
        ""
    ).trim();

    const trackingUrl = String(
      req.body.trackingUrl ||
        req.body.courier?.trackingUrl ||
        ""
    ).trim();

    const cancellationReason = String(
      req.body.cancellationReason ||
        req.body.reason ||
        "Cancelled by admin"
    ).trim();

    if (
      !ALLOWED_STATUSES.includes(
        requestedStatus
      )
    ) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(
      req.params.orderId
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const currentStatus =
      normalizeStatus(order.status);

    if (
      currentStatus === "cancelled"
    ) {
      return res.status(400).json({
        message:
          "A cancelled order cannot be updated",
      });
    }

    if (
      currentStatus === "delivered" &&
      requestedStatus !== "delivered"
    ) {
      return res.status(400).json({
        message:
          "A delivered order cannot be moved to another status",
      });
    }

    if (
      requestedStatus !== "cancelled" &&
      requestedStatus !== currentStatus &&
      STATUS_ORDER[requestedStatus] <
        STATUS_ORDER[currentStatus]
    ) {
      return res.status(400).json({
        message:
          "Order status cannot be moved backwards",
      });
    }

    if (
      ["dispatched", "out_for_delivery"].includes(
        requestedStatus
      ) &&
      (!courierName ||
        !trackingNumber)
    ) {
      return res.status(400).json({
        message:
          "Courier name and AWB/tracking number are required",
      });
    }

    const statusChanged =
      currentStatus !== requestedStatus;

    /*
      Restore inventory only once:
      only when changing from a non-cancelled
      status to cancelled.
    */
    if (
      requestedStatus === "cancelled" &&
      currentStatus !== "cancelled"
    ) {
      await restoreOrderStock(order.items);

      order.cancellation.reason =
        cancellationReason;

      order.cancellation.cancelledAt =
        new Date();

      if (
        order.paymentStatus === "paid"
      ) {
        order.paymentStatus = "refunded";
      }
    }

    order.status = requestedStatus;

    order.courier = {
      name:
        courierName ||
        order.courier?.name ||
        "",

      awbNumber:
        trackingNumber ||
        order.courier?.awbNumber ||
        "",

      trackingUrl:
        trackingUrl ||
        order.courier?.trackingUrl ||
        "",
    };

    if (
      requestedStatus === "delivered" &&
      order.paymentMethod === "COD"
    ) {
      order.paymentStatus = "paid";

      if (!order.paidAt) {
        order.paidAt = new Date();
      }
    }

    if (
      statusChanged ||
      order.statusHistory.length === 0
    ) {
      order.statusHistory.push({
        status: requestedStatus,

        message:
          requestedStatus ===
          "cancelled"
            ? cancellationReason
            : STATUS_MESSAGES[
                requestedStatus
              ] || "Order updated",

        changedAt: new Date(),
      });
    }

    /*
      Repair older orders if required fields
      are missing.
    */
    if (
      order.total === undefined ||
      order.total === null
    ) {
      order.total =
        Number(order.subtotal || 0) +
        Number(
          order.shippingCharge || 0
        );
    }

    if (!order.estimatedDeliveryStart) {
      order.estimatedDeliveryStart =
        order.estimatedDeliveryDate ||
        new Date(
          Date.now() +
            4 *
              24 *
              60 *
              60 *
              1000
        );
    }

    if (!order.estimatedDeliveryDate) {
      order.estimatedDeliveryDate =
        new Date(
          Date.now() +
            7 *
              24 *
              60 *
              60 *
              1000
        );
    }

    await order.save({
      validateBeforeSave: false,
    });

    let emailResult = {
      sent: false,
      error: "",
    };

    if (statusChanged) {
      emailResult =
        await sendStatusEmailSafely(
          order
        );
    }

    return res.json({
      message: statusChanged
        ? emailResult.sent
          ? "Order updated and customer email sent"
          : "Order updated, but customer email could not be sent"
        : "Order details updated successfully",

      emailSent: emailResult.sent,
      emailError: emailResult.error,
      order,
    });
  } catch (error) {
    console.error(
      "Update order status failed:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Unable to update order",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
}

/* ---------------- ADMIN RETURN / EXCHANGE ---------------- */

export async function updateReturnRequest(req, res) {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      !order.returnRequest ||
      !order.returnRequest.status ||
      order.returnRequest.status === "none"
    ) {
      return res.status(400).json({
        message: "This order does not have a return or exchange request",
      });
    }

    const requestedStatus = String(
      req.body?.status || ""
    ).trim().toLowerCase();

    const allowedStatuses = [
      "approved",
      "rejected",
      "pickup_scheduled",
      "picked_up",
      "received",
      "exchange_dispatched",
      "refund_processed",
      "completed",
    ];

    if (!allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        message: "Invalid return/exchange status",
      });
    }

    const adminNote = String(
      req.body?.adminNote || ""
    ).trim();

    const reverseCourierName = String(
      req.body?.courierName ||
      req.body?.reverseCourier?.name ||
      ""
    ).trim();

    const reverseAwbNumber = String(
      req.body?.awbNumber ||
      req.body?.trackingNumber ||
      req.body?.reverseCourier?.awbNumber ||
      ""
    ).trim();

    const reverseTrackingUrl = String(
      req.body?.trackingUrl ||
      req.body?.reverseCourier?.trackingUrl ||
      ""
    ).trim();

    const replacementCourierName = String(
      req.body?.replacementCourierName ||
      req.body?.replacementCourier?.name ||
      ""
    ).trim();

    const replacementAwbNumber = String(
      req.body?.replacementAwbNumber ||
      req.body?.replacementTrackingNumber ||
      req.body?.replacementCourier?.awbNumber ||
      ""
    ).trim();

    const replacementTrackingUrl = String(
      req.body?.replacementTrackingUrl ||
      req.body?.replacementCourier?.trackingUrl ||
      ""
    ).trim();

    if (
      requestedStatus === "rejected" &&
      !adminNote
    ) {
      return res.status(400).json({
        message: "Please enter a reason before rejecting the request",
      });
    }

    if (
      requestedStatus === "pickup_scheduled" &&
      (!reverseCourierName || !reverseAwbNumber)
    ) {
      return res.status(400).json({
        message:
          "Reverse courier name and AWB/tracking number are required when scheduling pickup",
      });
    }

    if (
      requestedStatus === "exchange_dispatched" &&
      (!replacementCourierName || !replacementAwbNumber)
    ) {
      return res.status(400).json({
        message:
          "Replacement courier name and AWB/tracking number are required when dispatching an exchange",
      });
    }

    /*
      Size issue requests are exchange-only.
    */
    if (
      order.returnRequest.reason === "size_issue" &&
      order.returnRequest.type !== "exchange"
    ) {
      return res.status(400).json({
        message: "Size issues can only be processed as an exchange",
      });
    }

    /*
      Do not allow a refund status for an exchange request.
    */
    if (
      requestedStatus === "refund_processed" &&
      order.returnRequest.type === "exchange"
    ) {
      return res.status(400).json({
        message: "An exchange request cannot be marked as refunded",
      });
    }

    /*
      Do not allow exchange-dispatched for a refund/return request.
    */
    if (
      requestedStatus === "exchange_dispatched" &&
      order.returnRequest.type === "return"
    ) {
      return res.status(400).json({
        message:
          "A return/refund request cannot be marked as exchange dispatched",
      });
    }

    order.returnRequest.status = requestedStatus;
    order.returnRequest.adminNote = adminNote;

    if (
      ["approved", "rejected"].includes(requestedStatus)
    ) {
      order.returnRequest.reviewedAt = new Date();
    }

    order.returnRequest.reverseCourier = {
      name:
        reverseCourierName ||
        order.returnRequest.reverseCourier?.name ||
        "",

      awbNumber:
        reverseAwbNumber ||
        order.returnRequest.reverseCourier?.awbNumber ||
        "",

      trackingUrl:
        reverseTrackingUrl ||
        order.returnRequest.reverseCourier?.trackingUrl ||
        "",
    };

    order.returnRequest.replacementCourier = {
      name:
        replacementCourierName ||
        order.returnRequest.replacementCourier?.name ||
        "",

      awbNumber:
        replacementAwbNumber ||
        order.returnRequest.replacementCourier?.awbNumber ||
        "",

      trackingUrl:
        replacementTrackingUrl ||
        order.returnRequest.replacementCourier?.trackingUrl ||
        "",
    };

    /*
      Mark online payment refunded only after the admin
      explicitly records that the refund was processed.
    */
    if (
      requestedStatus === "refund_processed" &&
      order.paymentStatus === "paid"
    ) {
      order.paymentStatus = "refunded";
    }

    await order.save({
      validateBeforeSave: false,
    });

    return res.json({
      message:
        requestedStatus === "approved"
          ? "Return/exchange request approved"
          : requestedStatus === "rejected"
          ? "Return/exchange request rejected"
          : "Return/exchange request updated successfully",

      order,
    });
  } catch (error) {
    console.error(
      "Update return/exchange request failed:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Unable to update return/exchange request",
    });
  }
}


export async function generateAdminShippingLabel(req, res) {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const shipmentId =
      order.shiprocket?.shipmentId;

    if (!shipmentId) {
      return res.status(400).json({
        message:
          "Shiprocket shipment has not been created for this order yet",
      });
    }

    const result =
      await generateShiprocketLabel({
        shipmentId,
      });

    return res.json({
      orderNumber: order.orderNumber,
      shipmentId,
      labelUrl: result.labelUrl,
    });
  } catch (error) {
    console.error(
      "Shipping label generation failed:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Unable to generate shipping label",
    });
  }
}
