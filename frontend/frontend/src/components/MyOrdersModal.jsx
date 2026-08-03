import { useEffect, useState } from "react";
import {
  X,
  PackageCheck,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  Clock3,
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
            <p className={`mt-2 text-[11px] ${completed ? "text-white" : "text-muted"}`}>
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
            <h2 className="f-head text-xl font-bold">My Orders</h2>
            <p className="mt-1 text-sm text-muted">Track, review, or cancel eligible orders</p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close orders">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {loading && <p className="py-12 text-center text-muted">Loading your orders...</p>}
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</p>}
          {!loading && !error && orders.length === 0 && (
            <div className="py-14 text-center text-muted">
              <Package size={38} className="mx-auto mb-3 opacity-40" />
              <p>You have not placed any orders yet.</p>
            </div>
          )}

          {orders.map((order) => {
            const canCancel = ["placed", "confirmed", "packed"].includes(order.status);
            return (
              <article key={order._id} className="rounded-2xl border border-line bg-surface2 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="f-mono text-xs text-muted">ORDER</p>
                    <h3 className="f-head mt-1 font-bold">{order.orderNumber}</h3>
                    <p className="mt-1 text-xs text-muted">Placed on {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="f-mono text-lg font-semibold">{formatMoney(order.total ?? order.subtotal)}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-violet-300">
                      {String(order.status || "placed").replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="my-5 border-t border-line" />
                <DeliveryTimeline order={order} />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="f-mono text-xs text-muted">ESTIMATED DELIVERY</p>
                    <p className="mt-1 text-sm font-semibold text-green-300">
                      {formatDate(order.estimatedDeliveryStart || order.estimatedDeliveryDate)} – {formatDate(order.estimatedDeliveryDate)}
                    </p>
                  </div>
                  <div>
                    <p className="f-mono text-xs text-muted">PAYMENT</p>
                    <p className="mt-1 text-sm">{order.paymentMethod} · {order.paymentStatus}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {order.items?.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="flex items-center gap-3 rounded-xl border border-line p-3">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-16 w-14 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-16 w-14 items-center justify-center rounded-lg bg-black/20">
                          <Package size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="mt-1 text-xs text-muted">Size: {item.size} · Qty: {item.qty}</p>
                      </div>
                      <p className="f-mono text-sm">{formatMoney(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>

                {(order.courier?.awbNumber || canCancel) && (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {order.courier?.trackingUrl && (
                      <a
                        href={order.courier.trackingUrl}
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
                        onClick={() => cancelOrder(order._id)}
                        disabled={cancellingId === order._id}
                        className="btn-ghost rounded-full px-5 py-2 text-sm disabled:opacity-50"
                      >
                        {cancellingId === order._id ? "Cancelling..." : "Cancel order"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
