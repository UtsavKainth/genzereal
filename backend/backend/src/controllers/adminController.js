import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { sendOrderStatusUpdate } from "../utils/mailer.js";

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