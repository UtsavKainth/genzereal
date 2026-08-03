import Product from "../models/Product.js";

const cleanProductBody = (body = {}) => {
  const sizes = Array.isArray(body.sizes)
    ? body.sizes.map((item) => ({
        size: String(item.size || "").trim(),
        stock: Math.max(0, Number(item.stock) || 0),
      }))
    : [];

  return {
    id: Number(body.id),
    name: String(body.name || "").trim(),
    cat: String(body.cat || "").trim(),
    price: Number(body.price),
    mrp:
      body.mrp === null ||
      body.mrp === undefined ||
      body.mrp === ""
        ? null
        : Number(body.mrp),
    tag: body.tag || null,
    rating: Number(body.rating || 0),
    g: Number(body.g || 0),
    mark: String(body.mark || "").trim(),
    images: Array.isArray(body.images)
      ? body.images
          .map((image) => String(image || "").trim())
          .filter(Boolean)
      : [],
    desc: String(body.desc || "").trim(),
    sizes,
    active: body.active !== false,
    featured: Boolean(body.featured),
    bestseller: Boolean(body.bestseller),
  };
};

const validateProduct = (product) => {
  if (!Number.isFinite(product.id)) {
    return "Product ID is required";
  }

  if (!product.name) {
    return "Product name is required";
  }

  if (!product.cat) {
    return "Category is required";
  }

  if (!Number.isFinite(product.price) || product.price < 0) {
    return "Valid product price is required";
  }

  if (!product.desc) {
    return "Product description is required";
  }

  if (
    product.mrp !== null &&
    (!Number.isFinite(product.mrp) || product.mrp < 0)
  ) {
    return "MRP must be a valid number";
  }

  return null;
};

export async function getProducts(req, res) {
  try {
    const products = await Product.find({
      active: true,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      products,
    });
  } catch (error) {
    console.error("Fetch products failed:", error);

    return res.status(500).json({
      message: "Unable to load products",
    });
  }
}

export async function getAdminProducts(req, res) {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    return res.json({
      products,
    });
  } catch (error) {
    console.error("Fetch admin products failed:", error);

    return res.status(500).json({
      message: "Unable to load products",
    });
  }
}

export async function createProduct(req, res) {
  try {
    const cleanProduct = cleanProductBody(req.body);
    const validationError = validateProduct(cleanProduct);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const existingProduct = await Product.findOne({
      id: cleanProduct.id,
    });

    if (existingProduct) {
      return res.status(409).json({
        message: "A product with this ID already exists",
      });
    }

    const product = await Product.create(cleanProduct);

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product failed:", error);

    return res.status(500).json({
      message: "Unable to create product",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

export async function updateProduct(req, res) {
  try {
    const cleanProduct = cleanProductBody(req.body);
    const validationError = validateProduct(cleanProduct);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const duplicateProduct = await Product.findOne({
      id: cleanProduct.id,
      _id: {
        $ne: product._id,
      },
    });

    if (duplicateProduct) {
      return res.status(409).json({
        message: "Another product already uses this ID",
      });
    }

    Object.assign(product, cleanProduct);

    await product.save();

    return res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product failed:", error);

    return res.status(500).json({
      message: "Unable to update product",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

export async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(
      req.params.productId
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product failed:", error);

    return res.status(500).json({
      message: "Unable to delete product",
    });
  }
}