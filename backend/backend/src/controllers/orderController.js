import crypto from "crypto";
import mongoose from "mongoose";

import Order from "../models/Order.js";
import Product from "../models/Product.js";
import razorpay from "../config/razorpay.js";
import { sendOrderConfirmation } from "../utils/mailer.js";

/* -------------------------- ORDER NUMBER -------------------------- */

const makeOrderNumber = () => {
  const date = new Date();

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.floor(
    1000 + Math.random() * 9000
  );

  return `GZR-${datePart}-${randomPart}`;
};

/* ------------------------ DELIVERY WINDOW ------------------------- */

const addBusinessDays = (startDate, businessDays) => {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < businessDays) {
    result.setDate(result.getDate() + 1);

    const day = result.getDay();

    // Skip Sundays
    if (day !== 0) {
      addedDays += 1;
    }
  }

  return result;
};

const calculateDeliveryWindow = () => {
  const now = new Date();

  return {
    estimatedDeliveryStart: addBusinessDays(now, 4),
    estimatedDeliveryDate: addBusinessDays(now, 7),
  };
};

/* -------------------------- ORDER ITEMS --------------------------- */

const cleanOrderItems = (items = []) =>
  items.map((item) => ({
    productId: Number(
      item.productId ?? item.id
    ),

    name: String(item.name || "").trim(),

    price: Number(item.price),

    qty: Math.max(
      1,
      Number(item.qty) || 1
    ),

    size: String(
      item.size || "Not selected"
    ).trim(),

    image:
      item.image ||
      item.img ||
      "",
  }));

const hasInvalidOrderItem = (items) =>
  items.some(
    (item) =>
      !Number.isFinite(item.productId) ||
      item.productId <= 0 ||
      !item.name ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      !Number.isFinite(item.qty) ||
      item.qty < 1
  );

/*
  If the same product and size appear more than once,
  combine them into one item.
*/
const groupOrderItems = (items) => {
  const groupedItems = new Map();

  for (const item of items) {
    const size = String(
      item.size || ""
    ).trim();

    if (
      !size ||
      size.toLowerCase() ===
        "not selected"
    ) {
      const error = new Error(
        `Please select a size for ${item.name}`
      );

      error.statusCode = 400;
      throw error;
    }

    const key = `${item.productId}-${size}`;

    if (!groupedItems.has(key)) {
      groupedItems.set(key, {
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: 0,
        size,
        image: item.image || "",
      });
    }

    const groupedItem =
      groupedItems.get(key);

    groupedItem.qty += Number(
      item.qty || 1
    );
  }

  return Array.from(
    groupedItems.values()
  );
};

/*
  Loads products from MongoDB, verifies stock,
  and uses MongoDB prices instead of trusting
  prices received from the browser.
*/
async function prepareInventoryItems(
  items,
  session = null
) {
  const groupedItems =
    groupOrderItems(items);

  const preparedItems = [];

  for (const item of groupedItems) {
    const query = Product.findOne({
      id: item.productId,
      active: true,
    });

    if (session) {
      query.session(session);
    }

    const product = await query;

    if (!product) {
      const error = new Error(
        `${item.name} is no longer available`
      );

      error.statusCode = 409;
      throw error;
    }

    const sizeInformation =
      product.sizes.find(
        (sizeItem) =>
          sizeItem.size === item.size
      );

    if (!sizeInformation) {
      const error = new Error(
        `Size ${item.size} is not available for ${product.name}`
      );

      error.statusCode = 409;
      throw error;
    }

    const availableStock = Number(
      sizeInformation.stock || 0
    );

    if (availableStock < item.qty) {
      const error = new Error(
        availableStock > 0
          ? `Only ${availableStock} item(s) are available for ${product.name}, size ${item.size}`
          : `${product.name}, size ${item.size}, is out of stock`
      );

      error.statusCode = 409;
      throw error;
    }

    preparedItems.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      qty: item.qty,
      size: item.size,
      image:
        product.images?.[0] ||
        item.image ||
        "",
    });
  }

  return preparedItems;
}

/* ------------------------ STOCK DEDUCTION ------------------------- */

async function deductStock(
  items,
  session
) {
  for (const item of items) {
    const result =
      await Product.updateOne(
        {
          id: item.productId,
          active: true,

          sizes: {
            $elemMatch: {
              size: item.size,
              stock: {
                $gte: item.qty,
              },
            },
          },
        },
        {
          $inc: {
            "sizes.$.stock":
              -item.qty,

            totalStock:
              -item.qty,
          },
        },
        {
          session,
        }
      );

    if (result.modifiedCount !== 1) {
      const error = new Error(
        `${item.name}, size ${item.size}, is no longer available in the requested quantity`
      );

      error.statusCode = 409;
      throw error;
    }
  }
}

/* ------------------------ STOCK RESTORATION ----------------------- */

