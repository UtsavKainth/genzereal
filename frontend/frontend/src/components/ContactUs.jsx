import React from "react";
import { X, Mail, MessageCircle, Clock } from "lucide-react";

export default function ContactUs({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="f-mono text-xs text-muted mb-2">
              GENZEREAL / SUPPORT
            </p>
            <h1 className="f-head text-3xl md:text-5xl font-bold">
              Contact <span className="grad-text">Us</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn w-10 h-10 rounded-full border border-line flex items-center justify-center"
            aria-label="Close Contact Us"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border border-line rounded-3xl p-6 md:p-9 bg-surface">
          <p className="text-muted leading-7 mb-8">
            Need help with an order, delivery, return, exchange, payment or
            product? Get in touch with the GenZeReal support team.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href="mailto:hello@genzereal.com"
              className="border border-line rounded-2xl p-5 hover:border-pink transition-colors"
            >
              <Mail size={22} className="mb-4" />
              <p className="font-semibold mb-1">Email Support</p>
              <p className="text-sm text-muted">hello@genzereal.com</p>
            </a>

            <div className="border border-line rounded-2xl p-5">
              <MessageCircle size={22} className="mb-4" />
              <p className="font-semibold mb-1">Order Support</p>
              <p className="text-sm text-muted">
                Include your order number when contacting us so we can help
                you faster.
              </p>
            </div>

            <div className="border border-line rounded-2xl p-5 sm:col-span-2">
              <Clock size={22} className="mb-4" />
              <p className="font-semibold mb-1">Response Time</p>
              <p className="text-sm text-muted">
                We aim to respond to customer-support enquiries as soon as
                reasonably possible. Response times may be longer during
                weekends, public holidays and high-volume periods.
              </p>
            </div>
          </div>

          <div className="border-t border-line mt-8 pt-6">
            <p className="text-sm text-muted leading-7">
              For return or exchange requests, please use the return/exchange
              option available under My Orders when your order is eligible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
