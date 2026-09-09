import { useState } from "react";
import { X, MapPin, CreditCard, Truck } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });

const authenticatedPost = async (path, body) => {
  const token = localStorage.getItem("genzereal_token");

  if (!token) {
    throw new Error("Please log in before placing an order.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
};

export default function CheckoutModal({
  open,
  onClose,
  cart,
  user,
  onPlaceOrder,
  onPaymentSuccess,
}) {
  const [form, setForm] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    landmark: "",
    deliveryInstructions: "",
    paymentMethod: "RAZORPAY",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.qty),
    0
  );

  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;

  const addBusinessDays = (startDate, businessDays) => {
    const result = new Date(startDate);
    let added = 0;
    while (added < businessDays) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0) added += 1;
    }
    return result;
  };

  const formatDeliveryDate = (date) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);

  const deliveryStart = formatDeliveryDate(addBusinessDays(new Date(), 4));
  const deliveryEnd = formatDeliveryDate(addBusinessDays(new Date(), 7));

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const requiredFields = [
      "fullName",
      "email",
      "phone",
      "line1",
      "city",
      "state",
      "postalCode",
    ];

    const missingField = requiredFields.find(
      (field) => !String(form[field] || "").trim()
    );

    if (missingField) {
      throw new Error(
        "Please complete all required delivery details."
      );
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      throw new Error(
        "Please enter a valid 10-digit Indian mobile number."
      );
    }

    if (!/^\d{6}$/.test(form.postalCode.trim())) {
      throw new Error("Please enter a valid 6-digit PIN code.");
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error("Your bag is empty.");
    }
  };

  const getShippingAddress = () => ({
    line1: form.line1.trim(),
    line2: form.line2.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    country: "India",
    landmark: form.landmark.trim(),
    deliveryInstructions: form.deliveryInstructions.trim(),
    phone: form.phone.trim(),
  });

  const startRazorpayPayment = async () => {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      throw new Error(
        "Razorpay could not be loaded. Please check your internet connection."
      );
    }

    const paymentOrderData = await authenticatedPost(
      "/orders/payment/create",
      {
        items: cart,
        shipping,
        total,
      }
    );

    const { keyId, razorpayOrder } = paymentOrderData;

    if (!keyId || !razorpayOrder?.id) {
      throw new Error("Invalid payment order received from server.");
    }

    return new Promise((resolve, reject) => {
      const options = {
        key: keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "GenZeReal",
        description: "GenZeReal order payment",
        order_id: razorpayOrder.id,

        prefill: {
          name: form.fullName.trim(),
          email: form.email.trim(),
          contact: form.phone.trim(),
        },

        notes: {
          address: `${form.line1.trim()}, ${form.city.trim()}, ${form.state.trim()} - ${form.postalCode.trim()}`,
        },

        handler: async (paymentResponse) => {
          try {
            const verifiedData = await authenticatedPost(
              "/orders/payment/verify",
              {
                razorpay_order_id:
                  paymentResponse.razorpay_order_id,
                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,
                razorpay_signature:
                  paymentResponse.razorpay_signature,
                items: cart,
                shipping,
                total,
                shippingAddress: getShippingAddress(),
              }
            );

            if (typeof onPaymentSuccess === "function") {
              await onPaymentSuccess(verifiedData.order);
            }

            alert(
              verifiedData.message ||
                "Payment successful. Your order has been confirmed."
            );

            onClose();
            resolve(verifiedData);
          } catch (verificationError) {
            reject(verificationError);
          }
        },

        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
      };

      const razorpayCheckout = new window.Razorpay(options);

      razorpayCheckout.on("payment.failed", (response) => {
        const message =
          response?.error?.description ||
          "Payment failed. Please try again.";

        reject(new Error(message));
      });

      razorpayCheckout.open();
    });
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setError("");

    try {
      validateForm();
      setSubmitting(true);

      await startRazorpayPayment();
    } catch (orderError) {
      setError(orderError.message || "Unable to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-surface rounded-2xl border border-line"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div>
            <p className="f-head text-xl font-bold">
              Secure Checkout
            </p>

            <p className="text-sm text-muted mt-1">
              Complete your delivery and payment details
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close checkout"
            disabled={submitting}
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={submitOrder}
          className="grid lg:grid-cols-[1.4fr_0.8fr] gap-6 p-5"
        >
          <div className="space-y-6">
            <section className="border border-line rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <MapPin size={18} />

                <h2 className="f-head font-semibold">
                  Delivery Address
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={updateField}
                  placeholder="Full name *"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />

                <input
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  placeholder="Mobile number *"
                  inputMode="numeric"
                  maxLength={10}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="Email address *"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 sm:col-span-2"
                />

                <input
                  name="line1"
                  value={form.line1}
                  onChange={updateField}
                  placeholder="House / Flat / Building *"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 sm:col-span-2"
                />

                <input
                  name="line2"
                  value={form.line2}
                  onChange={updateField}
                  placeholder="Street / Area / Locality"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 sm:col-span-2"
                />

                <input
                  name="city"
                  value={form.city}
                  onChange={updateField}
                  placeholder="City *"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />

                <input
                  name="state"
                  value={form.state}
                  onChange={updateField}
                  placeholder="State *"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />

                <input
                  name="postalCode"
                  value={form.postalCode}
                  onChange={updateField}
                  placeholder="PIN code *"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />

                <input
                  name="landmark"
                  value={form.landmark}
                  onChange={updateField}
                  placeholder="Landmark"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />

                <textarea
                  name="deliveryInstructions"
                  value={form.deliveryInstructions}
                  onChange={updateField}
                  placeholder="Delivery instructions, such as call before delivery"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 sm:col-span-2 resize-none"
                />
              </div>
            </section>

            <section className="border border-line rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard size={18} />

                <h2 className="f-head font-semibold">
                  Payment Method
                </h2>
              </div>

              <label
                className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer ${
                  form.paymentMethod === "RAZORPAY"
                    ? "border-violet-500"
                    : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="RAZORPAY"
                  checked={form.paymentMethod === "RAZORPAY"}
                  onChange={updateField}
                  className="mt-1"
                />

                <div>
                  <p className="font-semibold">
                    UPI, Card and Net Banking
                  </p>

                  <p className="text-sm text-muted mt-1">
                    Pay securely through Razorpay.
                  </p>
                </div>
              </label>
            </section>
          </div>

          <aside className="border border-line rounded-2xl p-5 h-fit lg:sticky lg:top-5">
            <div className="flex items-center gap-2 mb-5">
              <Truck size={18} />

              <h2 className="f-head font-semibold">
                Order Summary
              </h2>
            </div>

            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={`${item.id}-${item.size || "default"}`}
                  className="flex justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {item.name}
                    </p>

                    <p className="text-muted">
                      Qty: {item.qty}
                      {item.size
                        ? ` · Size: ${item.size}`
                        : ""}
                    </p>
                  </div>

                  <span className="shrink-0">
                    ₹
                    {(
                      Number(item.price) * Number(item.qty)
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-green-500/25 bg-green-500/10 p-4">
              <p className="text-xs text-muted">Estimated delivery</p>
              <p className="mt-1 text-sm font-semibold text-green-300">
                {deliveryStart} – {deliveryEnd}
              </p>
              <p className="mt-1 text-xs text-muted">
                Final courier estimate will update after dispatch.
              </p>
            </div>

            <div className="border-t border-line mt-5 pt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>

                <span>
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>

                <span>
                  {shipping === 0
                    ? "Free"
                    : `₹${shipping.toLocaleString("en-IN")}`}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold pt-3 border-t border-line">
                <span>Total</span>

                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-4">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 rounded-full mt-5 disabled:opacity-60"
            >
              {submitting
                ? "Opening Payment..."
                : `Pay ₹${total.toLocaleString("en-IN")}`}
            </button>

            <p className="text-xs text-muted text-center mt-3">
              Free shipping on orders above ₹999.
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}