async function restoreStock(
  items,
  session
) {
  const groupedItems =
    groupOrderItems(items);

  for (const item of groupedItems) {
    await Product.updateOne(
      {
        id: item.productId,
        "sizes.size": item.size,
      },
      {
        $inc: {
          "sizes.$.stock":
            item.qty,

          totalStock:
            item.qty,
        },
      },
      {
        session,
      }
    );
  }
}

/* -------------------------- CALCULATIONS -------------------------- */

const calculateAmounts = (items) => {
  const subtotal = items.reduce(
    (total, item) =>
      total +
      Number(item.price) *
        Number(item.qty),
    0
  );

  const shippingCharge =
    subtotal >= 999 ? 0 : 99;

  return {
    subtotal,
    shippingCharge,
    total:
      subtotal + shippingCharge,
  };
};

/* -------------------------- ORDER HISTORY ------------------------- */

const initialHistory = (status) => [
  {
    status,

    message:
      status === "confirmed"
        ? "Payment received and order confirmed"
        : "Your order has been placed successfully",

    changedAt: new Date(),
  },
];

/* -------------------------- EMAIL HANDLER ------------------------- */

async function sendConfirmationSafely(order) {
  try {
    await sendOrderConfirmation(order);

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          emailSent: true,
        },
        $unset: {
          emailError: "",
        },
      }
    );

    console.log(
      `Confirmation email completed for ${order.orderNumber}`
    );
  } catch (emailError) {
    console.error(
      "Order confirmation email failed:",
      emailError.message
    );

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          emailSent: false,
          emailError: emailError.message,
        },
      }
    ).catch((databaseError) => {
      console.error(
        "Unable to save email error:",
        databaseError.message
      );
    });
  }
}
/* ---------------------- CREATE RAZORPAY ORDER --------------------- */

export async function createPaymentOrder(
  req,
  res
) {
  try {
    const { items } = req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Your bag is empty",
      });
    }

    const cleanItems =
      cleanOrderItems(items);

    if (
      hasInvalidOrderItem(cleanItems)
    ) {
      return res.status(400).json({
        message:
          "One or more order items are invalid",
      });
    }

    /*
      Check stock before opening Razorpay.
      Stock is checked again after payment.
    */
    const preparedItems =
      await prepareInventoryItems(
        cleanItems
      );

    const { total } =
      calculateAmounts(preparedItems);

    const amountInPaise =
      Math.round(total * 100);

    const razorpayOrder =
      await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,

        notes: {
          userId: String(
            req.user._id
          ),
        },
      });

    return res.status(201).json({
      keyId:
        process.env
          .RAZORPAY_KEY_ID,

      razorpayOrder,
    });
  } catch (error) {
    console.error(
      "Create Razorpay order failed:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        message:
          error.message ||
          "Unable to start online payment",
      });
  }
}

/* ------------------------- VERIFY PAYMENT ------------------------- */

export async function verifyPayment(
  req,
  res
) {
  const session =
    await mongoose.startSession();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      shippingAddress = {},
      phone = "",
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message:
          "Payment details are incomplete",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Your bag is empty",
      });
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env
            .RAZORPAY_KEY_SECRET
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    const suppliedBuffer =
      Buffer.from(
        razorpay_signature
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature
      );

    const signatureIsValid =
      suppliedBuffer.length ===
        expectedBuffer.length &&
      crypto.timingSafeEqual(
        expectedBuffer,
        suppliedBuffer
      );

    if (!signatureIsValid) {
      return res.status(400).json({
        message:
          "Payment verification failed",
      });
    }

    const existingOrder =
      await Order.findOne({
        razorpayPaymentId:
          razorpay_payment_id,
      });

    if (existingOrder) {
      return res.json({
        message:
          "Payment already verified",

        order: existingOrder,
      });
    }

    const cleanItems =
      cleanOrderItems(items);

    if (
      hasInvalidOrderItem(cleanItems)
    ) {
      return res.status(400).json({
        message:
          "One or more order items are invalid",
      });
    }

    let createdOrder;

    await session.withTransaction(
      async () => {
        const preparedItems =
          await prepareInventoryItems(
            cleanItems,
            session
          );

        await deductStock(
          preparedItems,
          session
        );

        const amounts =
          calculateAmounts(
            preparedItems
          );

        const deliveryWindow =
          calculateDeliveryWindow();

        const orders =
          await Order.create(
            [
              {
                orderNumber:
                  makeOrderNumber(),

                user:
                  req.user._id,

                customerName:
                  req.user.name,

                customerEmail:
                  req.user.email,

                customerPhone:
                  phone,

                items:
                  preparedItems,

                ...amounts,

                shippingAddress,

                paymentMethod:
                  "RAZORPAY",

                paymentStatus:
                  "paid",

                razorpayOrderId:
                  razorpay_order_id,

                razorpayPaymentId:
                  razorpay_payment_id,

                razorpaySignature:
                  razorpay_signature,

                paidAt:
                  new Date(),

                status:
                  "confirmed",

                statusHistory:
                  initialHistory(
                    "confirmed"
                  ),

                ...deliveryWindow,
              },
            ],
            {
              session,
            }
          );

        createdOrder = orders[0];
      }
    );

    void sendConfirmationSafely(
      createdOrder
    );

   return res.status(201).json({
  message: `Order placed successfully. Confirmation email is being sent to ${createdOrder.customerEmail}`,

  emailStatus: "sending",

  order: createdOrder,
});
  } catch (error) {
    console.error(
      "Verify Razorpay payment failed:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        message:
          error.message ||
          "Unable to verify payment",
      });
  } finally {
    await session.endSession();
  }
}

