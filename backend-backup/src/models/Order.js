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

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerEmail: {
      type: String,
      required: true,
    },

    items: {
      type: [orderItemSchema],
      validate: (value) => Array.isArray(value) && value.length > 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "booked",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "booked",
    },

    paymentMethod: {
      type: String,
      default: "COD",
    },

    estimatedDeliveryDate: {
      type: Date,
      required: true,
    },

    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: "India",
      },
    },

    emailSent: {
      type: Boolean,
      default: false,
    },

    emailError: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Order", orderSchema);