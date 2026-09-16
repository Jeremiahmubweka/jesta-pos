import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  UserPlus,
  X,
  Trash2,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function Purchases() {
  // =========================
  // GENERAL STATE
  // =========================
  const [businessId, setBusinessId] = useState(null);

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================
  // PURCHASE STATE
  // =========================
  const [showPurchaseForm, setShowPurchaseForm] =
    useState(false);

  const [purchaseNumber, setPurchaseNumber] =
    useState("");

  const [selectedSupplier, setSelectedSupplier] =
    useState("");

  const [amountPaid, setAmountPaid] = useState("");

  const [notes, setNotes] = useState("");

  const [productSearch, setProductSearch] =
    useState("");

  const [cart, setCart] = useState([]);

  // =========================
  // SUPPLIER STATE
  // =========================
  const [showSupplierForm, setShowSupplierForm] =
    useState(false);

  const [editingSupplier, setEditingSupplier] =
    useState(null);

  const [supplierSearch, setSupplierSearch] =
    useState("");

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
  });

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: currentBusinessId,
        error: businessError,
      } = await supabase.rpc("get_my_business_id");

      if (businessError) {
        throw businessError;
      }

      if (!currentBusinessId) {
        throw new Error(
          "No business is connected to your account."
        );
      }

      setBusinessId(currentBusinessId);

      const [
        productsResult,
        suppliersResult,
        purchasesResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("business_id", currentBusinessId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("suppliers")
          .select("*")
          .eq("business_id", currentBusinessId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("purchases")
          .select(
            `
              *,
              suppliers (
                name
              )
            `
          )
          .eq("business_id", currentBusinessId)
          .order("created_at", {
            ascending: false,
          })
          .limit(50),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (suppliersResult.error) {
        throw suppliersResult.error;
      }

      if (purchasesResult.error) {
        throw purchasesResult.error;
      }

      setProducts(productsResult.data || []);
      setSuppliers(suppliersResult.data || []);
      setPurchases(purchasesResult.data || []);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to load purchase data."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // PURCHASE NUMBER
  // =========================
  const generatePurchaseNumber = () => {
    const now = new Date();

    const datePart = now
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const timePart = now
      .toTimeString()
      .slice(0, 8)
      .replace(/:/g, "");

    return `PUR-${datePart}-${timePart}`;
  };

  // =========================
  // OPEN PURCHASE FORM
  // =========================
  const openPurchaseForm = () => {
    setPurchaseNumber(generatePurchaseNumber());
    setSelectedSupplier("");
    setAmountPaid("");
    setNotes("");
    setProductSearch("");
    setCart([]);
    setError("");
    setMessage("");
    setShowPurchaseForm(true);
  };

  const closePurchaseForm = () => {
    if (saving) return;

    setShowPurchaseForm(false);
    setCart([]);
    setProductSearch("");
    setError("");
  };

  // =========================
  // PRODUCT SEARCH
  // =========================
  const filteredProducts = useMemo(() => {
    const search = productSearch
      .toLowerCase()
      .trim();

    if (!search) {
      return products.slice(0, 10);
    }

    return products
      .filter(
        (product) =>
          product.name
            ?.toLowerCase()
            .includes(search) ||
          product.sku
            ?.toLowerCase()
            .includes(search) ||
          product.barcode
            ?.toLowerCase()
            .includes(search)
      )
      .slice(0, 10);
  }, [products, productSearch]);

  // =========================
  // ADD PRODUCT TO CART
  // =========================
  const addProductToCart = (product) => {
    const existing = cart.find(
      (item) => item.product_id === product.id
    );

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: Number(item.quantity) + 1,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          quantity: 1,
          unit_cost: Number(product.buying_price || 0),
        },
      ]);
    }

    setProductSearch("");
  };

  // =========================
  // UPDATE CART ITEM
  // =========================
  const updateCartItem = (
    productId,
    field,
    value
  ) => {
    setCart(
      cart.map((item) => {
        if (item.product_id !== productId) {
          return item;
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  // =========================
  // REMOVE CART ITEM
  // =========================
  const removeCartItem = (productId) => {
    setCart(
      cart.filter(
        (item) => item.product_id !== productId
      )
    );
  };

  // =========================
  // PURCHASE TOTALS
  // =========================
  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      return (
        total +
        Number(item.quantity || 0) *
          Number(item.unit_cost || 0)
      );
    }, 0);
  }, [cart]);

  const total = subtotal;

  const paid = Number(amountPaid || 0);

  const balance = Math.max(total - paid, 0);

  // =========================
  // COMPLETE PURCHASE
  // =========================
  const completePurchase = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!businessId) {
      setError("Business information is missing.");
      return;
    }

    if (!selectedSupplier) {
      setError("Please select a supplier.");
      return;
    }

    if (!purchaseNumber.trim()) {
      setError("Purchase number is required.");
      return;
    }

    if (cart.length === 0) {
      setError(
        "Please add at least one product."
      );
      return;
    }

    for (const item of cart) {
      if (
        !Number(item.quantity) ||
        Number(item.quantity) <= 0
      ) {
        setError(
          `Enter a valid quantity for ${item.name}.`
        );
        return;
      }

      if (
        Number(item.unit_cost) < 0 ||
        Number.isNaN(Number(item.unit_cost))
      ) {
        setError(
          `Enter a valid buying price for ${item.name}.`
        );
        return;
      }
    }

    if (paid < 0) {
      setError(
        "Amount paid cannot be negative."
      );
      return;
    }

    setSaving(true);

    try {
      const purchaseItems = cart.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
      }));

      const { data, error: purchaseError } =
        await supabase.rpc("create_purchase", {
          p_business_id: businessId,
          p_supplier_id: Number(selectedSupplier),
          p_purchase_number:
            purchaseNumber.trim(),
          p_items: purchaseItems,
          p_amount_paid: paid,
          p_tax_amount: 0,
          p_discount_amount: 0,
          p_notes: notes.trim() || null,
        });

      if (purchaseError) {
        throw purchaseError;
      }

      setMessage(
        `Purchase completed successfully. Purchase ID: ${data}`
      );

      setShowPurchaseForm(false);
      setCart([]);

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to complete purchase."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // SUPPLIER FORM
  // =========================
  const openSupplierForm = (
    supplier = null
  ) => {
    setEditingSupplier(supplier);

    if (supplier) {
      setSupplierForm({
        name: supplier.name || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        tax_number: supplier.tax_number || "",
      });
    } else {
      setSupplierForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        tax_number: "",
      });
    }

    setError("");
    setMessage("");
    setShowSupplierForm(true);
  };

  const closeSupplierForm = () => {
    if (saving) return;

    setShowSupplierForm(false);
    setEditingSupplier(null);
  };

  const handleSupplierChange = (event) => {
    const { name, value } = event.target;

    setSupplierForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================
  // SAVE SUPPLIER
  // =========================
  const saveSupplier = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!supplierForm.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    if (!businessId) {
      setError("Business information is missing.");
      return;
    }

    setSaving(true);

    try {
      const supplierData = {
        name: supplierForm.name.trim(),
        phone:
          supplierForm.phone.trim() || null,
        email:
          supplierForm.email.trim() || null,
        address:
          supplierForm.address.trim() || null,
        tax_number:
          supplierForm.tax_number.trim() || null,
      };

      if (editingSupplier) {
        const { error: updateError } =
          await supabase
            .from("suppliers")
            .update(supplierData)
            .eq("id", editingSupplier.id)
            .eq("business_id", businessId);

        if (updateError) {
          throw updateError;
        }

        setMessage(
          "Supplier updated successfully."
        );
      } else {
        const { error: insertError } =
          await supabase
            .from("suppliers")
            .insert({
              ...supplierData,
              business_id: businessId,
              current_balance: 0,
              is_active: true,
            });

        if (insertError) {
          throw insertError;
        }

        setMessage(
          "Supplier added successfully."
        );
      }

      setShowSupplierForm(false);
      setEditingSupplier(null);

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to save supplier."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DEACTIVATE SUPPLIER
  // =========================
  const deactivateSupplier = async (
    supplier
  ) => {
    const confirmed = window.confirm(
      `Deactivate ${supplier.name}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const { error: updateError } =
        await supabase
          .from("suppliers")
          .update({
            is_active: false,
          })
          .eq("id", supplier.id)
          .eq("business_id", businessId);

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "Supplier deactivated successfully."
      );

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to deactivate supplier."
      );
    }
  };

  // =========================
  // SUPPLIER SEARCH
  // =========================
  const filteredSuppliers = useMemo(() => {
    const search = supplierSearch
      .toLowerCase()
      .trim();

    if (!search) {
      return suppliers;
    }

    return suppliers.filter(
      (supplier) =>
        supplier.name
          ?.toLowerCase()
          .includes(search) ||
        supplier.phone
          ?.toLowerCase()
          .includes(search) ||
        supplier.email
          ?.toLowerCase()
          .includes(search)
    );
  }, [suppliers, supplierSearch]);

  // =========================
  // FORMAT MONEY
  // =========================
  const formatMoney = (value) => {
    return `KES ${Number(value || 0).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Loading purchases...</h3>
          <p>
            Please wait while we load your
            purchase data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container purchases-page">
      {/* =========================
          PAGE HEADER
      ========================= */}
      <div className="page-header">
        <div>
          <h2>Purchases</h2>
          <p>
            Manage stock purchases and suppliers.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openPurchaseForm}
        >
          <Plus size={18} />
          New Purchase
        </button>
      </div>

      {/* =========================
          ALERTS
      ========================= */}
      {message && (
        <div className="success-alert">
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="error-alert">
          <span>{error}</span>
        </div>
      )}

      {/* =========================
          PURCHASE HISTORY
      ========================= */}
      <section className="content-card">
        <div className="section-heading">
          <div>
            <h3>Purchase History</h3>
            <p>
              Recently recorded stock purchases.
            </p>
          </div>
        </div>

        {purchases.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={40} />
            <h3>No purchases yet</h3>
            <p>
              Your completed purchases will appear
              here.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Purchase No.</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>
                      <strong>
                        {purchase.purchase_number}
                      </strong>
                    </td>

                    <td>
                      {purchase.suppliers?.name ||
                        "N/A"}
                    </td>

                    <td>
                      {purchase.purchase_date
                        ? new Date(
                            purchase.purchase_date
                          ).toLocaleDateString(
                            "en-KE"
                          )
                        : new Date(
                            purchase.created_at
                          ).toLocaleDateString(
                            "en-KE"
                          )}
                    </td>

                    <td>
                      {formatMoney(
                        purchase.total_amount
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        purchase.amount_paid
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        purchase.balance_due
                      )}
                    </td>

                    <td>
                      <span className="status-badge success">
                        {purchase.status ||
                          "received"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =========================
          SUPPLIERS
      ========================= */}
      <section className="content-card">
        <div className="section-heading">
          <div>
            <h3>Suppliers</h3>
            <p>
              Manage your active suppliers.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={() =>
              openSupplierForm()
            }
          >
            <UserPlus size={17} />
            Add Supplier
          </button>
        </div>

        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search suppliers..."
            value={supplierSearch}
            onChange={(event) =>
              setSupplierSearch(
                event.target.value
              )
            }
          />
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="empty-state">
            <h3>No suppliers found</h3>
            <p>
              Add your first supplier to begin
              recording purchases.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredSuppliers.map(
                  (supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <strong>
                          {supplier.name}
                        </strong>
                      </td>

                      <td>
                        {supplier.phone || "—"}
                      </td>

                      <td>
                        {supplier.email || "—"}
                      </td>

                      <td>
                        {formatMoney(
                          supplier.current_balance
                        )}
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            className="icon-button"
                            title="Edit supplier"
                            onClick={() =>
                              openSupplierForm(
                                supplier
                              )
                            }
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            className="icon-button danger"
                            title="Deactivate supplier"
                            onClick={() =>
                              deactivateSupplier(
                                supplier
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =========================
          PURCHASE MODAL
      ========================= */}
      {showPurchaseForm && (
        <div className="modal-overlay">
          <div className="modal-card purchase-modal">
            <div className="modal-header">
              <div>
                <h3>New Purchase</h3>
                <p>
                  Record stock received from a
                  supplier.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closePurchaseForm}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={completePurchase}
              className="modal-form"
            >
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Purchase Number
                  </label>

                  <input
                    type="text"
                    value={purchaseNumber}
                    onChange={(event) =>
                      setPurchaseNumber(
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Supplier</label>

                  <select
                    value={selectedSupplier}
                    onChange={(event) =>
                      setSelectedSupplier(
                        event.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select supplier
                    </option>

                    {suppliers.map(
                      (supplier) => (
                        <option
                          key={supplier.id}
                          value={supplier.id}
                        >
                          {supplier.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* PRODUCT SEARCH */}
              <div className="form-group">
                <label>
                  Add Products
                </label>

                <div className="product-search">
                  <Search size={18} />

                  <input
                    type="text"
                    placeholder="Search product by name, SKU or barcode..."
                    value={productSearch}
                    onChange={(event) =>
                      setProductSearch(
                        event.target.value
                      )
                    }
                  />
                </div>

                {productSearch && (
                  <div className="product-results">
                    {filteredProducts.length ===
                    0 ? (
                      <div className="search-empty">
                        No products found.
                      </div>
                    ) : (
                      filteredProducts.map(
                        (product) => (
                          <button
                            type="button"
                            key={product.id}
                            className="product-result"
                            onClick={() =>
                              addProductToCart(
                                product
                              )
                            }
                          >
                            <div>
                              <strong>
                                {product.name}
                              </strong>

                              <span>
                                SKU:{" "}
                                {product.sku ||
                                  "N/A"}
                              </span>
                            </div>

                            <span>
                              Stock:{" "}
                              {
                                product.stock_quantity
                              }
                            </span>
                          </button>
                        )
                      )
                    )}
                  </div>
                )}
              </div>

              {/* CART */}
              <div className="purchase-items">
                <div className="cart-heading">
                  <h4>Purchase Items</h4>

                  <span>
                    {cart.length} item
                    {cart.length !== 1
                      ? "s"
                      : ""}
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="cart-empty">
                    <ShoppingCart size={32} />
                    <p>
                      Search and add products to
                      this purchase.
                    </p>
                  </div>
                ) : (
                  <div className="purchase-table-wrapper">
                    <table className="data-table purchase-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Buying Price</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>

                      <tbody>
                        {cart.map((item) => {
                          const itemTotal =
                            Number(
                              item.quantity || 0
                            ) *
                            Number(
                              item.unit_cost || 0
                            );

                          return (
                            <tr
                              key={
                                item.product_id
                              }
                            >
                              <td>
                                <strong>
                                  {item.name}
                                </strong>

                                <small>
                                  {item.sku ||
                                    "No SKU"}
                                </small>
                              </td>

                              <td>
                                <input
                                  className="table-input"
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateCartItem(
                                      item.product_id,
                                      "quantity",
                                      event.target
                                        .value
                                    )
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  className="table-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.unit_cost
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateCartItem(
                                      item.product_id,
                                      "unit_cost",
                                      event.target
                                        .value
                                    )
                                  }
                                />
                              </td>

                              <td>
                                <strong>
                                  {formatMoney(
                                    itemTotal
                                  )}
                                </strong>
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className="icon-button danger"
                                  onClick={() =>
                                    removeCartItem(
                                      item.product_id
                                    )
                                  }
                                >
                                  <Trash2
                                    size={16}
                                  />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TOTALS */}
              <div className="purchase-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    {formatMoney(subtotal)}
                  </strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong className="summary-total">
                    {formatMoney(total)}
                  </strong>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Amount Paid
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(event) =>
                      setAmountPaid(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Balance Due
                  </label>

                  <input
                    type="text"
                    value={formatMoney(balance)}
                    readOnly
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  Notes
                </label>

                <textarea
                  rows="3"
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Optional purchase notes..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closePurchaseForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  <CheckCircle size={18} />

                  {saving
                    ? "Completing..."
                    : "Complete Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          SUPPLIER MODAL
      ========================= */}
      {showSupplierForm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3>
                  {editingSupplier
                    ? "Edit Supplier"
                    : "Add Supplier"}
                </h3>

                <p>
                  Enter supplier information below.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeSupplierForm}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveSupplier}
              className="modal-form"
            >
              <div className="form-group">
                <label>
                  Supplier Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={supplierForm.name}
                  onChange={handleSupplierChange}
                  placeholder="e.g. Coca Cola Kenya"
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Phone
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={supplierForm.phone}
                    onChange={handleSupplierChange}
                    placeholder="0700000000"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={supplierForm.email}
                    onChange={handleSupplierChange}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  Address
                </label>

                <input
                  type="text"
                  name="address"
                  value={supplierForm.address}
                  onChange={handleSupplierChange}
                  placeholder="Supplier address"
                />
              </div>

              <div className="form-group">
                <label>
                  Tax Number
                </label>

                <input
                  type="text"
                  name="tax_number"
                  value={
                    supplierForm.tax_number
                  }
                  onChange={handleSupplierChange}
                  placeholder="Optional"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeSupplierForm}
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
                    : editingSupplier
                    ? "Update Supplier"
                    : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Purchases;