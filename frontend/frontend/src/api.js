const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getToken = () =>
  localStorage.getItem("genzereal_token");

export const saveSession = ({ token, user }) => {
  localStorage.setItem("genzereal_token", token);
  localStorage.setItem(
    "genzereal_user",
    JSON.stringify(user)
  );
};

export const clearSession = () => {
  localStorage.removeItem("genzereal_token");
  localStorage.removeItem("genzereal_user");
};

export async function api(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const authApi = {
  register: (body) =>
    api("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body) =>
    api("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logout: () =>
    api("/auth/logout", {
      method: "POST",
    }),

  me: () => api("/auth/me"),
};

export const wishlistApi = {
  get: () => api("/wishlist"),

  add: (productId) =>
    api(`/wishlist/${productId}`, {
      method: "POST",
    }),

  remove: (productId) =>
    api(`/wishlist/${productId}`, {
      method: "DELETE",
    }),
};

export const orderApi = {
  create: (body) =>
    api("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createPayment: (body) =>
    api("/orders/payment/create", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  verifyPayment: (body) =>
    api("/orders/payment/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  mine: () => api("/orders/mine"),

  cancel: (orderId, reason) =>
    api(`/orders/${orderId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
};

export const reviewApi = {
  get: (productId) =>
    api(`/reviews/${productId}`),

  save: (productId, rating, comment) =>
    api(`/reviews/${productId}`, {
      method: "POST",
      body: JSON.stringify({
        rating,
        comment,
      }),
    }),

  remove: (productId) =>
    api(`/reviews/${productId}`, {
      method: "DELETE",
    }),
};

export const adminApi = {
  dashboard: () =>
    api("/admin/dashboard"),

  orders: () =>
    api("/admin/orders"),

  updateOrder: (orderId, body) =>
    api(`/admin/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
export const productApi = {
  list: () => api("/products"),

  adminList: () => api("/products/admin"),

  create: (body) =>
    api("/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (productId, body) =>
    api(`/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  remove: (productId) =>
    api(`/products/${productId}`, {
      method: "DELETE",
    }),
};
export const uploadApi = {
  productImages: async (files) => {
    const token = getToken();
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("images", file);
    });

    const response = await fetch(
      `${API_URL}/upload/product-images`,
      {
        method: "POST",
        headers: {
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: formData,
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Image upload failed"
      );
    }

    return data;
  },
};