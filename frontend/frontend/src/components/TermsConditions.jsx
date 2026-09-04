import React from "react";
import { X, FileText } from "lucide-react";

export default function TermsConditions({ onClose }) {
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
              Terms & <span className="grad-text">Conditions</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn w-10 h-10 rounded-full border border-line flex items-center justify-center"
            aria-label="Close Terms and Conditions"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border border-line rounded-3xl p-6 md:p-9 bg-surface">
          <div className="flex items-center gap-3 mb-7">
            <FileText size={24} />
            <p className="font-semibold">
              Please read these terms before using GenZeReal.
            </p>
          </div>

          <div className="space-y-8 text-sm md:text-base text-muted leading-7">
            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                1. Use of Website
              </h2>
              <p>
                By accessing or using the GenZeReal website, creating an
                account, or placing an order, you agree to these Terms &
                Conditions and our applicable policies.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                2. Product Information
              </h2>
              <p>
                We try to display product descriptions, images, colours,
                sizes and pricing accurately. Actual colour appearance may
                vary depending on screen settings, lighting and photography.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                3. Orders
              </h2>
              <p>
                An order is subject to product availability, payment
                verification where applicable, delivery serviceability and
                acceptance by GenZeReal. We may cancel or refuse an order where
                there is an error, suspected fraud, stock issue or other valid
                operational reason.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                4. Pricing & Payments
              </h2>
              <p>
                Prices displayed on the website are subject to change. Orders
                already accepted will not normally be affected by later price
                changes. Payments may be processed by third-party payment
                service providers.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                5. Shipping & Delivery
              </h2>
              <p>
                Delivery timelines are estimates and may vary due to courier
                operations, location, weather, public holidays, operational
                disruptions or other circumstances outside our reasonable
                control. Please refer to our Shipping Policy for more details.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                6. Returns, Exchanges & Refunds
              </h2>
              <p>
                Returns, exchanges and refunds are governed by our Returns &
                Refunds Policy. Eligibility, time limits, product condition,
                inspection and replacement-size availability may apply.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                7. Account Responsibility
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of
                your account credentials and for providing accurate contact,
                billing and delivery information.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                8. Intellectual Property
              </h2>
              <p>
                GenZeReal branding, graphics, product artwork, website design,
                text and other original content may be protected by applicable
                intellectual-property laws. They may not be copied, reproduced
                or commercially used without permission where such rights
                apply.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                9. Prohibited Use
              </h2>
              <p>
                You must not misuse the website, attempt unauthorised access,
                interfere with website operation, submit fraudulent orders or
                use the service for unlawful activity.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                10. Limitation of Liability
              </h2>
              <p>
                To the extent permitted by applicable law, GenZeReal will not
                be liable for indirect or consequential losses arising from use
                of the website or delays caused by matters outside our
                reasonable control. Nothing in these terms excludes rights or
                liabilities that cannot legally be excluded.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                11. Changes to These Terms
              </h2>
              <p>
                We may update these Terms & Conditions when our services,
                business practices or legal requirements change. The latest
                version will be made available on the website.
              </p>
            </section>

            <section>
              <h2 className="text-main font-semibold text-lg mb-2">
                12. Contact
              </h2>
              <p>
                For questions relating to these terms, contact GenZeReal at
                hello@genzereal.com.
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
