import { useEffect, useState } from "react";
import {
  X,
  PackageCheck,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  Clock3,
  RotateCcw,
} from "lucide-react";
import { orderApi } from "../api";

const STEPS = [
  { key: "placed", label: "Order placed", icon: Clock3 },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "packed", label: "Packed", icon: Package },
  { key: "dispatched", label: "Dispatched", icon: Truck },
  { key: "out_for_delivery", label: "Out for delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

function getDeliveredAt(order) {
  if (!Array.isArray(order.statusHistory)) return null;

  const delivered = [...order.statusHistory]
    .reverse()
    .find((entry) => entry.status === "delivered");

  return delivered?.changedAt || null;
}

function isWithinReturnWindow(order) {
  if (order.status !== "delivered") return false;

  const deliveredAt = getDeliveredAt(order);
  if (!deliveredAt) return false;

  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return Date.now() - new Date(deliveredAt).getTime() <= sevenDays;
}

function returnStatusLabel(status) {
  const labels = {
    requested: "Request submitted",
    approved: "Approved",
    rejected: "Rejected",
    pickup_scheduled: "Return pickup scheduled",
    picked_up: "Picked up",
    received: "Received by GenZeReal",
    exchange_dispatched: "Exchange dispatched",
    refund_processed: "Refund processed",
    completed: "Completed",
  };

  return labels[status] || status;
}

function DeliveryTimeline({ order }) {
  if (order.status === "cancelled") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        This order was cancelled
        {order.cancellation?.reason ? `: ${order.cancellation.reason}` : "."}
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((step) => step.key === order.status);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const completed = index <= activeIndex;

        return (
          <div key={step.key} className="text-center">
            <div
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border ${
                completed
                  ? "border-violet-400 bg-violet-500/20 text-violet-200"
                  : "border-line bg-surface2 text-muted"
              }`}
            >
              <Icon size={16} />
            </div>

            <p
              className={`mt-2 text-[11px] ${
                completed ? "text-white" : "text-muted"
              }`}
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function MyOrdersModal({ open, onClose, notify }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState("");

  const [trackingId, setTrackingId] = useState("");
  const [trackingData, setTrackingData] = useState({});

  const [returnOrderId, setReturnOrderId] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const [returnForm, setReturnForm] = useState({
    productId: "",
    reason: "",
    type: "exchange",
    requestedSize: "",
    details: "",
  });

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await orderApi.mine();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || "Unable to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadOrders();
  }, [open]);

  if (!open) return null;

  const trackOrder = async (orderId) => {
    setTrackingId(orderId);

    try {
      const data = await orderApi.track(orderId);

      setTrackingData((current) => ({
        ...current,
        [orderId]: data,
      }));
    } catch (err) {
      const message =
        err.message ||
        "Tracking is not available yet.";

      setTrackingData((current) => ({
        ...current,
        [orderId]: {
          error: message,
        },
      }));

      notify?.(message);
    } finally {
      setTrackingId("");
    }
  };

  const cancelOrder = async (orderId) => {
    const reason = window.prompt(
      "Please enter a short reason for cancellation:",
      "Changed my mind"
    );

    if (reason === null) return;

    setCancellingId(orderId);

    try {
      const data = await orderApi.cancel(orderId, reason);

      setOrders((current) =>
        current.map((order) =>
          order._id === orderId ? data.order : order
        )
      );

      notify?.(data.message || "Order cancelled");
    } catch (err) {
      notify?.(err.message || "Unable to cancel order");
    } finally {
      setCancellingId("");
    }
  };

  const openReturnForm = (order) => {
    setReturnOrderId(order._id);

    setReturnForm({
      productId: order.items?.[0]?.productId
        ? String(order.items[0].productId)
        : "",
      reason: "",
      type: "exchange",
      requestedSize: "",
      details: "",
    });
  };

  const closeReturnForm = () => {
    setReturnOrderId("");
    setReturnForm({
      productId: "",
      reason: "",
      type: "exchange",
      requestedSize: "",
      details: "",
    });
  };

  const submitReturnRequest = async (order) => {
    if (!returnForm.productId) {
      notify?.("Please select a product");
      return;
    }

    if (!returnForm.reason) {
      notify?.("Please select a reason");
      return;
    }

    if (
      returnForm.reason === "size_issue" &&
      !returnForm.requestedSize
    ) {
      notify?.("Please select your required size");
      return;
    }

    const requestType =
      returnForm.reason === "size_issue"
        ? "exchange"
        : returnForm.type;

    setReturnSubmitting(true);

    try {
      const data = await orderApi.requestReturnExchange(
        order._id,
        {
          productId: Number(returnForm.productId),
          reason: returnForm.reason,
          type: requestType,
          requestedSize:
            returnForm.reason === "size_issue"
              ? returnForm.requestedSize
              : "",
          details: returnForm.details,
        }
      );

      setOrders((current) =>
        current.map((currentOrder) =>
          currentOrder._id === order._id
            ? data.order
            : currentOrder
        )
      );

      closeReturnForm();

      notify?.(
        data.message ||
          "Return/exchange request submitted successfully"
      );
    } catch (err) {
      notify?.(
        err.message ||
          "Unable to submit return/exchange request"
      );
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-line bg-surface"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface p-5">
          <div>
            <h2 className="f-head text-xl font-bold">
              My Orders
            </h2>

            <p className="mt-1 text-sm text-muted">
              Track, review, cancel or request an exchange
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close orders"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {loading && (
            <p className="py-12 text-center text-muted">
              Loading your orders...
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {error}
            </p>
          )}

          {!loading &&
            !error &&
            orders.length === 0 && (
              <div className="py-14 text-center text-muted">
                <Package
                  size={38}
                  className="mx-auto mb-3 opacity-40"
                />
                <p>
                  You have not placed any orders yet.
                </p>
              </div>
            )}

          {orders.map((order) => {
            const canCancel = [
              "placed",
              "confirmed",
              "packed",
            ].includes(order.status);

            const eligibleForReturn =
              isWithinReturnWindow(order);

            const returnStatus =
              order.returnRequest?.status || "none";

            const activeReturnRequest =
              returnStatus !== "none" &&
              returnStatus !== "rejected";

            const formOpen =
              returnOrderId === order._id;

            return (
              <article
                key={order._id}
                className="rounded-2xl border border-line bg-surface2 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="f-mono text-xs text-muted">
                      ORDER
                    </p>

                    <h3 className="f-head mt-1 font-bold">
                      {order.orderNumber}
                    </h3>

                    <p className="mt-1 text-xs text-muted">
                      Placed on{" "}
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="f-mono text-lg font-semibold">
                      {formatMoney(
                        order.total ?? order.subtotal
                      )}
                    </p>

                    <p className="mt-1 text-xs uppercase tracking-wide text-violet-300">
                      {String(
                        order.status || "placed"
                      ).replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="my-5 border-t border-line" />

                <DeliveryTimeline order={order} />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="f-mono text-xs text-muted">
                      ESTIMATED DELIVERY
                    </p>

                    <p className="mt-1 text-sm font-semibold text-green-300">
                      {formatDate(
                        order.estimatedDeliveryStart ||
                          order.estimatedDeliveryDate
                      )}{" "}
                      –{" "}
                      {formatDate(
                        order.estimatedDeliveryDate
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="f-mono text-xs text-muted">
                      PAYMENT
                    </p>

                    <p className="mt-1 text-sm">
                      {order.paymentMethod} ·{" "}
                      {order.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {order.items?.map((item, index) => (
                    <div
                      key={`${item.productId}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-line p-3"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-14 items-center justify-center rounded-lg bg-black/20">
                          <Package size={18} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {item.name}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          Size: {item.size} · Qty:{" "}
                          {item.qty}
                        </p>
                      </div>

                      <p className="f-mono text-sm">
                        {formatMoney(
                          item.price * item.qty
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {activeReturnRequest && (
                  <div className="mt-5 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <RotateCcw
                        size={17}
                        className="text-violet-300"
                      />

                      <p className="font-semibold">
                        Return / Exchange
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-violet-200">
                      {returnStatusLabel(returnStatus)}
                    </p>

                    <div className="mt-2 space-y-1 text-xs text-muted">
                      <p>
                        Product:{" "}
                        {order.returnRequest?.itemName ||
                          "—"}
                      </p>

                      <p>
                        Reason:{" "}
                        {String(
                          order.returnRequest?.reason ||
                            ""
                        ).replaceAll("_", " ")}
                      </p>

                      {order.returnRequest
                        ?.requestedSize && (
                        <p>
                          Requested size:{" "}
                          {
                            order.returnRequest
                              .requestedSize
                          }
                        </p>
                      )}

                      {order.returnRequest
                        ?.adminNote && (
                        <p>
                          GenZeReal note:{" "}
                          {
                            order.returnRequest
                              .adminNote
                          }
                        </p>
                      )}

                      {order.returnRequest?.reverseCourier?.name && (
                        <p>
                          Pickup courier:{" "}
                          {order.returnRequest.reverseCourier.name}
                        </p>
                      )}

                      {order.returnRequest?.reverseCourier?.awbNumber && (
                        <p>
                          Return AWB:{" "}
                          {order.returnRequest.reverseCourier.awbNumber}
                        </p>
                      )}

                      {order.returnRequest?.reverseCourier?.trackingUrl && (
                        <p className="pt-1">
                          <a
                            href={order.returnRequest.reverseCourier.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-violet-300 underline underline-offset-4"
                          >
                            Track Return
                          </a>
                        </p>
                      )}

                      {order.returnRequest?.replacementCourier?.name && (
                        <p className="pt-2 text-violet-200">
                          Replacement courier:{" "}
                          {order.returnRequest.replacementCourier.name}
                        </p>
                      )}

                      {order.returnRequest?.replacementCourier?.awbNumber && (
                        <p className="text-violet-200">
                          Replacement AWB:{" "}
                          {order.returnRequest.replacementCourier.awbNumber}
                        </p>
                      )}

                      {order.returnRequest?.replacementCourier?.trackingUrl && (
                        <p className="pt-1">
                          <a
                            href={order.returnRequest.replacementCourier.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-violet-300 underline underline-offset-4"
                          >
                            Track Replacement
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {returnStatus === "rejected" && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="font-semibold text-red-200">
                      Return / exchange request rejected
                    </p>

                    {order.returnRequest?.adminNote && (
                      <p className="mt-2 text-sm text-red-200/80">
                        {order.returnRequest.adminNote}
                      </p>
                    )}
                  </div>
                )}

                {formOpen && (
                  <div className="mt-5 rounded-2xl border border-violet-500/30 bg-black/20 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="f-head font-bold">
                          Request Return / Exchange
                        </h4>

                        <p className="mt-1 text-xs text-muted">
                          Requests can be submitted
                          within 7 days of delivery.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeReturnForm}
                        className="icon-btn"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="mb-2 block text-xs text-muted">
                          SELECT PRODUCT
                        </label>

                        <select
                          value={
                            returnForm.productId
                          }
                          onChange={(e) =>
                            setReturnForm((current) => ({
                              ...current,
                              productId:
                                e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm"
                        >
                          {order.items?.map(
                            (item, index) => (
                              <option
                                key={`${item.productId}-${index}`}
                                value={item.productId}
                              >
                                {item.name} — Size{" "}
                                {item.size}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs text-muted">
                          REASON
                        </label>

                        <select
                          value={returnForm.reason}
                          onChange={(e) => {
                            const reason =
                              e.target.value;

                            setReturnForm(
                              (current) => ({
                                ...current,
                                reason,
                                type:
                                  reason ===
                                  "size_issue"
                                    ? "exchange"
                                    : current.type,
                                requestedSize: "",
                              })
                            );
                          }}
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm"
                        >
                          <option value="">
                            Select reason
                          </option>

                          <option value="size_issue">
                            Size issue
                          </option>

                          <option value="damaged">
                            Damaged / defective product
                          </option>

                          <option value="wrong_item">
                            Wrong product received
                          </option>
                        </select>
                      </div>

                      {returnForm.reason &&
                        returnForm.reason !==
                          "size_issue" && (
                          <div>
                            <label className="mb-2 block text-xs text-muted">
                              WHAT DO YOU WANT?
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setReturnForm(
                                    (current) => ({
                                      ...current,
                                      type: "exchange",
                                    })
                                  )
                                }
                                className={`rounded-xl border px-4 py-3 text-sm ${
                                  returnForm.type ===
                                  "exchange"
                                    ? "border-violet-400 bg-violet-500/20"
                                    : "border-line"
                                }`}
                              >
                                Replacement
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setReturnForm(
                                    (current) => ({
                                      ...current,
                                      type: "return",
                                    })
                                  )
                                }
                                className={`rounded-xl border px-4 py-3 text-sm ${
                                  returnForm.type ===
                                  "return"
                                    ? "border-violet-400 bg-violet-500/20"
                                    : "border-line"
                                }`}
                              >
                                Return / Refund
                              </button>
                            </div>
                          </div>
                        )}

                      {returnForm.reason ===
                        "size_issue" && (
                        <div>
                          <label className="mb-2 block text-xs text-muted">
                            REQUIRED SIZE
                          </label>

                          <select
                            value={
                              returnForm.requestedSize
                            }
                            onChange={(e) =>
                              setReturnForm(
                                (current) => ({
                                  ...current,
                                  requestedSize:
                                    e.target.value,
                                })
                              )
                            }
                            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm"
                          >
                            <option value="">
                              Select new size
                            </option>

                            {SIZE_OPTIONS.map(
                              (size) => (
                                <option
                                  key={size}
                                  value={size}
                                >
                                  {size}
                                </option>
                              )
                            )}
                          </select>

                          <p className="mt-2 text-xs text-muted">
                            Size issues are eligible for
                            exchange only and are subject
                            to stock availability.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="mb-2 block text-xs text-muted">
                          DETAILS
                        </label>

                        <textarea
                          value={returnForm.details}
                          onChange={(e) =>
                            setReturnForm((current) => ({
                              ...current,
                              details: e.target.value,
                            }))
                          }
                          rows={3}
                          maxLength={500}
                          placeholder="Tell us briefly about the issue..."
                          className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            submitReturnRequest(
                              order
                            )
                          }
                          disabled={
                            returnSubmitting
                          }
                          className="btn-primary rounded-full px-6 py-2.5 text-sm disabled:opacity-50"
                        >
                          {returnSubmitting
                            ? "Submitting..."
                            : "Submit request"}
                        </button>

                        <button
                          type="button"
                          onClick={closeReturnForm}
                          className="btn-ghost rounded-full px-6 py-2.5 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => trackOrder(order._id)}
                    disabled={trackingId === order._id}
                    className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-50"
                  >
                    {trackingId === order._id
                      ? "Checking..."
                      : "Track Order"}
                  </button>

                  {order.courier?.trackingUrl && (
                    <a
                      href={
                        order.courier.trackingUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary rounded-full px-5 py-2 text-sm"
                    >
                      Track shipment
                    </a>
                  )}

                  {canCancel && (
                    <button
                      type="button"
                      onClick={() =>
                        cancelOrder(order._id)
                      }
                      disabled={
                        cancellingId === order._id
                      }
                      className="btn-ghost rounded-full px-5 py-2 text-sm disabled:opacity-50"
                    >
                      {cancellingId === order._id
                        ? "Cancelling..."
                        : "Cancel order"}
                    </button>
                  )}

                  {eligibleForReturn &&
                    !activeReturnRequest &&
                    !formOpen && (
                      <button
                        type="button"
                        onClick={() =>
                          openReturnForm(order)
                        }
                        className="btn-ghost flex items-center gap-2 rounded-full px-5 py-2 text-sm"
                      >
                        <RotateCcw size={15} />
                        Request Return / Exchange
                      </button>
                    )}
                </div>

                {trackingData[order._id] &&
                  (() => {
                    const result =
                      trackingData[order._id];

                    if (result?.error) {
                      return (
                        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                          <p className="text-xs uppercase tracking-wider text-red-300">
                            Tracking information
                          </p>

                          <p className="mt-2 text-sm text-white/70">
                            {result.error}
                          </p>
                        </div>
                      );
                    }

                    const tracking =
                      result?.tracking?.tracking_data;

                    const shipment =
                      tracking?.shipment_track?.[0];

                    const activities =
                      tracking?.shipment_track_activities || [];

                    return (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-wider text-violet-300">
                          Live Shipment Tracking
                        </p>

                        <div className="mt-3 space-y-1 text-sm text-white/80">
                          <p>
                            Courier:{" "}
                            {shipment?.courier_name ||
                              result?.courier ||
                              "Updating"}
                          </p>

                          <p>
                            AWB:{" "}
                            {shipment?.awb_code ||
                              result?.awbCode ||
                              "Updating"}
                          </p>

                          <p>
                            Current Status:{" "}
                            <span className="font-semibold text-emerald-300">
                              {shipment?.current_status ||
                                "Updating"}
                            </span>
                          </p>

                          {shipment?.edd && (
                            <p>
                              Estimated Delivery:{" "}
                              {shipment.edd}
                            </p>
                          )}

                          {tracking?.track_url && (
                            <p className="pt-2">
                              <a
                                href={tracking.track_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-violet-300 underline underline-offset-4"
                              >
                                Open Shiprocket Tracking
                              </a>
                            </p>
                          )}
                        </div>

                        {activities.length > 0 && (
                          <div className="mt-5 border-t border-white/10 pt-4">
                            <p className="mb-3 text-xs uppercase tracking-wider text-white/50">
                              Tracking History
                            </p>

                            <div className="space-y-4">
                              {activities.map(
                                (activity, index) => (
                                  <div
                                    key={`${activity.date}-${index}`}
                                    className="border-l-2 border-violet-400/40 pl-4"
                                  >
                                    <p className="text-sm font-medium text-white">
                                      {activity["sr-status-label"] &&
                                      activity["sr-status-label"] !== "NA"
                                        ? activity["sr-status-label"]
                                        : activity.activity}
                                    </p>

                                    <p className="mt-1 text-xs text-white/60">
                                      {activity.activity}
                                    </p>

                                    <p className="mt-1 text-xs text-white/40">
                                      {activity.location || "Location updating"}
                                      {activity.date
                                        ? ` · ${activity.date}`
                                        : ""}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                {order.status === "delivered" &&
                  !eligibleForReturn &&
                  returnStatus === "none" && (
                    <p className="mt-4 text-xs text-muted">
                      The 7-day return/exchange
                      request period has ended.
                    </p>
                  )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
