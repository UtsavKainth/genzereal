import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Star, Trash2 } from "lucide-react";
import { reviewApi } from "../api";

function RatingStars({ rating = 0, size = 17 }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={size}
          fill={value <= Math.round(rating) ? "currentColor" : "none"}
          className={value <= Math.round(rating) ? "text-gold" : "text-muted"}
        />
      ))}
    </div>
  );
}

function RatingSelector({ value, onChange, disabled }) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const displayedRating = hoveredRating || value;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((ratingValue) => (
          <button
            key={ratingValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange(ratingValue)}
            onMouseEnter={() => setHoveredRating(ratingValue)}
            onMouseLeave={() => setHoveredRating(0)}
            className="disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Give ${ratingValue} star${ratingValue !== 1 ? "s" : ""}`}
          >
            <Star
              size={25}
              fill={ratingValue <= displayedRating ? "currentColor" : "none"}
              className={
                ratingValue <= displayedRating
                  ? "text-gold"
                  : "text-muted hover:text-gold"
              }
            />
          </button>
        ))}
      </div>

      <span className="f-mono text-xs text-muted">
        {value ? `${value}/5` : "Select rating"}
      </span>
    </div>
  );
}

function formatReviewDate(dateValue) {
  if (!dateValue) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
}

export default function ProductReviews({ product, user }) {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentUserId = String(user?._id || user?.id || "");

  const myReview = useMemo(
    () =>
      reviews.find(
        (review) =>
          currentUserId &&
          String(review.user?._id || review.user || "") === currentUserId
      ),
    [reviews, currentUserId]
  );

  const loadReviews = useCallback(async () => {
    if (!product?.id) return;

    setLoading(true);
    setError("");

    try {
      const data = await reviewApi.get(product.id);

      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setAverageRating(Number(data.averageRating || 0));
      setReviewCount(Number(data.reviewCount || 0));
    } catch (requestError) {
      setError(requestError.message || "Unable to load customer reviews.");
    } finally {
      setLoading(false);
    }
  }, [product?.id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setSuccessMessage("");
    setError("");

    if (myReview) {
      setRating(Number(myReview.rating || 0));
      setComment(myReview.comment || "");
    } else {
      setRating(0);
      setComment("");
    }
  }, [myReview, product?.id]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!user) {
      setError("Please log in before submitting a review.");
      return;
    }

    if (!rating) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    const cleanComment = comment.trim();

    if (cleanComment.length < 3) {
      setError("Please write at least 3 characters.");
      return;
    }

    setSaving(true);

    try {
      const data = await reviewApi.save(product.id, rating, cleanComment);

      setSuccessMessage(data.message || "Your review has been saved.");
      await loadReviews();
    } catch (requestError) {
      setError(requestError.message || "Unable to save your review.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your review?"
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await reviewApi.remove(product.id);

      setRating(0);
      setComment("");
      setSuccessMessage(data.message || "Your review has been deleted.");
      await loadReviews();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete your review.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 pb-14 md:pb-20">
      <div className="border-t border-line pt-10 md:pt-14">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-12">
          <div>
            <p className="f-mono text-xs text-pink mb-2">
              CUSTOMER FEEDBACK
            </p>

            <h2 className="f-head text-2xl md:text-3xl font-bold">
              Ratings & Reviews
            </h2>

            <div className="mt-6 p-5 rounded-2xl border border-line bg-white/[0.02]">
              <div className="flex items-end gap-3">
                <span className="f-head text-5xl font-bold">
                  {reviewCount ? averageRating.toFixed(1) : "0.0"}
                </span>
                <span className="text-muted mb-1">out of 5</span>
              </div>

              <div className="mt-3">
                <RatingStars rating={averageRating} size={20} />
              </div>

              <p className="f-mono text-xs text-muted mt-3">
                Based on {reviewCount} review{reviewCount !== 1 ? "s" : ""}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 p-5 rounded-2xl border border-line bg-white/[0.02]"
            >
              <h3 className="f-head text-lg font-semibold">
                {myReview ? "Update your review" : "Write a review"}
              </h3>

              {!user && (
                <p className="text-sm text-muted mt-2">
                  Log in to rate this product and share your experience.
                </p>
              )}

              <div className="mt-5">
                <label className="block f-mono text-xs text-muted mb-2">
                  YOUR RATING
                </label>

                <RatingSelector
                  value={rating}
                  onChange={setRating}
                  disabled={!user || saving}
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor={`review-comment-${product.id}`}
                  className="block f-mono text-xs text-muted mb-2"
                >
                  YOUR REVIEW
                </label>

                <textarea
                  id={`review-comment-${product.id}`}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  disabled={!user || saving}
                  maxLength={1000}
                  rows={5}
                  placeholder="Tell other customers about the fit, fabric and quality..."
                  className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-sm outline-none resize-none focus:border-violet disabled:cursor-not-allowed disabled:opacity-50"
                />

                <div className="flex justify-between mt-2">
                  <span className="f-mono text-[10px] text-muted">
                    Minimum 3 characters
                  </span>

                  <span className="f-mono text-[10px] text-muted">
                    {comment.length}/1000
                  </span>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-sm text-pink" role="alert">
                  {error}
                </p>
              )}

              {successMessage && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gold">
                  <Check size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!user || saving}
                  className="btn-primary px-6 py-3 rounded-full flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <LoaderCircle size={16} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : myReview
                      ? "Update Review"
                      : "Submit Review"}
                </button>

                {myReview && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="px-5 py-3 rounded-full border border-line flex items-center gap-2 text-sm hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <h3 className="f-head text-xl md:text-2xl font-bold">
                Customer Reviews
              </h3>

              <span className="f-mono text-xs text-muted">
                {reviewCount} total
              </span>
            </div>

            {loading ? (
              <div className="mt-6 min-h-40 rounded-2xl border border-line flex items-center justify-center">
                <LoaderCircle className="animate-spin text-violet" size={26} />
              </div>
            ) : reviews.length === 0 ? (
              <div className="mt-6 min-h-40 rounded-2xl border border-line p-8 flex flex-col items-center justify-center text-center">
                <Star size={30} className="text-muted" />
                <h4 className="f-head text-lg font-semibold mt-4">
                  No reviews yet
                </h4>
                <p className="text-sm text-muted mt-2 max-w-sm">
                  Be the first customer to review {product.name}.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {reviews.map((review) => {
                  const isOwnReview =
                    currentUserId &&
                    String(review.user?._id || review.user || "") ===
                      currentUserId;

                  return (
                    <article
                      key={review._id}
                      className="p-5 md:p-6 rounded-2xl border border-line bg-white/[0.02]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="f-head font-semibold">
                              {review.customerName}
                            </h4>

                            {review.verifiedPurchase && (
                              <span className="f-mono text-[9px] px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                                VERIFIED PURCHASE
                              </span>
                            )}

                            {isOwnReview && (
                              <span className="f-mono text-[9px] px-2 py-1 rounded-full bg-violet/10 text-violet border border-violet/20">
                                YOUR REVIEW
                              </span>
                            )}
                          </div>

                          <div className="mt-2">
                            <RatingStars rating={review.rating} />
                          </div>
                        </div>

                        <time className="f-mono text-[10px] text-muted">
                          {formatReviewDate(review.updatedAt || review.createdAt)}
                        </time>
                      </div>

                      <p className="text-sm text-muted leading-relaxed mt-4 whitespace-pre-wrap">
                        {review.comment}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
