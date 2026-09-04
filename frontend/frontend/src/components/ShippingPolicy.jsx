import React from "react";
import { X, Truck, MapPin, Clock3, PackageCheck } from "lucide-react";

export default function ShippingPolicy({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto"
      style={{ background: "#0A0A0D" }}
    >
      <div className="max-w-4xl mx-auto px-5 py-8 md:py-12">

        <div className="flex items-center justify-between mb-10">
          <a href="#top" className="f-head text-2xl font-bold">
            GENZE<span className="grad-text">REAL</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close shipping policy"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-10">
          <p className="f-mono text-xs text-muted mb-3">
            CUSTOMER SUPPORT
          </p>

          <h1 className="f-head text-3xl md:text-5xl font-bold mb-4">
            Shipping Policy
          </h1>

          <p className="text-muted">
            Last updated: September 2026
          </p>
        </div>

        <div className="space-y-8 text-sm md:text-base leading-7">

          <section>
            <div className="flex items-center gap-3 mb-3">
              <PackageCheck size={20} />
              <h2 className="f-head text-xl font-semibold">
                Order Processing
              </h2>
            </div>

            <p className="text-muted">
              Orders are processed after successful order confirmation and,
              where applicable, successful payment verification. Processing
              time may vary depending on product availability, order volume,
              weekends and public holidays.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <Clock3 size={20} />
              <h2 className="f-head text-xl font-semibold">
                Estimated Delivery
              </h2>
            </div>

            <p className="text-muted">
              Estimated delivery dates shown during checkout or in order
              updates are approximate and may vary based on the delivery
              location, courier availability, weather, operational delays and
              other circumstances beyond GenZeReal's reasonable control.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <Truck size={20} />
              <h2 className="f-head text-xl font-semibold">
                Courier & Tracking
              </h2>
            </div>

            <p className="text-muted">
              Once an order is dispatched, courier and tracking information
              may be provided through the My Orders section, email, SMS or
              other available communication channels.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <MapPin size={20} />
              <h2 className="f-head text-xl font-semibold">
                Delivery Address
              </h2>
            </div>

            <p className="text-muted">
              Customers are responsible for providing a complete and accurate
              delivery address, contact number and other required delivery
              details. GenZeReal is not responsible for delays or failed
              deliveries caused by incorrect or incomplete information
              provided by the customer.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Shipping Charges
            </h2>

            <p className="text-muted">
              Applicable shipping charges, if any, will be displayed during
              checkout before the order is placed. Shipping charges may vary
              depending on destination, order value, product weight and
              available shipping services.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Delivery Attempts
            </h2>

            <p className="text-muted">
              Courier partners may make one or more delivery attempts
              depending on their operating procedures. Customers should remain
              reachable on the contact number provided with the order.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Delayed or Undelivered Orders
            </h2>

            <p className="text-muted">
              If an order appears significantly delayed or remains
              undelivered, customers should contact GenZeReal support with
              their order number. We will review the shipment status and
              coordinate with the courier partner where required.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Damaged Package
            </h2>

            <p className="text-muted">
              If a package appears damaged, tampered with or incorrect at the
              time of delivery, customers should preserve the packaging and
              contact GenZeReal as soon as possible. Eligible claims will be
              handled according to our Return, Refund & Cancellation Policy.
            </p>
          </section>

          <section className="border border-line rounded-2xl p-5 md:p-6">
            <h2 className="f-head text-xl font-semibold mb-3">
              Shipping Support
            </h2>

            <p className="text-muted">
              For shipping-related assistance, contact GenZeReal support and
              include your order number so that the shipment can be located
              quickly.
            </p>
          </section>

        </div>

        <div className="border-t border-line mt-12 pt-6 text-center">
          <p className="f-mono text-xs text-muted">
            © 2026 GenZeReal. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}
