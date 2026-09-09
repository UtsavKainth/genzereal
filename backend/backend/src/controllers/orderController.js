import crypto from "crypto";
import mongoose from "mongoose";

import Order from "../models/Order.js";
import Product from "../models/Product.js";
import razorpay from "../config/razorpay.js";
import { sendOrderConfirmation } from "../utils/mailer.js";
import {
  createShiprocketOrder,
  getAvailableCouriers,
  chooseShiprocketCourier,
  assignShiprocketAwb,
  scheduleShiprocketPickup,
  trackShiprocketAwb,
} from "../services/shiprocketService.js";

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

/* ------------------------ SHIPROCKET HANDLER ---------------------- */

async function createShiprocketOrderSafely(order) {
  try {
    if (
      order.shiprocket?.orderId ||
      order.shiprocket?.shipmentId
    ) {
      console.log(
        `Shiprocket order already exists for ${order.orderNumber}`
      );

      return;
    }

    const result =
      await createShiprocketOrder(order);

    const shiprocketOrderId =
      result?.order_id ||
      result?.data?.order_id ||
      null;

    const shipmentId =
      result?.shipment_id ||
      result?.data?.shipment_id ||
      null;

    if (!shiprocketOrderId || !shipmentId) {
      throw new Error(
        result?.message ||
        "Shiprocket did not create the shipment"
      );
    }

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          "shiprocket.orderId":
            shiprocketOrderId,

          "shiprocket.shipmentId":
            shipmentId,

          "shiprocket.status":
            result?.status || "NEW",

          "shiprocket.createdAt":
            new Date(),

          "shiprocket.error": "",
        },
      }
    );

    console.log(
      `Shiprocket order created for ${order.orderNumber}: shipment ${shipmentId}`
    );

    const deliveryPostcode =
      String(
        order.shippingAddress?.postalCode || ""
      ).trim();

    if (!deliveryPostcode) {
      throw new Error(
        "Delivery PIN code is missing for courier selection"
      );
    }

    const totalQty =
      order.items.reduce(
        (sum, item) =>
          sum + Number(item.qty || 0),
        0
      );

    const weight = Math.max(
      0.5,
      Number(
        (totalQty * 0.5).toFixed(2)
      )
    );

    const serviceability =
      await getAvailableCouriers({
        pickupPostcode:
          process.env.SHIPROCKET_PICKUP_POSTCODE ||
          "110051",

        deliveryPostcode,

        weight,

        cod:
          String(order.paymentMethod)
            .toUpperCase() === "COD",
      });

    const selectedCourier =
      chooseShiprocketCourier(
        serviceability.couriers,
        serviceability.recommendedCourierId
      );

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          "shiprocket.courierId":
            Number(
              selectedCourier.courier_company_id
            ),

          "shiprocket.courierName":
            selectedCourier.courier_name || "",

          "shiprocket.error": "",
        },
      }
    );

    console.log(
      `Shiprocket courier selected for ${order.orderNumber}: ${selectedCourier.courier_name} (ID ${selectedCourier.courier_company_id})`
    );

    if (
      String(process.env.SHIPROCKET_AUTO_AWB)
        .toLowerCase() !== "true"
    ) {
      console.log(
        `Shiprocket AWB assignment disabled for ${order.orderNumber}`
      );
      return;
    }

    const awbResult =
      await assignShiprocketAwb({
        shipmentId,
        courierId:
          selectedCourier.courier_company_id,
      });

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          "shiprocket.awbCode":
            awbResult.awbCode,

          "shiprocket.courierName":
            awbResult.courierName ||
            selectedCourier.courier_name ||
            "",

          "courier.name":
            awbResult.courierName ||
            selectedCourier.courier_name ||
            "",

          "courier.awbNumber":
            awbResult.awbCode,

          "shiprocket.error": "",
        },
      }
    );

    console.log(
      `Shiprocket AWB assigned for ${order.orderNumber}: ${awbResult.awbCode}`
    );

    if (
      String(process.env.SHIPROCKET_AUTO_PICKUP)
        .toLowerCase() !== "true"
    ) {
      console.log(
        `Shiprocket pickup scheduling disabled for ${order.orderNumber}`
      );
      return;
    }

    const pickupResult =
      await scheduleShiprocketPickup({
        shipmentId,
      });

    const pickupResponse =
      pickupResult?.response || {};

    const pickupScheduledDate =
      pickupResponse?.pickup_scheduled_date
        ? new Date(
            pickupResponse.pickup_scheduled_date
              .replace(" ", "T") + "+05:30"
          )
        : null;

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          "shiprocket.pickupStatus":
            Number(pickupResult?.pickup_status) === 1
              ? "CONFIRMED"
              : "REQUESTED",

          "shiprocket.pickupToken":
            pickupResponse?.pickup_token_number ||
            "",

          "shiprocket.pickupScheduledDate":
            pickupScheduledDate,

          "shiprocket.pickupMessage":
            pickupResponse?.data ||
            "",

          "shiprocket.error": "",
        },
      }
    );

    console.log(
      `Shiprocket pickup confirmed for ${order.orderNumber}: ${pickupResponse?.pickup_scheduled_date || "date pending"}`
    );
  } catch (shiprocketError) {
    console.error(
      `Shiprocket processing failed for ${order.orderNumber}:`,
      shiprocketError.message
    );

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          "shiprocket.error":
            shiprocketError.message,
        },
      }
    ).catch((databaseError) => {
      console.error(
        "Unable to save Shiprocket error:",
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

    const customerPhone = String(
      phone ||
      shippingAddress?.phone ||
      ""
    ).trim();

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

    /*
      Production payment verification:
      Never trust only the browser callback.
      Fetch the payment directly from Razorpay before fulfilling the order.
    */
    const razorpayPayment =
      await razorpay.payments.fetch(
        razorpay_payment_id
      );

    if (
      String(razorpayPayment.order_id) !==
      String(razorpay_order_id)
    ) {
      return res.status(400).json({
        message: "Razorpay order mismatch",
      });
    }

    if (
      String(razorpayPayment.currency).toUpperCase() !==
      "INR"
    ) {
      return res.status(400).json({
        message: "Invalid payment currency",
      });
    }

    if (razorpayPayment.status !== "captured") {
      return res.status(400).json({
        message:
          "Payment has not been captured",
      });
    }

    const verifiedItems =
      cleanOrderItems(items);

    if (
      hasInvalidOrderItem(verifiedItems)
    ) {
      return res.status(400).json({
        message:
          "One or more order items are invalid",
      });
    }

    const verifiedPreparedItems =
      await prepareInventoryItems(
        verifiedItems
      );

    const verifiedAmounts =
      calculateAmounts(
        verifiedPreparedItems
      );

    const expectedAmountInPaise =
      Math.round(
        verifiedAmounts.total * 100
      );

    if (
      Number(razorpayPayment.amount) !==
      expectedAmountInPaise
    ) {
      return res.status(400).json({
        message: "Payment amount mismatch",
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
                  customerPhone,

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

    const isRazorpayLive = String(
      process.env.RAZORPAY_KEY_ID || ""
    ).startsWith("rzp_live_");

    if (isRazorpayLive) {
      void createShiprocketOrderSafely(
        createdOrder
      );
    } else {
      console.log(
        `Shiprocket skipped for ${createdOrder.orderNumber}: Razorpay is in TEST mode`
      );
    }

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

    void createShiprocketOrderSafely(
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

/* --------------------- RETURN / EXCHANGE REQUEST --------------------- */

export async function requestReturnExchange(req, res) {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({
        message: "Return or exchange can be requested only after delivery",
      });
    }

    const deliveredHistory = Array.isArray(order.statusHistory)
      ? [...order.statusHistory]
          .reverse()
          .find((entry) => entry.status === "delivered")
      : null;

    const deliveredAt = deliveredHistory?.changedAt;

    if (!deliveredAt) {
      return res.status(400).json({
        message: "Delivery date could not be verified",
      });
    }

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    if (Date.now() - new Date(deliveredAt).getTime() > sevenDaysMs) {
      return res.status(400).json({
        message: "The 7-day return/exchange request period has expired",
      });
    }

    const existingStatus = order.returnRequest?.status || "none";

    if (
      existingStatus !== "none" &&
      existingStatus !== "rejected"
    ) {
      return res.status(400).json({
        message: "A return or exchange request already exists for this order",
      });
    }

    const type = String(req.body?.type || "").trim().toLowerCase();
    const reason = String(req.body?.reason || "").trim().toLowerCase();
    const details = String(req.body?.details || "").trim();
    const requestedSize = String(req.body?.requestedSize || "").trim().toUpperCase();
    const productId = Number(req.body?.productId);

    if (!["exchange", "return"].includes(type)) {
      return res.status(400).json({
        message: "Please select return or exchange",
      });
    }

    if (!["size_issue", "damaged", "wrong_item"].includes(reason)) {
      return res.status(400).json({
        message: "Please select a valid reason",
      });
    }

    if (reason === "size_issue" && type !== "exchange") {
      return res.status(400).json({
        message: "Size issues are eligible for exchange only",
      });
    }

    const item = order.items.find(
      (orderItem) => Number(orderItem.productId) === productId
    );

    if (!item) {
      return res.status(400).json({
        message: "Selected product was not found in this order",
      });
    }

    if (reason === "size_issue") {
      if (!requestedSize) {
        return res.status(400).json({
          message: "Please select the required replacement size",
        });
      }

      if (
        String(item.size || "").trim().toUpperCase() === requestedSize
      ) {
        return res.status(400).json({
          message: "Please select a different size for exchange",
        });
      }

      const product = await Product.findOne({
        id: item.productId,
        active: true,
      });

      if (!product) {
        return res.status(400).json({
          message: "This product is currently unavailable for size exchange",
        });
      }

      const replacementSize = product.sizes.find(
        (sizeItem) =>
          String(sizeItem.size || "").trim().toUpperCase() === requestedSize
      );

      if (!replacementSize) {
        return res.status(400).json({
          message: "The requested replacement size is not available for this product",
        });
      }

      if (Number(replacementSize.stock || 0) <= 0) {
        return res.status(400).json({
          message: "Requested replacement size is currently out of stock",
        });
      }
    }

    order.returnRequest = {
      type,
      reason,
      itemProductId: item.productId,
      itemName: item.name,
      originalSize: item.size || "",
      requestedSize: reason === "size_issue" ? requestedSize : "",
      details,
      status: "requested",
      requestedAt: new Date(),
      reviewedAt: null,
      adminNote: "",
      reverseCourier: {
        name: "",
        awbNumber: "",
        trackingUrl: "",
      },
    };

    await order.save();

    return res.status(201).json({
      message:
        type === "exchange"
          ? "Exchange request submitted successfully"
          : "Return request submitted successfully",
      order,
    });
  } catch (error) {
    console.error("Return/exchange request failed:", error);

    return res.status(500).json({
      message: error.message || "Unable to submit return or exchange request",
    });
  }
}

/* ---------------------- SHIPROCKET TRACKING ---------------------- */

export async function trackMyOrder(req, res) {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const awbCode = String(
      order.shiprocket?.awbCode ||
      order.courier?.awbNumber ||
      ""
    ).trim();

    if (!awbCode) {
      return res.status(400).json({
        message:
          "Tracking is not available yet. AWB has not been assigned.",
      });
    }

    const tracking =
      await trackShiprocketAwb(awbCode);

    return res.json({
      orderNumber: order.orderNumber,
      awbCode,
      courier:
        order.shiprocket?.courierName ||
        order.courier?.name ||
        "",
      tracking,
    });
  } catch (error) {
    console.error(
      "Shiprocket tracking failed:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Unable to track shipment",
    });
  }
}
