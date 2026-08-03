import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    size: { type: String, default: "Not selected" },
    image: String,
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        "placed",
        "confirmed",
        "packed",
        "dispatched",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    },
    message: { type: String, default: "" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, default: "" },
    items: {
      type: [orderItemSchema],
      validate: (value) => Array.isArray(value) && value.length > 0,
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCharge: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "packed",
        "dispatched",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    paymentMethod: { type: String, default: "COD" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    paidAt: { type: Date, default: null },
    estimatedDeliveryStart: { type: Date, required: true },
    estimatedDeliveryDate: { type: Date, required: true },
    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "India" },
      landmark: String,
      deliveryInstructions: String,
    },
    courier: {
      name: { type: String, default: "" },
      awbNumber: { type: String, default: "" },
      trackingUrl: { type: String, default: "" },
    },
    cancellation: {
      reason: { type: String, default: "" },
      cancelledAt: { type: Date, default: null },
    },
    emailSent: { type: Boolean, default: false },
    emailError: String,
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
