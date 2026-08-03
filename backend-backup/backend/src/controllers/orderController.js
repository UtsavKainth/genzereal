import Order from "../models/Order.js";
import { sendOrderConfirmation } from "../utils/mailer.js";

const makeOrderNumber = () => {
  const date = new Date();

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `GZR-${datePart}-${randomPart}`;
};

const calculateEstimatedDeliveryDate = () => {
  const deliveryDate = new Date();

  // Estimated delivery after 6 days
  deliveryDate.setDate(deliveryDate.getDate() + 6);

  return deliveryDate;
};

export async function createOrder(req, res) {
  try {
    const {
      items,
      shippingAddress = {},
      paymentMethod = "COD",
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your bag is empty",
      });
    }

    const cleanItems = items.map((item) => ({
      productId: Number(item.productId ?? item.id),
      name: String(item.name || "").trim(),
      price: Number(item.price),
      qty: Math.max(1, Number(item.qty) || 1),
      size: String(item.size || "Not selected"),
      image: item.image || item.img || "",
    }));

    const hasInvalidItem = cleanItems.some(
      (item) =>
        !Number.isFinite(item.productId) ||
        !item.name ||
        !Number.isFinite(item.price) ||
        item.price < 0
    );

    if (hasInvalidItem) {
      return res.status(400).json({
        message: "One or more order items are invalid",
      });
    }

    const subtotal = cleanItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    const order = await Order.create({
      orderNumber: makeOrderNumber(),
      user: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      items: cleanItems,
      subtotal,
      shippingAddress,
      paymentMethod,
      estimatedDeliveryDate: calculateEstimatedDeliveryDate(),
    });

    try {
      await sendOrderConfirmation(order);

      order.emailSent = true;
      order.emailError = undefined;
    } catch (emailError) {
      console.error("Order confirmation email failed:", emailError.message);

      order.emailSent = false;
      order.emailError = emailError.message;
    }

    await order.save();

    return res.status(201).json({
      message: order.emailSent
        ? "Your T-shirt has been booked and confirmation email has been sent"
        : "Your T-shirt has been booked, but confirmation email could not be sent",
      order,
    });
  } catch (error) {
    console.error("Create order failed:", error);

    return res.status(500).json({
      message: "Unable to book your order",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

export async function myOrders(req, res) {
  try {
    const orders = await Order.find({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      orders,
    });
  } catch (error) {
    console.error("Fetch orders failed:", error);

    return res.status(500).json({
      message: "Unable to load your orders",
    });
  }
}