/* -------------------------- CREATE COD ORDER ---------------------- */

export async function createOrder(
  req,
  res
) {
  const session =
    await mongoose.startSession();

  try {
    const {
      items,
      shippingAddress = {},
      paymentMethod = "COD",
      phone = "",
    } = req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Your bag is empty",
      });
    }

    const cleanItems =
      cleanOrderItems(items);

    if (
      hasInvalidOrderItem(cleanItems)
    ) {
      return res.status(400).json({
        message:
          "One or more order items are invalid",
      });
    }

    let createdOrder;

    await session.withTransaction(
      async () => {
        const preparedItems =
          await prepareInventoryItems(
            cleanItems,
            session
          );

        await deductStock(
          preparedItems,
          session
        );

        const amounts =
          calculateAmounts(
            preparedItems
          );

        const deliveryWindow =
          calculateDeliveryWindow();

        const orders =
          await Order.create(
            [
              {
                orderNumber:
                  makeOrderNumber(),

                user:
                  req.user._id,

                customerName:
                  req.user.name,

                customerEmail:
                  req.user.email,

                customerPhone:
                  phone,

                items:
                  preparedItems,

                ...amounts,

                shippingAddress,

                paymentMethod,

                paymentStatus:
                  paymentMethod ===
                  "COD"
                    ? "pending"
                    : "paid",

                status: "placed",

                statusHistory:
                  initialHistory(
                    "placed"
                  ),

                ...deliveryWindow,
              },
            ],
            {
              session,
            }
          );

        createdOrder = orders[0];
      }
    );

    void sendConfirmationSafely(
      createdOrder
    );

    return res.status(201).json({
      message:
        createdOrder.emailSent
          ? "Order placed and confirmation email has been sent"
          : "Order placed, but confirmation email could not be sent",

      order: createdOrder,
    });
  } catch (error) {
    console.error(
      "Create order failed:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        message:
          error.message ||
          "Unable to place your order",
      });
  } finally {
    await session.endSession();
  }
}

/* -------------------------- MY ORDERS ----------------------------- */

export async function myOrders(
  req,
  res
) {
  try {
    const orders =
      await Order.find({
        user: req.user._id,
      }).sort({
        createdAt: -1,
      });

    return res.json({
      orders,
    });
  } catch (error) {
    console.error(
      "Fetch orders failed:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load your orders",
    });
  }
}

/* -------------------------- CANCEL ORDER -------------------------- */

export async function cancelMyOrder(
  req,
  res
) {
  const session =
    await mongoose.startSession();

  try {
    const reason = String(
      req.body?.reason ||
        "Cancelled by customer"
    ).trim();

    let cancelledOrder;

    await session.withTransaction(
      async () => {
        const order =
          await Order.findOne({
            _id:
              req.params.orderId,

            user:
              req.user._id,
          }).session(session);

        if (!order) {
          const error =
            new Error(
              "Order not found"
            );

          error.statusCode = 404;
          throw error;
        }

        if (
          [
            "dispatched",
            "out_for_delivery",
            "delivered",
          ].includes(order.status)
        ) {
          const error =
            new Error(
              "This order can no longer be cancelled online"
            );

          error.statusCode = 400;
          throw error;
        }

        if (
          order.status === "cancelled"
        ) {
          cancelledOrder = order;
          return;
        }

        await restoreStock(
          order.items,
          session
        );

        order.status = "cancelled";

        order.cancellationReason =
          reason;

        order.cancelledAt =
          new Date();

        if (
          !Array.isArray(
            order.statusHistory
          )
        ) {
          order.statusHistory = [];
        }

        order.statusHistory.push({
          status: "cancelled",
          message: reason,
          changedAt: new Date(),
        });

        await order.save({
          session,
        });

        cancelledOrder = order;
      }
    );

    return res.json({
      message:
        cancelledOrder.status ===
        "cancelled"
          ? "Order cancelled successfully"
          : "Order is already cancelled",

      order: cancelledOrder,
    });
  } catch (error) {
    console.error(
      "Cancel order failed:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        message:
          error.message ||
          "Unable to cancel order",
      });
  } finally {
    await session.endSession();
  }
}