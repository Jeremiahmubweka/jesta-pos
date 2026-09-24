import { useEffect, useMemo, useState } from "react";

import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  AlertTriangle,
  Boxes,
  TrendingUp,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function Inventory() {
  const emptyForm = {
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    unit: "Piece",
    buying_price: "",
    selling_price: "",
    stock_quantity: "",
    minimum_stock: "",
    description: "",
  };

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        barcode,
        category_id,
        buying_price,
        selling_price,
        stock_quantity,
        minimum_stock,
        unit,
        description,
        is_active,
        created_at,
        updated_at,
        categories (
          id,
          name
        )
      `)
      .eq("is_active", true)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Products loading error:", error);

      setErrorMessage(
        `Could not load products: ${error.message}`
      );

      setProducts([]);
      setLoading(false);

      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error("Categories loading error:", error);

      setErrorMessage(
        `Could not load categories: ${error.message}`
      );

      return;
    }

    setCategories(data || []);
  }

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const sku = product.sku?.toLowerCase() || "";
      const barcode = product.barcode?.toLowerCase() || "";
      const category =
        product.categories?.name?.toLowerCase() || "";

      return (
        name.includes(search) ||
        sku.includes(search) ||
        barcode.includes(search) ||
        category.includes(search)
      );
    });
  }, [products, searchTerm]);

  const inventoryStats = useMemo(() => {
    const totalProducts = products.length;

    const lowStockProducts = products.filter((product) => {
      const stock = Number(product.stock_quantity) || 0;
      const minimum = Number(product.minimum_stock) || 0;

      return stock > 0 && stock <= minimum;
    }).length;

    const outOfStockProducts = products.filter((product) => {
      const stock = Number(product.stock_quantity) || 0;

      return stock <= 0;
    }).length;

    const inventoryValue = products.reduce((total, product) => {
      return (
        total +
        (Number(product.buying_price) || 0) *
          (Number(product.stock_quantity) || 0)
      );
    }, 0);

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      inventoryValue,
    };
  }, [products]);

  function openAddForm() {
    setEditingProduct(null);
    setForm(emptyForm);
    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  }

  function openEditForm(product) {
    setEditingProduct(product);

    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      category_id: product.category_id
        ? String(product.category_id)
        : "",
      unit: product.unit || "Piece",
      buying_price: product.buying_price ?? "",
      selling_price: product.selling_price ?? "",
      stock_quantity: product.stock_quantity ?? "",
      minimum_stock: product.minimum_stock ?? "",
      description: product.description || "",
    });

    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function saveProduct(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!form.name.trim()) {
      setErrorMessage("Product name is required.");
      setSaving(false);
      return;
    }

    if (
      form.buying_price === "" ||
      form.selling_price === ""
    ) {
      setErrorMessage(
        "Buying price and selling price are required."
      );

      setSaving(false);
      return;
    }

    const {
      data: businessId,
      error: businessError,
    } = await supabase.rpc("get_my_business_id");

    if (businessError) {
      console.error(
        "Business lookup error:",
        businessError
      );

      setErrorMessage(
        `Could not identify your business: ${businessError.message}`
      );

      setSaving(false);

      return;
    }

    if (!businessId) {
      setErrorMessage(
        "Could not identify your business. Please log in again."
      );

      setSaving(false);

      return;
    }

    const productData = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,

      category_id: form.category_id
        ? Number(form.category_id)
        : null,

      unit: form.unit.trim() || "Piece",

      buying_price:
        Number(form.buying_price) || 0,

      selling_price:
        Number(form.selling_price) || 0,

      stock_quantity:
        Number(form.stock_quantity) || 0,

      minimum_stock:
        Number(form.minimum_stock) || 0,

      description:
        form.description.trim() || null,

      is_active: true,

      business_id: businessId,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        console.error(
          "Product update error:",
          error
        );

        setErrorMessage(
          `Could not update product: ${error.message}`
        );

        setSaving(false);

        return;
      }

      setMessage("Product updated successfully.");
    } else {
      const { error } = await supabase
        .from("products")
        .insert([productData]);

      if (error) {
        console.error(
          "Product creation error:",
          error
        );

        setErrorMessage(
          `Could not create product: ${error.message}`
        );

        setSaving(false);

        return;
      }

      setMessage("Product created successfully.");
    }

    setSaving(false);
    setShowForm(false);
    setEditingProduct(null);
    setForm(emptyForm);

    await loadProducts();
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${product.name}" from inventory?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("products")
      .update({
        is_active: false,
      })
      .eq("id", product.id);

    if (error) {
      console.error(
        "Product delete error:",
        error
      );

      setErrorMessage(
        `Could not remove product: ${error.message}`
      );

      return;
    }

    setMessage("Product removed successfully.");

    await loadProducts();
  }

  function getStockStatus(product) {
    const stock =
      Number(product.stock_quantity) || 0;

    const minimum =
      Number(product.minimum_stock) || 0;

    if (stock <= 0) {
      return {
        label: "Out of stock",
        className: "jesta-stock-out",
      };
    }

    if (stock <= minimum) {
      return {
        label: "Low stock",
        className: "jesta-stock-low",
      };
    }

    return {
      label: "In stock",
      className: "jesta-stock-good",
    };
  }

  function formatMoney(value) {
    return `KSh ${Number(value || 0).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  return (
    <div className="jesta-inventory-page">
      {/* PAGE HEADER */}
      <div className="jesta-inventory-header">
        <div>
          <div className="jesta-inventory-brand">
            JESTA POS
          </div>

          <h1>Inventory</h1>

          <p>
            Manage your products, stock levels and
            pricing from one place.
          </p>
        </div>

        <button
          type="button"
          className="jesta-btn jesta-inventory-primary"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* MESSAGES */}
      {message && (
        <div className="jesta-inventory-alert jesta-inventory-success-alert">
          <div className="jesta-alert-icon">
            <TrendingUp size={18} />
          </div>

          <div className="flex-1">
            {message}
          </div>

          <button
            type="button"
            onClick={() => setMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="jesta-inventory-alert jesta-inventory-error-alert">
          <div className="jesta-alert-icon">
            <AlertTriangle size={18} />
          </div>

          <div className="flex-1">
            {errorMessage}
          </div>

          <button
            type="button"
            onClick={() => setErrorMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="jesta-inventory-stats">
        <div className="jesta-inventory-stat">
          <div className="jesta-inventory-stat-icon products">
            <Package size={21} />
          </div>

          <div>
            <p>Total Products</p>
            <strong>
              {inventoryStats.totalProducts}
            </strong>
          </div>
        </div>

        <div className="jesta-inventory-stat">
          <div className="jesta-inventory-stat-icon stock">
            <Boxes size={21} />
          </div>

          <div>
            <p>Low Stock</p>
            <strong>
              {inventoryStats.lowStockProducts}
            </strong>
          </div>
        </div>

        <div className="jesta-inventory-stat">
          <div className="jesta-inventory-stat-icon warning">
            <AlertTriangle size={21} />
          </div>

          <div>
            <p>Out of Stock</p>
            <strong>
              {inventoryStats.outOfStockProducts}
            </strong>
          </div>
        </div>

        <div className="jesta-inventory-stat">
          <div className="jesta-inventory-stat-icon value">
            <TrendingUp size={21} />
          </div>

          <div>
            <p>Inventory Value</p>
            <strong>
              {formatMoney(
                inventoryStats.inventoryValue
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="jesta-inventory-toolbar">
        <div className="jesta-inventory-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search products, SKU, barcode or category..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

        <button
          type="button"
          className="jesta-btn jesta-inventory-refresh"
          onClick={() => {
            loadProducts();
            loadCategories();
          }}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading ? "animate-spin" : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* PRODUCT TABLE */}
      <div className="jesta-inventory-card">
        <div className="jesta-inventory-card-header">
          <div>
            <h2>Products</h2>

            <p>
              {filteredProducts.length} product
              {filteredProducts.length !== 1
                ? "s"
                : ""}{" "}
              displayed
            </p>
          </div>

          <div className="jesta-inventory-card-count">
            {filteredProducts.length}
          </div>
        </div>

        {loading ? (
          <div className="jesta-inventory-empty">
            <RefreshCw
              size={42}
              className="animate-spin"
            />

            <h3>Loading inventory...</h3>

            <p>
              Getting your products from Supabase.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="jesta-inventory-empty">
            <div className="jesta-inventory-empty-icon">
              <Package size={38} />
            </div>

            <h3>
              {searchTerm
                ? "No products found"
                : "No products yet"}
            </h3>

            <p>
              {searchTerm
                ? "Try a different search term."
                : "Add your first product to start managing your inventory."}
            </p>

            {!searchTerm && (
              <button
                type="button"
                className="jesta-btn jesta-inventory-primary"
                onClick={openAddForm}
              >
                <Plus size={18} />
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="jesta-inventory-table-wrapper">
            <table className="jesta-inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Buying Price</th>
                  <th>Selling Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map(
                  (product) => {
                    const stockStatus =
                      getStockStatus(product);

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="jesta-inventory-product">
                            <div className="jesta-inventory-product-icon">
                              <Package size={18} />
                            </div>

                            <div>
                              <strong>
                                {product.name}
                              </strong>

                              {product.barcode && (
                                <small>
                                  Barcode:{" "}
                                  {product.barcode}
                                </small>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="jesta-inventory-code">
                            {product.sku || "—"}
                          </span>
                        </td>

                        <td>
                          <span className="jesta-inventory-category">
                            {product.categories
                              ?.name ||
                              "Uncategorized"}
                          </span>
                        </td>

                        <td className="jesta-money">
                          {formatMoney(
                            product.buying_price
                          )}
                        </td>

                        <td className="jesta-selling-price">
                          {formatMoney(
                            product.selling_price
                          )}
                        </td>

                        <td>
                          <strong className="jesta-stock-number">
                            {Number(
                              product.stock_quantity ||
                                0
                            ).toLocaleString()}
                          </strong>{" "}
                          <span className="jesta-stock-unit">
                            {product.unit || ""}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`jesta-stock-badge ${stockStatus.className}`}
                          >
                            {stockStatus.label}
                          </span>
                        </td>

                        <td>
                          <div className="jesta-inventory-actions">
                            <button
                              type="button"
                              className="jesta-inventory-action edit"
                              title="Edit product"
                              onClick={() =>
                                openEditForm(
                                  product
                                )
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="jesta-inventory-action delete"
                              title="Remove product"
                              onClick={() =>
                                deleteProduct(
                                  product
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="jesta-inventory-modal-overlay">
          <div className="jesta-inventory-modal">
            <div className="jesta-inventory-modal-header">
              <div className="jesta-inventory-modal-title">
                <div className="jesta-inventory-modal-icon">
                  <Package size={21} />
                </div>

                <div>
                  <h2>
                    {editingProduct
                      ? "Edit Product"
                      : "Add Product"}
                  </h2>

                  <p>
                    {editingProduct
                      ? "Update the product information below."
                      : "Add a new product to your inventory."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="jesta-inventory-modal-close"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <div className="jesta-inventory-form">
                <div className="jesta-form-group full">
                  <label>
                    Product Name *
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Coca Cola 500ml"
                    required
                  />
                </div>

                <div className="jesta-form-group">
                  <label>SKU</label>

                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="e.g. COKE500"
                  />
                </div>

                <div className="jesta-form-group">
                  <label>Barcode</label>

                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    placeholder="Product barcode"
                  />
                </div>

                <div className="jesta-form-group">
                  <label>Category</label>

                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="jesta-form-group">
                  <label>Unit</label>

                  <input
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    placeholder="Piece"
                  />
                </div>

                <div className="jesta-form-group">
                  <label>
                    Buying Price *
                  </label>

                  <div className="jesta-input-prefix">
                    <span>KSh</span>

                    <input
                      name="buying_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.buying_price}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="jesta-form-group">
                  <label>
                    Selling Price *
                  </label>

                  <div className="jesta-input-prefix">
                    <span>KSh</span>

                    <input
                      name="selling_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.selling_price}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="jesta-form-group">
                  <label>
                    Opening Stock
                  </label>

                  <input
                    name="stock_quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.stock_quantity}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="jesta-form-group">
                  <label>
                    Minimum Stock
                  </label>

                  <input
                    name="minimum_stock"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minimum_stock}
                    onChange={handleChange}
                    placeholder="5"
                  />
                </div>

                <div className="jesta-form-group full">
                  <label>Description</label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Optional product description..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="jesta-inventory-modal-actions">
                <button
                  type="button"
                  className="jesta-btn jesta-inventory-cancel"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="jesta-btn jesta-inventory-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingProduct
                        ? "Update Product"
                        : "Save Product"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;