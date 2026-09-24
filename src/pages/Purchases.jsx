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
  Package,
  Truck,
  Wallet,
  Receipt,
  RefreshCw,
  AlertCircle,
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
  // PURCHASE STATISTICS
  // =========================
  const purchaseStats = useMemo(() => {
    const totalPurchases = purchases.length;

    const totalValue = purchases.reduce(
      (sum, purchase) =>
        sum + Number(purchase.total_amount || 0),
      0
    );

    const totalPaid = purchases.reduce(
      (sum, purchase) =>
        sum + Number(purchase.amount_paid || 0),
      0
    );

    const totalBalance = purchases.reduce(
      (sum, purchase) =>
        sum + Number(purchase.balance_due || 0),
      0
    );

    return {
      totalPurchases,
      totalValue,
      totalPaid,
      totalBalance,
    };
  }, [purchases]);

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
    return `KSh ${Number(value || 0).toLocaleString(
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
      <div className="jesta-purchases-page">
        <div className="jesta-loading">
          <div className="jesta-loading-spinner"></div>
          <h3>Loading purchases...</h3>
          <p>
            Please wait while we load your purchase
            data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="jesta-purchases-page">
      {/* =========================
          PAGE HEADER
      ========================= */}
      <div className="jesta-purchases-header">
        <div className="jesta-purchases-brand">
          <div className="jesta-purchases-brand-icon">
            <ShoppingCart size={23} />
          </div>

          <div>
            <div className="jesta-eyebrow">
              JESTA POS
            </div>

            <h2>Purchases</h2>

            <p>
              Manage stock purchases and suppliers
              efficiently.
            </p>
          </div>
        </div>

        <div className="jesta-purchases-header-actions">
          <button
            className="jesta-btn jesta-btn-secondary"
            onClick={loadData}
            title="Refresh purchases"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            className="jesta-btn jesta-btn-primary jesta-purchases-primary"
            onClick={openPurchaseForm}
          >
            <Plus size={18} />
            New Purchase
          </button>
        </div>
      </div>

      {/* =========================
          ALERTS
      ========================= */}
      {message && (
        <div className="jesta-alert jesta-alert-success">
          <CheckCircle size={19} />
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="jesta-alert jesta-alert-error">
          <AlertCircle size={19} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =========================
          PURCHASE STATISTICS
      ========================= */}
      <div className="jesta-purchases-stats">
        <div className="jesta-purchase-stat">
          <div className="jesta-purchase-stat-icon purchases">
            <Receipt size={21} />
          </div>

          <div>
            <span>Total Purchases</span>
            <strong>
              {purchaseStats.totalPurchases}
            </strong>
          </div>
        </div>

        <div className="jesta-purchase-stat">
          <div className="jesta-purchase-stat-icon value">
            <Package size={21} />
          </div>

          <div>
            <span>Purchase Value</span>
            <strong>
              {formatMoney(
                purchaseStats.totalValue
              )}
            </strong>
          </div>
        </div>

        <div className="jesta-purchase-stat">
          <div className="jesta-purchase-stat-icon paid">
            <Wallet size={21} />
          </div>

          <div>
            <span>Total Paid</span>
            <strong>
              {formatMoney(
                purchaseStats.totalPaid
              )}
            </strong>
          </div>
        </div>

        <div className="jesta-purchase-stat">
          <div className="jesta-purchase-stat-icon balance">
            <Truck size={21} />
          </div>

          <div>
            <span>Outstanding Balance</span>
            <strong>
              {formatMoney(
                purchaseStats.totalBalance
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* =========================
          PURCHASE HISTORY
      ========================= */}
      <section className="jesta-purchases-card">
        <div className="jesta-purchases-card-header">
          <div>
            <div className="jesta-section-label">
              TRANSACTIONS
            </div>

            <h3>Purchase History</h3>

            <p>
              Recently recorded stock purchases.
            </p>
          </div>

          <div className="jesta-purchases-count">
            {purchases.length} record
            {purchases.length !== 1 ? "s" : ""}
          </div>
        </div>

        {purchases.length === 0 ? (
          <div className="jesta-purchases-empty">
            <div className="jesta-purchases-empty-icon">
              <ShoppingCart size={30} />
            </div>

            <h3>No purchases yet</h3>

            <p>
              Your completed purchases will appear
              here.
            </p>

            <button
              className="jesta-btn jesta-btn-primary"
              onClick={openPurchaseForm}
            >
              <Plus size={17} />
              Record First Purchase
            </button>
          </div>
        ) : (
          <div className="jesta-purchases-table-wrapper">
            <table className="jesta-table jesta-purchases-table">
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
                      <div className="jesta-purchase-number">
                        <div className="jesta-purchase-number-icon">
                          <Receipt size={16} />
                        </div>

                        <strong>
                          {purchase.purchase_number}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <div className="jesta-supplier-cell">
                        <div className="jesta-supplier-avatar">
                          {(
                            purchase.suppliers
                              ?.name || "N"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span>
                          {purchase.suppliers?.name ||
                            "N/A"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="jesta-date">
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
                      </span>
                    </td>

                    <td>
                      <strong className="jesta-money">
                        {formatMoney(
                          purchase.total_amount
                        )}
                      </strong>
                    </td>

                    <td>
                      <span className="jesta-paid-amount">
                        {formatMoney(
                          purchase.amount_paid
                        )}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          Number(
                            purchase.balance_due || 0
                          ) > 0
                            ? "jesta-balance-due"
                            : "jesta-balance-cleared"
                        }
                      >
                        {formatMoney(
                          purchase.balance_due
                        )}
                      </span>
                    </td>

                    <td>
                      <span className="jesta-status-badge success">
                        <CheckCircle size={13} />
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
      <section className="jesta-purchases-card">
        <div className="jesta-purchases-card-header jesta-supplier-header">
          <div>
            <div className="jesta-section-label">
              SUPPLIER MANAGEMENT
            </div>

            <h3>Suppliers</h3>

            <p>
              Manage your active suppliers and
              outstanding balances.
            </p>
          </div>

          <button
            className="jesta-btn jesta-btn-primary"
            onClick={() => openSupplierForm()}
          >
            <UserPlus size={17} />
            Add Supplier
          </button>
        </div>

        <div className="jesta-purchases-toolbar">
          <div className="jesta-purchases-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search suppliers by name, phone or email..."
              value={supplierSearch}
              onChange={(event) =>
                setSupplierSearch(
                  event.target.value
                )
              }
            />

            {supplierSearch && (
              <button
                type="button"
                onClick={() => setSupplierSearch("")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="jesta-purchases-toolbar-info">
            {filteredSuppliers.length} supplier
            {filteredSuppliers.length !== 1
              ? "s"
              : ""}
          </div>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="jesta-purchases-empty supplier-empty">
            <div className="jesta-purchases-empty-icon">
              <Truck size={30} />
            </div>

            <h3>No suppliers found</h3>

            <p>
              Add your first supplier to begin
              recording purchases.
            </p>

            <button
              className="jesta-btn jesta-btn-primary"
              onClick={() => openSupplierForm()}
            >
              <UserPlus size={17} />
              Add Supplier
            </button>
          </div>
        ) : (
          <div className="jesta-purchases-table-wrapper">
            <table className="jesta-table jesta-suppliers-table">
              <thead>
                <tr>
                  <th>Supplier</th>
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
                        <div className="jesta-supplier-cell">
                          <div className="jesta-supplier-avatar large">
                            {supplier.name
                              ?.charAt(0)
                              .toUpperCase() || "S"}
                          </div>

                          <div className="jesta-supplier-details">
                            <strong>
                              {supplier.name}
                            </strong>

                            {supplier.tax_number && (
                              <small>
                                Tax No:{" "}
                                {supplier.tax_number}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {supplier.phone || "—"}
                      </td>

                      <td>
                        {supplier.email || "—"}
                      </td>

                      <td>
                        <span
                          className={
                            Number(
                              supplier.current_balance ||
                                0
                            ) > 0
                              ? "jesta-balance-due"
                              : "jesta-balance-cleared"
                          }
                        >
                          {formatMoney(
                            supplier.current_balance
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="jesta-purchases-actions">
                          <button
                            className="jesta-action-btn edit"
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
                            className="jesta-action-btn delete"
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
        <div className="jesta-modal-overlay">
          <div className="jesta-purchase-modal">
            <div className="jesta-purchase-modal-header">
              <div className="jesta-modal-heading">
                <div className="jesta-modal-heading-icon purchase">
                  <ShoppingCart size={22} />
                </div>

                <div>
                  <div className="jesta-section-label">
                    INVENTORY
                  </div>

                  <h3>New Purchase</h3>

                  <p>
                    Record stock received from a
                    supplier.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="jesta-modal-close"
                onClick={closePurchaseForm}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={completePurchase}
              className="jesta-purchase-form"
            >
              {/* PURCHASE DETAILS */}
              <div className="jesta-purchase-form-section">
                <div className="jesta-form-section-title">
                  <Receipt size={17} />
                  Purchase Details
                </div>

                <div className="jesta-form-grid">
                  <div className="jesta-form-group">
                    <label>
                      Purchase Number
                    </label>

                    <input
                      className="jesta-input"
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

                  <div className="jesta-form-group">
                    <label>Supplier</label>

                    <select
                      className="jesta-select"
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
              </div>

              {/* PRODUCT SEARCH */}
              <div className="jesta-purchase-form-section">
                <div className="jesta-form-section-title">
                  <Package size={17} />
                  Add Products
                </div>

                <div className="jesta-purchase-product-search">
                  <Search size={19} />

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

                  {productSearch && (
                    <button
                      type="button"
                      onClick={() =>
                        setProductSearch("")
                      }
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {productSearch && (
                  <div className="jesta-purchase-product-results">
                    {filteredProducts.length ===
                    0 ? (
                      <div className="jesta-search-empty">
                        <Package size={20} />
                        <span>
                          No products found.
                        </span>
                      </div>
                    ) : (
                      filteredProducts.map(
                        (product) => (
                          <button
                            type="button"
                            key={product.id}
                            className="jesta-purchase-product-result"
                            onClick={() =>
                              addProductToCart(
                                product
                              )
                            }
                          >
                            <div className="jesta-result-product-icon">
                              <Package size={17} />
                            </div>

                            <div className="jesta-result-product-info">
                              <strong>
                                {product.name}
                              </strong>

                              <span>
                                SKU:{" "}
                                {product.sku ||
                                  "N/A"}
                              </span>
                            </div>

                            <div className="jesta-result-product-stock">
                              <small>
                                Current Stock
                              </small>

                              <strong>
                                {product.stock_quantity ??
                                  0}
                              </strong>
                            </div>

                            <div className="jesta-result-add">
                              <Plus size={17} />
                            </div>
                          </button>
                        )
                      )
                    )}
                  </div>
                )}
              </div>

              {/* CART */}
              <div className="jesta-purchase-items">
                <div className="jesta-purchase-items-header">
                  <div>
                    <h4>Purchase Items</h4>

                    <p>
                      Products being received into
                      inventory.
                    </p>
                  </div>

                  <span>
                    {cart.length} item
                    {cart.length !== 1
                      ? "s"
                      : ""}
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="jesta-purchase-cart-empty">
                    <div>
                      <ShoppingCart size={27} />
                    </div>

                    <h4>No products added</h4>

                    <p>
                      Search above and add products
                      to this purchase.
                    </p>
                  </div>
                ) : (
                  <div className="jesta-purchase-items-wrapper">
                    <table className="jesta-table jesta-purchase-items-table">
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
                                <div className="jesta-cart-product">
                                  <div className="jesta-cart-product-icon">
                                    <Package
                                      size={16}
                                    />
                                  </div>

                                  <div>
                                    <strong>
                                      {item.name}
                                    </strong>

                                    <small>
                                      {item.sku ||
                                        "No SKU"}
                                    </small>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <input
                                  className="jesta-table-input"
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
                                <div className="jesta-cost-input">
                                  <span>KSh</span>

                                  <input
                                    className="jesta-table-input"
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
                                </div>
                              </td>

                              <td>
                                <strong className="jesta-item-total">
                                  {formatMoney(
                                    itemTotal
                                  )}
                                </strong>
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className="jesta-action-btn delete"
                                  title="Remove product"
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
              <div className="jesta-purchase-bottom">
                <div className="jesta-purchase-summary">
                  <div className="jesta-summary-row">
                    <span>Subtotal</span>

                    <strong>
                      {formatMoney(subtotal)}
                    </strong>
                  </div>

                  <div className="jesta-summary-divider"></div>

                  <div className="jesta-summary-row total">
                    <span>Total</span>

                    <strong>
                      {formatMoney(total)}
                    </strong>
                  </div>
                </div>

                <div className="jesta-payment-card">
                  <div className="jesta-payment-heading">
                    <Wallet size={17} />
                    Payment
                  </div>

                  <div className="jesta-form-group">
                    <label>
                      Amount Paid
                    </label>

                    <div className="jesta-money-input">
                      <span>KSh</span>

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
                  </div>

                  <div className="jesta-balance-box">
                    <span>Balance Due</span>

                    <strong>
                      {formatMoney(balance)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* NOTES */}
              <div className="jesta-form-group">
                <label>Notes</label>

                <textarea
                  className="jesta-textarea"
                  rows="3"
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Optional purchase notes..."
                />
              </div>

              {/* ACTIONS */}
              <div className="jesta-purchase-modal-actions">
                <button
                  type="button"
                  className="jesta-btn jesta-btn-secondary"
                  onClick={closePurchaseForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="jesta-btn jesta-btn-primary jesta-complete-purchase"
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
        <div className="jesta-modal-overlay">
          <div className="jesta-supplier-modal">
            <div className="jesta-purchase-modal-header">
              <div className="jesta-modal-heading">
                <div className="jesta-modal-heading-icon supplier">
                  <Truck size={22} />
                </div>

                <div>
                  <div className="jesta-section-label">
                    SUPPLIERS
                  </div>

                  <h3>
                    {editingSupplier
                      ? "Edit Supplier"
                      : "Add Supplier"}
                  </h3>

                  <p>
                    {editingSupplier
                      ? "Update supplier information."
                      : "Add a new supplier to your business."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="jesta-modal-close"
                onClick={closeSupplierForm}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveSupplier}
              className="jesta-supplier-form"
            >
              <div className="jesta-form-group">
                <label>
                  Supplier Name
                  <span>*</span>
                </label>

                <input
                  className="jesta-input"
                  type="text"
                  name="name"
                  value={supplierForm.name}
                  onChange={handleSupplierChange}
                  placeholder="e.g. Coca Cola Kenya"
                  required
                />
              </div>

              <div className="jesta-form-grid">
                <div className="jesta-form-group">
                  <label>Phone</label>

                  <input
                    className="jesta-input"
                    type="text"
                    name="phone"
                    value={supplierForm.phone}
                    onChange={handleSupplierChange}
                    placeholder="0700000000"
                  />
                </div>

                <div className="jesta-form-group">
                  <label>Email</label>

                  <input
                    className="jesta-input"
                    type="email"
                    name="email"
                    value={supplierForm.email}
                    onChange={handleSupplierChange}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>

              <div className="jesta-form-group">
                <label>Address</label>

                <input
                  className="jesta-input"
                  type="text"
                  name="address"
                  value={supplierForm.address}
                  onChange={handleSupplierChange}
                  placeholder="Supplier address"
                />
              </div>

              <div className="jesta-form-group">
                <label>Tax Number</label>

                <input
                  className="jesta-input"
                  type="text"
                  name="tax_number"
                  value={
                    supplierForm.tax_number
                  }
                  onChange={handleSupplierChange}
                  placeholder="Optional"
                />
              </div>

              <div className="jesta-supplier-modal-actions">
                <button
                  type="button"
                  className="jesta-btn jesta-btn-secondary"
                  onClick={closeSupplierForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="jesta-btn jesta-btn-primary"
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