import React from "react";
import { X, ShieldCheck } from "lucide-react";

export default function PrivacyPolicy({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 md:py-12">

        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="f-mono text-xs text-muted mb-2">
              GENZEREAL / LEGAL
            </p>
            <h1 className="f-head text-3xl md:text-5xl font-bold">
              Privacy <span className="grad-text">Policy</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn w-10 h-10 rounded-full border border-line flex items-center justify-center"
            aria-label="Close Privacy Policy"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border border-line rounded-3xl p-6 md:p-9 bg-surface">
          <div className="flex items-center gap-3 mb-7">
            <ShieldCheck size={24} />
            <p className="font-semibold">
              Your privacy matters to GenZeReal.
            </p>
          </div>

          <div className="space-y-8 text-sm md:text-base text-muted leading-7">

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                1. Information We Collect
              </h2>
              <p>
                When you use GenZeReal, create an account, place an order,
                contact us, or interact with our website, we may collect
                information such as your name, email address, phone number,
                billing and shipping address, order details and other
                information required to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                2. How We Use Your Information
              </h2>
              <p>
                We use your information to process and deliver orders, manage
                your account, provide order and shipping updates, handle
                returns and exchanges, provide customer support, prevent
                fraudulent activity and improve our website and services.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                3. Payments
              </h2>
              <p>
                Online payments may be processed through third-party payment
                service providers. GenZeReal does not intentionally store your
                complete card number, CVV, UPI PIN or other sensitive payment
                authentication credentials on its own servers.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                4. Shipping & Service Providers
              </h2>
              <p>
                We may share information necessary to fulfil your order with
                trusted service providers such as payment processors, courier
                and logistics partners, email service providers, hosting
                providers and other vendors that help us operate GenZeReal.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                5. Cookies & Website Data
              </h2>
              <p>
                Our website may use cookies, local storage and similar
                technologies to maintain sessions, remember preferences,
                operate shopping features, improve performance and understand
                how visitors use the website.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                6. Data Security
              </h2>
              <p>
                We take reasonable technical and organisational measures to
                protect personal information. However, no method of electronic
                transmission or storage can be guaranteed to be completely
                secure.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                7. Data Retention
              </h2>
              <p>
                We may retain personal and transaction information for as long
                as reasonably necessary to provide our services, maintain
                business and accounting records, resolve disputes, prevent
                fraud and comply with applicable legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                8. Your Choices
              </h2>
              <p>
                You may contact us regarding correction or other requests
                concerning your personal information. Certain information may
                need to be retained where required for legal, accounting,
                security or transaction-record purposes.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                9. Third-Party Services
              </h2>
              <p>
                Our website may contain links to or integrations with
                third-party services. Their privacy practices are governed by
                their own policies, and GenZeReal is not responsible for the
                privacy practices of independent third-party websites.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                10. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy when our services, business
                practices or legal requirements change. The latest version
                will be made available on the GenZeReal website.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                11. Contact Us
              </h2>
              <p>
                For privacy-related questions or requests, contact GenZeReal
                at hello@genzereal.com.
              </p>
            </section>

          </div>

          <div className="border-t border-line mt-9 pt-5">
            <p className="f-mono text-xs text-muted">
              Last updated: September 2026
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
