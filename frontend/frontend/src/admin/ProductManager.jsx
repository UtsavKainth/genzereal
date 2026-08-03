import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Image as ImageIcon,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { productApi, uploadApi } from "../api";
const EMPTY_PRODUCT = {
  id: "",
  name: "",
  cat: "Streetwear",
  price: "",
  mrp: "",
  tag: "",
  rating: 0,
  g: 0,
  mark: "",
  images: [""],
  desc: "",
  sizes: [
    { size: "S", stock: 0 },
    { size: "M", stock: 0 },
    { size: "L", stock: 0 },
    { size: "XL", stock: 0 },
  ],
  active: true,
  featured: false,
  bestseller: false,
};

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await productApi.adminList();

      setProducts(
        Array.isArray(data.products) ? data.products : []
      );
    } catch (requestError) {
      setError(
        requestError.message || "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return products;

    return products.filter((product) =>
      [
        product.id,
        product.name,
        product.cat,
        product.tag,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [products, search]);

  const openAddForm = () => {
    const highestId = products.reduce(
      (highest, product) =>
        Math.max(highest, Number(product.id) || 0),
      0
    );

    setEditingProduct(null);
    setForm({
      ...EMPTY_PRODUCT,
      id: highestId + 1,
      images: [""],
      sizes: EMPTY_PRODUCT.sizes.map((item) => ({
        ...item,
      })),
    });

    setError("");
    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);

    setForm({
      id: product.id ?? "",
      name: product.name || "",
      cat: product.cat || "Streetwear",
      price: product.price ?? "",
      mrp: product.mrp ?? "",
      tag: product.tag || "",
      rating: product.rating ?? 0,
      g: product.g ?? 0,
      mark: product.mark || "",
      images:
        Array.isArray(product.images) &&
        product.images.length > 0
          ? [...product.images]
          : [""],
      desc: product.desc || "",
      sizes:
        Array.isArray(product.sizes) &&
        product.sizes.length > 0
          ? product.sizes.map((item) => ({
              size: item.size,
              stock: item.stock,
            }))
          : EMPTY_PRODUCT.sizes.map((item) => ({
              ...item,
            })),
      active: product.active !== false,
      featured: Boolean(product.featured),
      bestseller: Boolean(product.bestseller),
    });

    setError("");
    setMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingProduct(null);
    setForm(EMPTY_PRODUCT);
    setError("");
    setMessage("");
  };

  const updateField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const updateImage = (index, value) => {
    setForm((previous) => {
      const images = [...previous.images];
      images[index] = value;

      return {
        ...previous,
        images,
      };
    });
  };

  const addImageField = () => {
    setForm((previous) => ({
      ...previous,
      images: [...previous.images, ""],
    }));
  };

  const removeImageField = (index) => {
    setForm((previous) => ({
      ...previous,
      images:
        previous.images.length === 1
          ? [""]
          : previous.images.filter(
              (_, imageIndex) => imageIndex !== index
            ),
    }));
  };

  const updateSizeStock = (index, value) => {
    setForm((previous) => {
      const sizes = previous.sizes.map(
        (item, sizeIndex) =>
          sizeIndex === index
            ? {
                ...item,
                stock: Math.max(
                  0,
                  Number(value) || 0
                ),
              }
            : item
      );

      return {
        ...previous,
        sizes,
      };
    });
  };

  const validateForm = () => {
    if (!Number.isFinite(Number(form.id))) {
      throw new Error("Product ID is required.");
    }

    if (!form.name.trim()) {
      throw new Error("Product name is required.");
    }

    if (!form.cat.trim()) {
      throw new Error("Category is required.");
    }

    if (
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      throw new Error("Enter a valid price.");
    }

    if (!form.desc.trim()) {
      throw new Error(
        "Product description is required."
      );
    }
  };

  const preparePayload = () => ({
    id: Number(form.id),
    name: form.name.trim(),
    cat: form.cat.trim(),
    price: Number(form.price),
    mrp:
      form.mrp === "" || form.mrp === null
        ? null
        : Number(form.mrp),
    tag: form.tag || null,
    rating: Number(form.rating || 0),
    g: Number(form.g || 0),
    mark: form.mark.trim(),
    images: form.images
      .map((image) => image.trim())
      .filter(Boolean),
    desc: form.desc.trim(),
    sizes: form.sizes.map((item) => ({
      size: item.size,
      stock: Number(item.stock || 0),
    })),
    active: Boolean(form.active),
    featured: Boolean(form.featured),
    bestseller: Boolean(form.bestseller),
  });

  const saveProduct = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      validateForm();

      const payload = preparePayload();

      const data = editingProduct
        ? await productApi.update(
            editingProduct._id,
            payload
          )
        : await productApi.create(payload);

      setMessage(
        data.message || "Product saved successfully."
      );

      await loadProducts();

      setTimeout(() => {
        closeForm();
      }, 600);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}" permanently?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const data = await productApi.remove(product._id);

      setMessage(
        data.message || "Product deleted successfully."
      );

      setProducts((previous) =>
        previous.filter(
          (item) => item._id !== product._id
        )
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to delete product."
      );
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="p-5 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="f-head text-xl font-bold">
            Products
          </h2>

          <p className="text-sm text-muted mt-1">
            Add, edit, delete and manage product stock.
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
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search products"
              className="w-full sm:w-64 rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="icon-btn"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={openAddForm}
            className="btn-primary rounded-full px-5 py-2.5 flex items-center justify-center gap-2"
          >
            <Plus size={17} />
            Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="m-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {message && (
        <div className="m-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          {message}
        </div>
      )}

      {loading ? (
        <div className="min-h-64 flex items-center justify-center">
          <RefreshCw
            size={28}
            className="animate-spin text-violet-500"
          />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="min-h-64 flex flex-col items-center justify-center text-center p-8">
          <Package size={36} className="text-muted" />

          <h3 className="f-head text-lg font-semibold mt-4">
            No products found
          </h3>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-white/10">
              <tr className="text-left text-xs text-muted">
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {filteredProducts.map((product) => (
                <tr
                  key={product._id}
                  className="hover:bg-white/[0.025]"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-16 rounded-lg border border-white/10 bg-black/30 overflow-hidden shrink-0">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon
                              size={20}
                              className="text-muted"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="font-semibold">
                          {product.name}
                        </p>

                        <p className="text-xs text-muted mt-1">
                          ID: {product.id}
                          {product.tag
                            ? ` · ${product.tag}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-sm">
                    {product.cat}
                  </td>

                  <td className="p-4">
                    <p className="font-semibold">
                      {formatMoney(product.price)}
                    </p>

                    {product.mrp && (
                      <p className="text-xs text-muted line-through mt-1">
                        {formatMoney(product.mrp)}
                      </p>
                    )}
                  </td>

                  <td className="p-4">
                    <span
                      className={
                        Number(product.totalStock) <= 5
                          ? "text-red-400"
                          : Number(product.totalStock) <= 15
                            ? "text-yellow-400"
                            : "text-green-400"
                      }
                    >
                      {product.totalStock || 0}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                        product.active
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : "border-red-500/30 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {product.active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(product)
                        }
                        className="icon-btn"
                        aria-label="Edit product"
                      >
                        <Edit3 size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteProduct(product)
                        }
                        className="icon-btn hover:text-red-400"
                        aria-label="Delete product"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ProductForm
          form={form}
          editingProduct={editingProduct}
          saving={saving}
          error={error}
          message={message}
          onClose={closeForm}
          onSubmit={saveProduct}
          updateField={updateField}
          updateImage={updateImage}
          addImageField={addImageField}
          removeImageField={removeImageField}
          updateSizeStock={updateSizeStock}
        />
      )}
    </section>
  );
}

function ProductForm({
  form,
  editingProduct,
  saving,
  error,
  message,
  onClose,
  onSubmit,
  updateField,
  updateImage,
  addImageField,
  removeImageField,
  updateSizeStock,
}) {
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    try {
      const data = await uploadApi.productImages(files);

      const uploadedUrls = Array.isArray(data.images)
        ? data.images
            .map((image) => image.url)
            .filter(Boolean)
        : [];

      if (uploadedUrls.length === 0) {
        throw new Error("No images were uploaded.");
      }

      updateField("images", [
        ...form.images.filter(Boolean),
        ...uploadedUrls,
      ]);
    } catch (uploadError) {
      console.error("Cloudinary upload failed:", uploadError);
      alert(uploadError.message || "Image upload failed.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/75 flex justify-end"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-3xl h-full overflow-y-auto border-l border-white/10 bg-[#111116]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#111116]/95 backdrop-blur p-5 flex items-center justify-between">
          <div>
            <h2 className="f-head text-xl font-bold">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>

            <p className="text-xs text-muted mt-1">
              Product information and inventory
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            disabled={saving}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-6">
          <FormSection title="Basic Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <AdminInput
                label="Product ID"
                type="number"
                value={form.id}
                onChange={(value) => updateField("id", value)}
              />

              <AdminInput
                label="Product Name"
                value={form.name}
                onChange={(value) => updateField("name", value)}
              />

              <label>
                <span className="block text-xs text-muted mb-2">
                  Category
                </span>

                <select
                  value={form.cat}
                  onChange={(event) =>
                    updateField("cat", event.target.value)
                  }
                  className="admin-field"
                >
                  <option value="Streetwear">Streetwear</option>
                  <option value="Outerwear">Outerwear</option>
                  <option value="Bottoms">Bottoms</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </label>

              <label>
                <span className="block text-xs text-muted mb-2">
                  Tag
                </span>

                <select
                  value={form.tag}
                  onChange={(event) =>
                    updateField("tag", event.target.value)
                  }
                  className="admin-field"
                >
                  <option value="">No Tag</option>
                  <option value="NEW">NEW</option>
                  <option value="SALE">SALE</option>
                  <option value="BESTSELLER">BESTSELLER</option>
                </select>
              </label>

              <AdminInput
                label="Selling Price"
                type="number"
                value={form.price}
                onChange={(value) => updateField("price", value)}
              />

              <AdminInput
                label="MRP"
                type="number"
                value={form.mrp}
                onChange={(value) => updateField("mrp", value)}
              />

              <AdminInput
                label="Short Mark"
                value={form.mark}
                placeholder="Example: GH"
                onChange={(value) => updateField("mark", value)}
              />

              <AdminInput
                label="Rating"
                type="number"
                value={form.rating}
                onChange={(value) => updateField("rating", value)}
              />
            </div>

            <label className="block mt-4">
              <span className="block text-xs text-muted mb-2">
                Description
              </span>

              <textarea
                value={form.desc}
                onChange={(event) =>
                  updateField("desc", event.target.value)
                }
                rows={4}
                className="admin-field resize-none"
              />
            </label>
          </FormSection>

          <FormSection title="Product Images">
            <label className="block rounded-2xl border-2 border-dashed border-violet-500/40 p-8 text-center cursor-pointer hover:bg-violet-500/10 transition">
              <Upload
                size={32}
                className="mx-auto text-violet-400"
              />

              <p className="mt-3 font-semibold">
                Click to upload product images
              </p>

              <p className="text-xs text-muted mt-1">
                JPG, PNG or WEBP — maximum 5 MB each
              </p>

              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {form.images
                .filter(Boolean)
                .map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative rounded-xl overflow-hidden border border-white/10 aspect-square"
                  >
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImageField(index)
                      }
                      className="absolute top-2 right-2 bg-black/70 rounded-full p-2"
                    >
                      <Trash2 size={14} />
                    </button>

                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 bg-violet-600 text-xs px-2 py-1 rounded-full">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
            </div>

            <div className="space-y-3 mt-6">
              {form.images.map((image, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={image}
                    onChange={(event) =>
                      updateImage(
                        index,
                        event.target.value
                      )
                    }
                    placeholder="Or paste image URL"
                    className="admin-field"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removeImageField(index)
                    }
                    className="icon-btn"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addImageField}
                className="text-violet-400 text-sm flex items-center gap-2"
              >
                <Plus size={15} />
                Add Image URL
              </button>
            </div>
          </FormSection>

          <FormSection title="Size-wise Stock">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {form.sizes.map((item, index) => (
                <label key={item.size}>
                  <span className="block text-xs text-muted mb-2">
                    Size {item.size}
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={item.stock}
                    onChange={(event) =>
                      updateSizeStock(
                        index,
                        event.target.value
                      )
                    }
                    className="admin-field"
                  />
                </label>
              ))}
            </div>
          </FormSection>

          <FormSection title="Visibility">
            <div className="grid sm:grid-cols-3 gap-4">
              <CheckBox
                label="Active"
                checked={form.active}
                onChange={(checked) =>
                  updateField("active", checked)
                }
              />

              <CheckBox
                label="Featured"
                checked={form.featured}
                onChange={(checked) =>
                  updateField("featured", checked)
                }
              />

              <CheckBox
                label="Bestseller"
                checked={form.bestseller}
                onChange={(checked) =>
                  updateField("bestseller", checked)
                }
              />
            </div>
          </FormSection>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          {message && (
            <p className="text-sm text-green-400">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full rounded-full py-3 disabled:opacity-50"
          >
            {saving
              ? "Saving Product..."
              : "Save Product"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <h3 className="f-head font-semibold mb-4">
        {title}
      </h3>

      {children}
    </section>
  );
}

function AdminInput({
  label,
  value,
  type = "text",
  placeholder = "",
  onChange,
}) {
  return (
    <label>
      <span className="block text-xs text-muted mb-2">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-white/10 bg-[#111116] text-white px-4 py-3 outline-none transition-all placeholder:text-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
      />
    </label>
  );
}

function CheckBox({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      <span className="text-sm">{label}</span>
    </label>
  );
}