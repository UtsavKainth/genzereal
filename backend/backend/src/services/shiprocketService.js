const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

let cachedToken = "";
let tokenCreatedAt = 0;

function getCredentials() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error("Shiprocket API credentials are not configured");
  }

  return { email, password };
}

export async function getShiprocketToken() {
  const twelveHours = 12 * 60 * 60 * 1000;

  if (
    cachedToken &&
    Date.now() - tokenCreatedAt < twelveHours
  ) {
    return cachedToken;
  }

  const { email, password } = getCredentials();

  const response = await fetch(
    `${SHIPROCKET_BASE_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.token) {
    console.error("Shiprocket auth failed:", data);
    throw new Error(
      data?.message || "Unable to authenticate with Shiprocket"
    );
  }

  cachedToken = data.token;
  tokenCreatedAt = Date.now();

  return cachedToken;
}

export async function shiprocketRequest(
  endpoint,
  {
    method = "GET",
    body,
  } = {}
) {
  const token = await getShiprocketToken();

  const response = await fetch(
    `${SHIPROCKET_BASE_URL}${endpoint}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body
        ? { body: JSON.stringify(body) }
        : {}),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      `Shiprocket request failed: ${endpoint}`,
      data
    );

    throw new Error(
      data?.message ||
        data?.error ||
        "Shiprocket API request failed"
    );
  }

  return data;
}

function splitCustomerName(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "Customer",
    lastName: parts.slice(1).join(" ") || "",
  };
}

export async function createShiprocketOrder(order) {
  if (!order) {
    throw new Error("Order is required for Shiprocket");
  }

  const pickupLocation =
    process.env.SHIPROCKET_PICKUP_LOCATION || "home";

  const { firstName, lastName } =
    splitCustomerName(order.customerName);

  const address = order.shippingAddress || {};

  const totalQty = order.items.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0
  );

  const weight = Math.max(
    0.5,
    Number((totalQty * 0.5).toFixed(2))
  );

  const orderItems = order.items.map((item) => ({
    name: `${item.name}${item.size ? ` - ${item.size}` : ""}`,
    sku: `GZR-${item.productId}-${item.size || "NA"}`,
    units: Number(item.qty),
    selling_price: Number(item.price),
    discount: "",
    tax: "",
    hsn: "",
  }));

  const payload = {
    order_id: order.orderNumber,
    order_date: new Date(order.createdAt || Date.now())
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),

    pickup_location: pickupLocation,

    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: address.line1 || "",
    billing_address_2: address.line2 || "",
    billing_city: address.city || "",
    billing_pincode: String(address.postalCode || ""),
    billing_state: address.state || "",
    billing_country: address.country || "India",
    billing_email: order.customerEmail || "",
    billing_phone: String(order.customerPhone || ""),

    shipping_is_billing: true,

    order_items: orderItems,

    payment_method:
      String(order.paymentMethod).toUpperCase() === "COD"
        ? "COD"
        : "Prepaid",

    shipping_charges: Number(order.shippingCharge || 0),
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: Number(order.subtotal || order.total || 0),

    length: 30,
    breadth: 25,
    height: 5,
    weight,
  };

  return shiprocketRequest(
    "/orders/create/adhoc",
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function getAvailableCouriers({
  pickupPostcode,
  deliveryPostcode,
  weight = 0.5,
  cod = true,
}) {
  const params = new URLSearchParams({
    pickup_postcode: String(pickupPostcode),
    delivery_postcode: String(deliveryPostcode),
    weight: String(weight),
    cod: cod ? "1" : "0",
  });

  const data = await shiprocketRequest(
    `/courier/serviceability/?${params.toString()}`
  );

  return {
    couriers:
      data?.data?.available_courier_companies || [],
    recommendedCourierId:
      data?.data?.recommended_courier_company_id || null,
  };
}

export function chooseShiprocketCourier(
  couriers = [],
  recommendedCourierId = null
) {
  if (!Array.isArray(couriers) || couriers.length === 0) {
    throw new Error(
      "No Shiprocket courier is serviceable for this shipment"
    );
  }

  if (recommendedCourierId) {
    const recommended = couriers.find(
      (courier) =>
        Number(courier.courier_company_id) ===
        Number(recommendedCourierId)
    );

    if (recommended) {
      return recommended;
    }
  }

  const shiprocketRecommended = couriers.find(
    (courier) =>
      Number(courier.recommended_lt) === 1 &&
      Number(courier.blocked || 0) === 0
  );

  if (shiprocketRecommended) {
    return shiprocketRecommended;
  }

  return [...couriers]
    .filter(
      (courier) =>
        Number(courier.blocked || 0) === 0 &&
        Number.isFinite(Number(courier.rate))
    )
    .sort((a, b) => {
      const ratingDifference =
        Number(b.rating || 0) -
        Number(a.rating || 0);

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      return Number(a.rate) - Number(b.rate);
    })[0];
}

export async function assignShiprocketAwb({
  shipmentId,
  courierId,
}) {
  if (!shipmentId) {
    throw new Error(
      "Shiprocket shipment ID is required for AWB assignment"
    );
  }

  if (!courierId) {
    throw new Error(
      "Shiprocket courier ID is required for AWB assignment"
    );
  }

  const data = await shiprocketRequest(
    "/courier/assign/awb",
    {
      method: "POST",
      body: {
        shipment_id: Number(shipmentId),
        courier_id: Number(courierId),
      },
    }
  );

  const responseData =
    data?.response?.data ||
    data?.data ||
    data;

  const awbCode =
    responseData?.awb_code ||
    responseData?.awb ||
    "";

  const courierName =
    responseData?.courier_name ||
    responseData?.courier_company_name ||
    "";

  if (!awbCode) {
    throw new Error(
      data?.message ||
      "Shiprocket did not return an AWB number"
    );
  }

  return {
    awbCode,
    courierName,
    raw: data,
  };
}

export async function scheduleShiprocketPickup({
  shipmentId,
}) {
  if (!shipmentId) {
    throw new Error(
      "Shiprocket shipment ID is required for pickup scheduling"
    );
  }

  const data = await shiprocketRequest(
    "/courier/generate/pickup",
    {
      method: "POST",
      body: {
        shipment_id: [Number(shipmentId)],
      },
    }
  );

  return data;
}

export async function trackShiprocketAwb(awbCode) {
  const awb = String(awbCode || "").trim();

  if (!awb) {
    throw new Error(
      "Shiprocket AWB number is required for tracking"
    );
  }

  const data = await shiprocketRequest(
    `/courier/track/awb/${encodeURIComponent(awb)}`
  );

  return data;
}

export async function generateShiprocketLabel({
  shipmentId,
}) {
  if (!shipmentId) {
    throw new Error(
      "Shiprocket shipment ID is required for label generation"
    );
  }

  const data = await shiprocketRequest(
    "/courier/generate/label",
    {
      method: "POST",
      body: {
        shipment_id: [Number(shipmentId)],
      },
    }
  );

  const labelUrl =
    data?.label_url ||
    data?.response?.label_url ||
    data?.data?.label_url ||
    "";

  if (!labelUrl) {
    throw new Error(
      data?.message ||
      "Shiprocket did not return a shipping label URL"
    );
  }

  return {
    labelUrl,
    raw: data,
  };
}
