import Review from "../models/Review.js";
import Order from "../models/Order.js";

export async function getProductReviews(req, res) {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isFinite(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const reviews = await Review.find({ productId })
      .sort({ createdAt: -1 });

    const reviewCount = reviews.length;

    const averageRating =
      reviewCount > 0
        ? Number(
            (
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviewCount
            ).toFixed(1)
          )
        : 0;

    return res.json({
      reviews,
      reviewCount,
      averageRating,
    });
  } catch (error) {
    console.error("Fetch reviews failed:", error);

    return res.status(500).json({
      message: "Unable to load reviews",
    });
  }
}

export async function createOrUpdateReview(req, res) {
  try {
    const productId = Number(req.params.productId);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (!Number.isFinite(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    if (comment.length < 3 || comment.length > 1000) {
      return res.status(400).json({
        message: "Review must contain between 3 and 1000 characters",
      });
    }

    const purchasedOrder = await Order.findOne({
      user: req.user._id,
      "items.productId": productId,
      status: {
        $in: ["booked", "confirmed", "shipped", "delivered"],
      },
    });

    const review = await Review.findOneAndUpdate(
      {
        productId,
        user: req.user._id,
      },
      {
        productId,
        user: req.user._id,
        customerName: req.user.name,
        rating,
        comment,
        verifiedPurchase: Boolean(purchasedOrder),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(201).json({
      message: "Review saved successfully",
      review,
    });
  } catch (error) {
    console.error("Save review failed:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    return res.status(500).json({
      message: "Unable to save review",
    });
  }
}

export async function deleteMyReview(req, res) {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isFinite(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const review = await Review.findOneAndDelete({
      productId,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    return res.json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review failed:", error);

    return res.status(500).json({
      message: "Unable to delete review",
    });
  }
}
