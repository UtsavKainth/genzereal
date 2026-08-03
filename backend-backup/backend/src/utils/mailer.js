import nodemailer from "nodemailer";


function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function buildAddress(address = {}) {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .map(escapeHtml);

  return parts.length
    ? parts.join("<br />")
    : "Delivery address not provided";
}

export async function sendOrderConfirmation(order) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("Email credentials are not configured");
  }

  if (!order.customerEmail) {
    throw new Error("Customer email is missing");
  }

  const productRows = order.items
    .map((item) => {
      const productTotal = Number(item.price) * Number(item.qty);

      return `
        <tr>
          <td style="padding:14px 10px;border-bottom:1px solid #e8e8e8;">
            <div style="font-weight:700;color:#171717;">
              ${escapeHtml(item.name)}
            </div>

            <div style="font-size:13px;color:#666;margin-top:4px;">
              Size: ${escapeHtml(item.size || "Not selected")}
            </div>
          </td>

          <td style="padding:14px 10px;border-bottom:1px solid #e8e8e8;text-align:center;">
            ${Number(item.qty)}
          </td>

          <td style="padding:14px 10px;border-bottom:1px solid #e8e8e8;text-align:right;">
            ${formatCurrency(productTotal)}
          </td>
        </tr>
      `;
    })
    .join("");

  const orderDate = formatDate(order.createdAt || new Date());

  const deliveryDate = formatDate(
    order.estimatedDeliveryDate
  );

  const deliveryAddress = buildAddress(
    order.shippingAddress
  );

  const customerName = escapeHtml(
    order.customerName || "Customer"
  );

  const orderNumber = escapeHtml(order.orderNumber);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>GenZeReal Order Confirmation</title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f3f3f3;
          font-family:Arial,Helvetica,sans-serif;
          color:#171717;
        "
      >
        <div style="padding:24px 12px;">
          <div
            style="
              max-width:680px;
              margin:0 auto;
              background:#ffffff;
              border-radius:14px;
              overflow:hidden;
              box-shadow:0 4px 18px rgba(0,0,0,0.08);
            "
          >
            <div
              style="
                background:#0a0a0a;
                color:#ffffff;
                text-align:center;
                padding:28px 20px;
              "
            >
              <div
                style="
                  font-size:30px;
                  font-weight:900;
                  letter-spacing:3px;
                "
              >
                GENZEREAL
              </div>

              <div
                style="
                  margin-top:7px;
                  font-size:12px;
                  letter-spacing:2px;
                  color:#cccccc;
                "
              >
                WEAR WHAT'S REAL
              </div>
            </div>

            <div style="padding:32px 26px;">
              <div
                style="
                  width:58px;
                  height:58px;
                  line-height:58px;
                  text-align:center;
                  border-radius:50%;
                  background:#e9fff0;
                  color:#16843d;
                  font-size:30px;
                  margin:0 auto 18px;
                "
              >
                ✓
              </div>

              <h1
                style="
                  margin:0;
                  text-align:center;
                  font-size:27px;
                  color:#111111;
                "
              >
                Your T-shirt has been booked!
              </h1>

              <p
                style="
                  text-align:center;
                  color:#555555;
                  font-size:15px;
                  line-height:1.6;
                  margin:14px 0 28px;
                "
              >
                Hi ${customerName}, thank you for shopping with
                GenZeReal. We have successfully received your order.
              </p>

              <div
                style="
                  background:#f7f7f7;
                  border-radius:12px;
                  padding:18px;
                  margin-bottom:24px;
                "
              >
                <table
                  style="
                    width:100%;
                    border-collapse:collapse;
                    font-size:14px;
                  "
                >
                  <tr>
                    <td style="padding:7px 0;color:#666;">
                      Order number
                    </td>

                    <td
                      style="
                        padding:7px 0;
                        text-align:right;
                        font-weight:800;
                        color:#111;
                      "
                    >
                      ${orderNumber}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:7px 0;color:#666;">
                      Order date
                    </td>

                    <td
                      style="
                        padding:7px 0;
                        text-align:right;
                        font-weight:700;
                      "
                    >
                      ${orderDate}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:7px 0;color:#666;">
                      Estimated delivery
                    </td>

                    <td
                      style="
                        padding:7px 0;
                        text-align:right;
                        font-weight:800;
                        color:#16843d;
                      "
                    >
                      ${deliveryDate}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:7px 0;color:#666;">
                      Payment method
                    </td>

                    <td
                      style="
                        padding:7px 0;
                        text-align:right;
                        font-weight:700;
                      "
                    >
                      ${escapeHtml(order.paymentMethod || "COD")}
                    </td>
                  </tr>
                </table>
              </div>

              <h2
                style="
                  font-size:19px;
                  margin:0 0 10px;
                  color:#111;
                "
              >
                Order summary
              </h2>

              <table
                style="
                  width:100%;
                  border-collapse:collapse;
                  font-size:14px;
                "
              >
                <thead>
                  <tr style="background:#fafafa;">
                    <th
                      style="
                        padding:12px 10px;
                        text-align:left;
                        border-bottom:2px solid #dddddd;
                      "
                    >
                      Product
                    </th>

                    <th
                      style="
                        padding:12px 10px;
                        text-align:center;
                        border-bottom:2px solid #dddddd;
                      "
                    >
                      Qty
                    </th>

                    <th
                      style="
                        padding:12px 10px;
                        text-align:right;
                        border-bottom:2px solid #dddddd;
                      "
                    >
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${productRows}
                </tbody>
              </table>

              <div
                style="
                  display:block;
                  margin-top:18px;
                  text-align:right;
                  font-size:20px;
                  font-weight:900;
                "
              >
                Total: ${formatCurrency(order.subtotal)}
              </div>

              <div
                style="
                  margin-top:28px;
                  border-top:1px solid #eeeeee;
                  padding-top:22px;
                "
              >
                <h2
                  style="
                    font-size:18px;
                    margin:0 0 10px;
                  "
                >
                  Delivery address
                </h2>

                <div
                  style="
                    color:#555555;
                    font-size:14px;
                    line-height:1.7;
                  "
                >
                  ${deliveryAddress}
                </div>
              </div>

              <div
                style="
                  margin-top:26px;
                  background:#fff8df;
                  border:1px solid #f2dd8e;
                  padding:16px;
                  border-radius:10px;
                  font-size:14px;
                  line-height:1.6;
                  color:#5f5017;
                "
              >
                We will send you another update when your order is
                dispatched. Please keep your order number for future
                reference.
              </div>
            </div>

            <div
              style="
                background:#0a0a0a;
                color:#bbbbbb;
                text-align:center;
                padding:22px 20px;
                font-size:12px;
                line-height:1.7;
              "
            >
              <div style="color:#ffffff;font-weight:700;">
                Thank you for choosing GenZeReal
              </div>

              <div>
                This is an automated order confirmation email.
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from:
      process.env.MAIL_FROM ||
      `"GenZeReal" <${process.env.MAIL_USER}>`,

    to: order.customerEmail,

    subject: `Your GenZeReal order is confirmed — ${order.orderNumber}`,

    html,

    text: `
Hi ${order.customerName},

Your T-shirt has been booked successfully.

Order Number: ${order.orderNumber}
Order Date: ${orderDate}
Estimated Delivery: ${deliveryDate}
Payment Method: ${order.paymentMethod}
Total: ${formatCurrency(order.subtotal)}

Thank you for shopping with GenZeReal.
    `.trim(),
  };

  if (process.env.ADMIN_EMAIL) {
    mailOptions.bcc = process.env.ADMIN_EMAIL;
  }

  const info = await createTransporter().sendMail(mailOptions);

  console.log(
    `Confirmation email sent to ${order.customerEmail}: ${info.messageId}`
  );

  return info;
}