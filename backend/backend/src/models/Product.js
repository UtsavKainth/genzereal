import mongoose from "mongoose";

const sizeStockSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const productSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    cat: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    mrp: {
      type: Number,
      default: null,
      min: 0,
    },

    tag: {
      type: String,
      enum: ["SALE", "NEW", "BESTSELLER", null],
      default: null,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    g: {
      type: Number,
      default: 0,
    },

    mark: {
      type: String,
      default: "",
      trim: true,
      maxlength: 10,
    },

    images: {
      type: [String],
      default: [],
    },

    desc: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    sizes: {
      type: [sizeStockSchema],
      default: [
        { size: "S", stock: 10 },
        { size: "M", stock: 10 },
        { size: "L", stock: 10 },
        { size: "XL", stock: 10 },
      ],
    },

    totalStock: {
      type: Number,
      default: 40,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    bestseller: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre("save", function updateTotalStock(next) {
  if (Array.isArray(this.sizes)) {
    this.totalStock = this.sizes.reduce(
      (sum, item) => sum + Number(item.stock || 0),
      0
    );
  }

  next();
});

export default mongoose.model("Product", productSchema);