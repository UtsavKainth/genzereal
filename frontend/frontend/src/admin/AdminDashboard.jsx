import { useEffect, useMemo, useState } from "react";
import {
  X,
  LayoutDashboard,
  Package,
  Users,
  IndianRupee,
  RefreshCw,
  Search,
  Truck,
  ChevronRight,
} from "lucide-react";
import { adminApi } from "../api";
import ProductManager from "./ProductManager";

const ORDER_STATUSES = [
  { value: "booked", label: "Order Placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getOrderTotal = (order) =>
  Number(order.total ?? order.subtotal ?? 0);

const getStatusLabel = (status) =>
  ORDER_STATUSES.find((item) => item.value === status)?.label ||
  status ||
  "Unknown";

export default function AdminDashboard({ open, onClose }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  });

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [returnSaving, setReturnSaving] = useState(false);
  const [returnForm, setReturnForm] = useState({
    status: "",
    adminNote: "",
    courierName: "",
    trackingNumber: "",
    trackingUrl: "",
    replacementCourierName: "",
    replacementAwbNumber: "",
    replacementTrackingUrl: "",
  });

  const [editForm, setEditForm] = useState({
    status: "booked",
    courierName: "",
    trackingNumber: "",
    trackingUrl: "",
  });

  const loadAdminData = async () => {
    setLoading(true);
    setError("");

    try {
      const [dashboardData, ordersData] = await Promise.all([
        adminApi.dashboard(),
        adminApi.orders(),
      ]);

      setStats(dashboardData.stats || {});
      setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    loadAdminData();
  }, [open]);

  useEffect(() => {
    if (!selectedOrder) return;

    setEditForm({
      status: selectedOrder.status || "booked",
      courierName: selectedOrder.courierName || "",
      trackingNumber:
        selectedOrder.trackingNumber ||
        selectedOrder.awbNumber ||
        "",
      trackingUrl: selectedOrder.trackingUrl || "",
    });
  }, [selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) return;

    const request = selectedOrder.returnRequest;

    setReturnForm({
      status: request?.status || "",
      adminNote: request?.adminNote || "",
      courierName: request?.reverseCourier?.name || "",
      trackingNumber: request?.reverseCourier?.awbNumber || "",
      trackingUrl: request?.reverseCourier?.trackingUrl || "",
      replacementCourierName:
        request?.replacementCourier?.name || "",
      replacementAwbNumber:
        request?.replacementCourier?.awbNumber || "",
      replacementTrackingUrl:
        request?.replacementCourier?.trackingUrl || "",
    });
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const searchableText = [
        order.orderNumber,
        order.customerName,
        order.customerEmail,
        order.shippingAddress?.city,
        order.shippingAddress?.postalCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const updateOrder = async () => {
    if (!selectedOrder?._id) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const data = await adminApi.updateOrder(
        selectedOrder._id,
        editForm
      );

      setMessage(data.message || "Order updated successfully.");
      setSelectedOrder(data.order);

      setOrders((previous) =>
        previous.map((order) =>
          order._id === data.order._id ? data.order : order
        )
      );

      const dashboardData = await adminApi.dashboard();
      setStats(dashboardData.stats || {});
    } catch (requestError) {
      setError(requestError.message || "Unable to update order.");
    } finally {
      setSaving(false);
    }
  };

  const updateReturnRequest = async (statusOverride) => {
    if (!selectedOrder?._id) return;

    const status = statusOverride || returnForm.status;

    if (!status) {
      setError("Please select a return/exchange status.");
      return;
    }

    setReturnSaving(true);
    setError("");
    setMessage("");

    try {
      const data = await adminApi.updateReturnRequest(
        selectedOrder._id,
        {
          ...returnForm,
          status,
        }
      );

      setMessage(
        data.message ||
          "Return/exchange request updated successfully."
      );

      setSelectedOrder(data.order);

      setOrders((previous) =>
        previous.map((order) =>
          order._id === data.order._id ? data.order : order
        )
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to update return/exchange request."
      );
    } finally {
      setReturnSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: "#0a0a0d" }}
    >
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="h-16 px-5 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard size={21} />
            <div>
              <h1 className="f-head text-lg font-bold">
                GenZeReal Admin
              </h1>
              <p className="f-mono text-[10px] text-muted">
                Orders and business dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAdminData}
              disabled={loading}
              className="icon-btn"
              aria-label="Refresh dashboard"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="icon-btn"
              aria-label="Close admin dashboard"
            >
              <X size={21} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 md:px-8 py-8">
        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Package size={20} />}
            label="Total Orders"
            value={stats.totalOrders || 0}
          />

          <StatCard
            icon={<Truck size={20} />}
            label="Pending Orders"
            value={stats.pendingOrders || 0}
          />

          <StatCard
            icon={<Users size={20} />}
            label="Customers"
            value={stats.totalCustomers || 0}
          />

          <StatCard
            icon={<IndianRupee size={20} />}
            label="Revenue"
            value={formatMoney(stats.totalRevenue)}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="p-5 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="f-head text-xl font-bold">
                Customer Orders
              </h2>
              <p className="text-sm text-muted mt-1">
                View and update every order placed on your store.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search order or customer"
                  className="w-full sm:w-64 rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none"
              >
                <option value="all">All Statuses</option>

                {ORDER_STATUSES.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="min-h-64 flex items-center justify-center">
              <RefreshCw
                size={28}
                className="animate-spin text-violet-500"
              />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="min-h-64 flex flex-col items-center justify-center text-center p-8">
              <Package size={34} className="text-muted" />
              <h3 className="f-head text-lg font-semibold mt-4">
                No orders found
              </h3>
              <p className="text-sm text-muted mt-2">
                New customer orders will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredOrders.map((order) => (
                <button
                  type="button"
                  key={order._id}
                  onClick={() => {
                    setMessage("");
                    setError("");
                    setSelectedOrder(order);
                  }}
                  className="w-full p-5 text-left hover:bg-white/[0.035] transition-colors"
                >
                  <div className="grid md:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto] gap-4 items-center">
                    <div>
                      <p className="f-head font-semibold">
                        {order.orderNumber}
                      </p>
                      <p className="f-mono text-[10px] text-muted mt-1">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {order.customerEmail}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        {formatMoney(getOrderTotal(order))}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {order.paymentMethod || "COD"}
                      </p>
                    </div>

                    <div>
                      <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <ChevronRight size={18} className="text-muted" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
         <div className="mt-8">
          <ProductManager />
        </div>
      </main>

      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          form={editForm}
          setForm={setEditForm}
          saving={saving}
          message={message}
          error={error}
          onSave={updateOrder}
          returnForm={returnForm}
          setReturnForm={setReturnForm}
          returnSaving={returnSaving}
          onReturnUpdate={updateReturnRequest}
          onClose={() => {
            setSelectedOrder(null);
            setMessage("");
            setError("");
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <span className="text-violet-400">{icon}</span>
        <span className="f-mono text-[10px] text-muted uppercase">
          Live
        </span>
      </div>

      <p className="f-head text-2xl font-bold mt-5">{value}</p>
      <p className="text-sm text-muted mt-1">{label}</p>
    </div>
  );
}

function OrderDetails({
  order,
  form,
  setForm,
  saving,
  message,
  error,
  onSave,
  returnForm,
  setReturnForm,
  returnSaving,
  onReturnUpdate,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex justify-end bg-black/70"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-2xl h-full overflow-y-auto border-l border-white/10 bg-[#111116]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#111116]/95 backdrop-blur border-b border-white/10 p-5 flex items-center justify-between">
          <div>
            <p className="f-head text-xl font-bold">
              {order.orderNumber}
            </p>
            <p className="text-xs text-muted mt-1">
              Placed {formatDate(order.createdAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <InfoSection title="Customer">
            <InfoRow label="Name" value={order.customerName} />
            <InfoRow label="Email" value={order.customerEmail} />
            <InfoRow
              label="Phone"
              value={
                order.phone ||
                order.shippingAddress?.phone ||
                "Not provided"
              }
            />
          </InfoSection>

          <InfoSection title="Delivery Address">
            <p className="text-sm leading-relaxed text-white/80">
              {[
                order.shippingAddress?.line1,
                order.shippingAddress?.line2,
                order.shippingAddress?.city,
                order.shippingAddress?.state,
                order.shippingAddress?.postalCode,
                order.shippingAddress?.country,
              ]
                .filter(Boolean)
                .join(", ") || "Address not provided"}
            </p>
          </InfoSection>

          <InfoSection title="Products">
            <div className="space-y-3">
              {(order.items || []).map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex justify-between gap-4 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted mt-1">
                      Qty: {item.qty} · Size: {item.size}
                    </p>
                  </div>

                  <span>
                    {formatMoney(
                      Number(item.price) * Number(item.qty)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </InfoSection>

          <InfoSection title="Payment">
            <InfoRow
              label="Method"
              value={order.paymentMethod || "COD"}
            />
            <InfoRow
              label="Status"
              value={order.paymentStatus || "pending"}
            />
            <InfoRow
              label="Total"
              value={formatMoney(getOrderTotal(order))}
            />
          </InfoSection>


          {order.returnRequest &&
            order.returnRequest.status &&
            order.returnRequest.status !== "none" && (
              <InfoSection title="Return / Exchange Request">
                <div className="space-y-5">

                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                    <InfoRow
                      label="Request Type"
                      value={
                        order.returnRequest.type === "exchange"
                          ? "Exchange"
                          : "Return / Refund"
                      }
                    />

                    <InfoRow
                      label="Reason"
                      value={
                        order.returnRequest.reason === "size_issue"
                          ? "Size Issue"
                          : order.returnRequest.reason === "damaged"
                          ? "Damaged / Defective"
                          : order.returnRequest.reason === "wrong_item"
                          ? "Wrong Item"
                          : order.returnRequest.reason || "Not provided"
                      }
                    />

                    <InfoRow
                      label="Product"
                      value={order.returnRequest.itemName || "Not available"}
                    />

                    <InfoRow
                      label="Original Size"
                      value={order.returnRequest.originalSize || "Not applicable"}
                    />

                    {order.returnRequest.requestedSize && (
                      <InfoRow
                        label="Requested Size"
                        value={order.returnRequest.requestedSize}
                      />
                    )}

                    <InfoRow
                      label="Requested On"
                      value={formatDate(order.returnRequest.requestedAt)}
                    />

                    <InfoRow
                      label="Current Status"
                      value={
                        String(order.returnRequest.status || "")
                          .replaceAll("_", " ")
                          .replace(/w/g, (letter) =>
                            letter.toUpperCase()
                          )
                      }
                    />

                    {order.returnRequest.details && (
                      <div>
                        <p className="text-xs text-muted mb-1">
                          Customer Details
                        </p>
                        <p className="text-sm text-white/80 leading-relaxed">
                          {order.returnRequest.details}
                        </p>
                      </div>
                    )}
                  </div>

                  <label className="block">
                    <span className="block text-xs text-muted mb-2">
                      Admin Note
                    </span>

                    <textarea
                      rows={3}
                      value={returnForm.adminNote}
                      onChange={(event) =>
                        setReturnForm((previous) => ({
                          ...previous,
                          adminNote: event.target.value,
                        }))
                      }
                      placeholder="Add note for this return/exchange request..."
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none resize-none"
                    />
                  </label>

                  {order.returnRequest.status === "requested" && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={returnSaving}
                        onClick={() => onReturnUpdate("approved")}
                        className="rounded-full bg-green-500/15 border border-green-500/30 text-green-300 py-3 text-sm font-medium disabled:opacity-50"
                      >
                        {returnSaving ? "Saving..." : "Approve Request"}
                      </button>

                      <button
                        type="button"
                        disabled={returnSaving}
                        onClick={() => onReturnUpdate("rejected")}
                        className="rounded-full bg-red-500/15 border border-red-500/30 text-red-300 py-3 text-sm font-medium disabled:opacity-50"
                      >
                        Reject Request
                      </button>
                    </div>
                  )}

                  {order.returnRequest.status !== "requested" &&
                    order.returnRequest.status !== "rejected" &&
                    order.returnRequest.status !== "completed" && (
                      <>
                        <label className="block">
                          <span className="block text-xs text-muted mb-2">
                            Return / Exchange Progress
                          </span>

                          <select
                            value={returnForm.status}
                            onChange={(event) =>
                              setReturnForm((previous) => ({
                                ...previous,
                                status: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
                          >
                            <option value="approved">Approved</option>
                            <option value="pickup_scheduled">
                              Pickup Scheduled
                            </option>
                            <option value="picked_up">Picked Up</option>
                            <option value="received">
                              Received / Inspection
                            </option>

                            {order.returnRequest.type === "exchange" ? (
                              <option value="exchange_dispatched">
                                Exchange Dispatched
                              </option>
                            ) : (
                              <option value="refund_processed">
                                Refund Processed
                              </option>
                            )}

                            <option value="completed">Completed</option>
                          </select>
                        </label>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <AdminInput
                            label="Reverse Courier"
                            value={returnForm.courierName}
                            placeholder="Example: Delhivery"
                            onChange={(value) =>
                              setReturnForm((previous) => ({
                                ...previous,
                                courierName: value,
                              }))
                            }
                          />

                          <AdminInput
                            label="Reverse AWB / Tracking Number"
                            value={returnForm.trackingNumber}
                            placeholder="Reverse pickup AWB"
                            onChange={(value) =>
                              setReturnForm((previous) => ({
                                ...previous,
                                trackingNumber: value,
                              }))
                            }
                          />

                          <div className="sm:col-span-2">
                            <AdminInput
                              label="Reverse Tracking URL"
                              value={returnForm.trackingUrl}
                              placeholder="https://courier-site.com/track/..."
                              onChange={(value) =>
                                setReturnForm((previous) => ({
                                  ...previous,
                                  trackingUrl: value,
                                }))
                              }
                            />
                          </div>
                        </div>


                        {order.returnRequest.type === "exchange" &&
                          returnForm.status === "exchange_dispatched" && (
                            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                              <p className="text-sm font-medium text-green-300 mb-4">
                                Replacement Shipment
                              </p>

                              <div className="grid sm:grid-cols-2 gap-4">
                                <AdminInput
                                  label="Replacement Courier"
                                  value={returnForm.replacementCourierName}
                                  placeholder="Example: Delhivery"
                                  onChange={(value) =>
                                    setReturnForm((previous) => ({
                                      ...previous,
                                      replacementCourierName: value,
                                    }))
                                  }
                                />

                                <AdminInput
                                  label="Replacement AWB / Tracking Number"
                                  value={returnForm.replacementAwbNumber}
                                  placeholder="Replacement shipment AWB"
                                  onChange={(value) =>
                                    setReturnForm((previous) => ({
                                      ...previous,
                                      replacementAwbNumber: value,
                                    }))
                                  }
                                />

                                <div className="sm:col-span-2">
                                  <AdminInput
                                    label="Replacement Tracking URL"
                                    value={returnForm.replacementTrackingUrl}
                                    placeholder="https://courier-site.com/track/..."
                                    onChange={(value) =>
                                      setReturnForm((previous) => ({
                                        ...previous,
                                        replacementTrackingUrl: value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        <button
                          type="button"
                          onClick={() => onReturnUpdate()}
                          disabled={returnSaving}
                          className="btn-primary w-full rounded-full py-3 disabled:opacity-50"
                        >
                          {returnSaving
                            ? "Saving..."
                            : "Save Return / Exchange Update"}
                        </button>
                      </>
                    )}

                  {order.returnRequest.status === "rejected" && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="text-sm text-red-300 font-medium">
                        Request Rejected
                      </p>

                      {order.returnRequest.adminNote && (
                        <p className="text-xs text-white/60 mt-2">
                          {order.returnRequest.adminNote}
                        </p>
                      )}
                    </div>
                  )}

                  {order.returnRequest.status === "completed" && (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                      <p className="text-sm text-green-300 font-medium">
                        Return / Exchange Completed
                      </p>
                    </div>
                  )}
                </div>
              </InfoSection>
            )}

          <InfoSection title="Update Shipment">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2">
                <span className="block text-xs text-muted mb-2">
                  Order Status
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <AdminInput
                label="Courier Company"
                value={form.courierName}
                placeholder="Example: Delhivery"
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    courierName: value,
                  }))
                }
              />

              <AdminInput
                label="AWB / Tracking Number"
                value={form.trackingNumber}
                placeholder="Tracking number"
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    trackingNumber: value,
                  }))
                }
              />

              <div className="sm:col-span-2">
                <AdminInput
                  label="Tracking URL"
                  value={form.trackingUrl}
                  placeholder="https://courier-site.com/track/..."
                  onChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      trackingUrl: value,
                    }))
                  }
                />
              </div>
            </div>

            {message && (
              <p className="mt-4 text-sm text-green-400">
                {message}
              </p>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="btn-primary w-full rounded-full py-3 mt-5 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Order Update"}
            </button>
          </InfoSection>
        </div>
      </aside>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <h3 className="f-head font-semibold mb-4">{title}</h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value || "Not available"}</span>
    </div>
  );
}

function AdminInput({
  label,
  value,
  placeholder,
  onChange,
}) {
  return (
    <label>
      <span className="block text-xs text-muted mb-2">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-violet-500"
      />
    </label>
  );
}