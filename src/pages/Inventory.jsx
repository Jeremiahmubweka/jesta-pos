import { useEffect, useMemo, useState } from "react";

import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
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
  const [editingProduct, setEditingProduct] =
    useState(null);

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
      console.error(
        "Products loading error:",
        error
      );

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
      console.error(
        "Categories loading error:",
        error
      );

      setErrorMessage(
        `Could not load categories: ${error.message}`
      );

      return;
    }

    setCategories(data || []);
  }

  const filteredProducts = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      const name =
        product.name?.toLowerCase() || "";

      const sku =
        product.sku?.toLowerCase() || "";

      const barcode =
        product.barcode?.toLowerCase() || "";

      const category =
        product.categories?.name?.toLowerCase() ||
        "";

      return (
        name.includes(search) ||
        sku.includes(search) ||
        barcode.includes(search) ||
        category.includes(search)
      );
    });
  }, [products, searchTerm]);

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
      category_id:
        product.category_id
          ? String(product.category_id)
          : "",
      unit: product.unit || "Piece",
      buying_price:
        product.buying_price ?? "",
      selling_price:
        product.selling_price ?? "",
      stock_quantity:
        product.stock_quantity ?? "",
      minimum_stock:
        product.minimum_stock ?? "",
      description:
        product.description || "",
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
      setErrorMessage(
        "Product name is required."
      );

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

    /*
      Get the business belonging to the
      currently authenticated user.
    */
    const {
      data: businessId,
      error: businessError,
    } = await supabase.rpc(
      "get_my_business_id"
    );

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

      category_id:
        form.category_id
          ? Number(form.category_id)
          : null,

      unit:
        form.unit.trim() || "Piece",

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

      setMessage(
        "Product updated successfully."
      );
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

      setMessage(
        "Product created successfully."
      );
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

    setMessage(
      "Product removed successfully."
    );

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
        className: "stock-danger",
      };
    }

    if (stock <= minimum) {
      return {
        label: "Low stock",
        className: "stock-warning",
      };
    }

    return {
      label: "In stock",
      className: "stock-success",
    };
  }

  function formatMoney(value) {
    return `KES ${Number(value || 0).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Inventory</h2>

          <p>
            Manage your products, stock and pricing.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {message && (
        <div className="inventory-message success">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="inventory-message error">
          {errorMessage}
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
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
          className="secondary-button"
          onClick={() => {
            loadProducts();
            loadCategories();
          }}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="dashboard-card">
        <div className="inventory-card-header">
          <div>
            <h3>Products</h3>

            <p>
              {filteredProducts.length} product
              {filteredProducts.length !== 1
                ? "s"
                : ""}{" "}
              displayed
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state large">
            <RefreshCw
              size={42}
              className="loading-icon"
            />

            <h3>Loading inventory...</h3>

            <p>
              Getting your products from Supabase.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state large">
            <Package size={42} />

            <h3>
              {searchTerm
                ? "No products found"
                : "No products yet"}
            </h3>

            <p>
              {searchTerm
                ? "Try a different search."
                : "Add your first product to start managing inventory."}
            </p>

            {!searchTerm && (
              <button
                className="primary-button"
                onClick={openAddForm}
              >
                <Plus size={18} />
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
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
                          <div className="product-name-cell">
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
                        </td>

                        <td>
                          {product.sku || "—"}
                        </td>

                        <td>
                          {product.categories
                            ?.name || "Uncategorized"}
                        </td>

                        <td>
                          {formatMoney(
                            product.buying_price
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            product.selling_price
                          )}
                        </td>

                        <td>
                          {Number(
                            product.stock_quantity || 0
                          ).toLocaleString()}{" "}
                          {product.unit || ""}
                        </td>

                        <td>
                          <span
                            className={`stock-status ${stockStatus.className}`}
                          >
                            {stockStatus.label}
                          </span>
                        </td>

                        <td>
                          <div className="table-actions">
                            <button
                              className="icon-button edit"
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
                              className="icon-button delete"
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

      {showForm && (
        <div className="modal-overlay">
          <div className="product-modal">
            <div className="modal-header">
              <div>
                <h3>
                  {editingProduct
                    ? "Edit Product"
                    : "Add Product"}
                </h3>

                <p>
                  Enter the product details below.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <div className="form-grid">
                <div className="form-group full">
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

                <div className="form-group">
                  <label>SKU</label>

                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="e.g. COKE500"
                  />
                </div>

                <div className="form-group">
                  <label>Barcode</label>

                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    placeholder="Product barcode"
                  />
                </div>

                <div className="form-group">
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

                <div className="form-group">
                  <label>Unit</label>

                  <input
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    placeholder="Piece"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Buying Price *
                  </label>

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

                <div className="form-group">
                  <label>
                    Selling Price *
                  </label>

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

                <div className="form-group">
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

                <div className="form-group">
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

                <div className="form-group full">
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

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Save Product"}
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