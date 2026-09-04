import React from "react";
import { X, RotateCcw, ShieldCheck, PackageCheck } from "lucide-react";

export default function ReturnPolicy({ open, onClose }) {
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
            aria-label="Close policy"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-10">
          <p className="f-mono text-xs text-muted mb-3">
            CUSTOMER SUPPORT
          </p>

          <h1 className="f-head text-3xl md:text-5xl font-bold mb-4">
            Return, Refund & Cancellation Policy
          </h1>

          <p className="text-muted">
            Last updated: September 2026
          </p>
        </div>

        <div className="space-y-8 text-sm md:text-base leading-7">

          <section>
            <div className="flex items-center gap-3 mb-3">
              <RotateCcw size={20} />
              <h2 className="f-head text-xl font-semibold">
                7-Day Return Request
              </h2>
            </div>

            <p className="text-muted">
              A return or exchange request must be raised within
              7 days from the date the product is delivered.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Eligible Returns
            </h2>

            <p className="text-muted mb-3">
              A return, replacement or exchange may be requested when:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-muted">
              <li>The product received is damaged or defective.</li>
              <li>The customer receives a product different from the product ordered.</li>
              <li>An eligible size issue requires an exchange.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <PackageCheck size={20} />
              <h2 className="f-head text-xl font-semibold">
                Size Exchanges
              </h2>
            </div>

            <p className="text-muted">
              Size-related requests are eligible for exchange only and
              are subject to availability of the requested size.
              A refund will not normally be provided solely because a
              different size is required.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Change of Mind
            </h2>

            <p className="text-muted">
              GenZeReal does not accept returns or refunds solely because
              a customer changes their mind after placing or receiving
              an order.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck size={20} />
              <h2 className="f-head text-xl font-semibold">
                Product Condition
              </h2>
            </div>

            <p className="text-muted">
              Returned products must be unused, unwashed and in their
              original condition with all original tags and packaging.
              Products showing signs of wear, washing, damage caused
              after delivery, alteration or misuse may not be accepted.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Damaged, Defective or Wrong Product
            </h2>

            <p className="text-muted">
              If you receive a damaged, defective or incorrect product,
              contact GenZeReal within 7 days of delivery. We may request
              photographs or other information necessary to verify the
              issue before approving a replacement, return or refund.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Inspection & Refunds
            </h2>

            <p className="text-muted">
              Returned products are subject to inspection. Where a refund
              is approved, it will be processed after the returned product
              has been received and successfully inspected. The time taken
              for the refunded amount to appear may depend on the original
              payment method and banking provider.
            </p>
          </section>

          <section>
            <h2 className="f-head text-xl font-semibold mb-3">
              Order Cancellation
            </h2>

            <p className="text-muted">
              Customers may request cancellation while an order is still
              eligible for cancellation. Once an order has been dispatched,
              cancellation may no longer be available. Orders already
              shipped will be handled according to the applicable return
              conditions stated above.
            </p>
          </section>

          <section className="border border-line rounded-2xl p-5 md:p-6">
            <h2 className="f-head text-xl font-semibold mb-3">
              Need Help?
            </h2>

            <p className="text-muted">
              Contact GenZeReal customer support with your order number
              and details of the issue. Our team will review your request
              and provide the applicable return, replacement or exchange
              instructions.
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
