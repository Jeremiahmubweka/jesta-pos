import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  X,
  RefreshCw,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");

  const [loading, setLoading] = useState(true);
  const [processingSale, setProcessingSale] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadSalesData();
  }, []);

  const loadSalesData = async () => {
    setLoading(true);
    setErrorMessage("");

    const [
      { data: productData, error: productError },
      { data: customerData, error: customerError },
    ] = await Promise.all([
      supabase
        .from("products")
        .select(`
          id,
          name,
          sku,
          barcode,
          selling_price,
          stock_quantity,
          minimum_stock,
          unit,
          category_id,
          categories (
            id,
            name
          )
        `)
        .eq("is_active", true)
        .order("name", { ascending: true }),

      supabase
        .from("customers")
        .select(`
          id,
          name,
          phone,
          current_balance
        `)
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (productError) {
      setErrorMessage(
        `Could not load products: ${productError.message}`
      );
    }

    if (customerError) {
      setErrorMessage(
        `Could not load customers: ${customerError.message}`
      );
    }

    setProducts(productData || []);
    setCustomers(customerData || []);

    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return products.slice(0, 20);
    }

    return products
      .filter((product) => {
        const name = product.name?.toLowerCase() || "";
        const sku = product.sku?.toLowerCase() || "";
        const barcode = product.barcode?.toLowerCase() || "";
        const category =
          product.categories?.name?.toLowerCase() || "";

        return (
          name.includes(term) ||
          sku.includes(term) ||
          barcode.includes(term) ||
          category.includes(term)
        );
      })
      .slice(0, 20);
  }, [products, searchTerm]);

  const addToCart = (product) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (Number(product.stock_quantity) <= 0) {
      setErrorMessage(
        `${product.name} is out of stock.`
      );
      return;
    }

    const existingItem = cart.find(
      (item) => item.id === product.id
    );

    if (existingItem) {
      if (
        existingItem.quantity + 1 >
        Number(product.stock_quantity)
      ) {
        setErrorMessage(
          `Only ${product.stock_quantity} ${product.unit || "units"} of ${product.name} are available.`
        );
        return;
      }

      setCart((currentCart) =>
        currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );

      return;
    }

    setCart((currentCart) => [
      ...currentCart,
      {
        id: product.id,
        name: product.name,
        sku: product.sku,
        selling_price: Number(product.selling_price) || 0,
        stock_quantity: Number(product.stock_quantity) || 0,
        unit: product.unit || "Piece",
        quantity: 1,
      },
    ]);
  };

  const increaseQuantity = (productId) => {
    setErrorMessage("");

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (item.quantity + 1 > item.stock_quantity) {
          setErrorMessage(
            `Only ${item.stock_quantity} ${item.unit} of ${item.name} are available.`
          );

          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  };

  const decreaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAmountPaid("");
    setCustomerId("");
    setSuccessMessage("");
    setErrorMessage("");
  };

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.selling_price) * Number(item.quantity),
      0
    );
  }, [cart]);

  const total = subtotal;

  const paid = Number(amountPaid) || 0;

  const balance = Math.max(total - paid, 0);

  const change = Math.max(paid - total, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
    }).format(Number(amount) || 0);
  };

  const generateSaleNumber = () => {
    const now = new Date();

    const datePart = now
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const timePart = now
      .toTimeString()
      .slice(0, 8)
      .replace(/:/g, "");

    const randomPart = Math.floor(
      100 + Math.random() * 900
    );

    return `SALE-${datePart}-${timePart}-${randomPart}`;
  };

  const completeSale = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setErrorMessage(
        "Please add at least one product to the cart."
      );
      return;
    }

    if (paid < 0) {
      setErrorMessage(
        "Amount paid cannot be negative."
      );
      return;
    }

    if (paid > total) {
      setErrorMessage(
        "Amount paid cannot be greater than the sale total."
      );
      return;
    }

    setProcessingSale(true);

    try {
      const {
        data: businessId,
        error: businessError,
      } = await supabase.rpc("get_my_business_id");

      if (businessError) {
        throw new Error(
          `Could not identify your business: ${businessError.message}`
        );
      }

      if (!businessId) {
        throw new Error(
          "Could not identify your business. Please log in again."
        );
      }

      const saleNumber = generateSaleNumber();

      const items = cart.map((item) => ({
        product_id: item.id,
        quantity: Number(item.quantity),
      }));

      const selectedCustomerId = customerId
        ? Number(customerId)
        : null;

      const {
        data: saleId,
        error: saleError,
      } = await supabase.rpc("complete_sale", {
        p_business_id: businessId,
        p_customer_id: selectedCustomerId,
        p_sale_number: saleNumber,
        p_items: items,
        p_amount_paid: paid,
        p_payment_method: paymentMethod,
        p_transaction_reference: null,
        p_tax_amount: 0,
        p_discount_amount: 0,
        p_notes: null,
      });

      if (saleError) {
        throw new Error(saleError.message);
      }

      setSuccessMessage(
        `Sale completed successfully. Sale number: ${saleNumber}`
      );

      setCart([]);
      setAmountPaid("");
      setCustomerId("");
      setSearchTerm("");

      await loadSalesData();

      console.log("Completed sale:", {
        saleId,
        saleNumber,
      });
    } catch (error) {
      setErrorMessage(
        error.message || "Could not complete sale."
      );
    } finally {
      setProcessingSale(false);
    }
  };

  const paymentOptions = [
    {
      value: "cash",
      label: "Cash",
      icon: Banknote,
    },
    {
      value: "mpesa",
      label: "M-Pesa",
      icon: Smartphone,
    },
    {
      value: "card",
      label: "Card",
      icon: CreditCard,
    },
    {
      value: "other",
      label: "Other",
      icon: CreditCard,
    },
  ];

  return (
    <div className="sales-page">
      <div className="page-heading">
        <div>
          <h2>Sales</h2>
          <p>
            Create sales, process payments and update
            inventory.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadSalesData}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {errorMessage && (
        <div className="alert alert-error">
          <X size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="sales-layout">
        {/* LEFT SIDE */}
        <section className="sales-products-panel">
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <h3>Select Products</h3>
                <p>
                  Search by name, SKU or barcode.
                </p>
              </div>
            </div>

            <div className="sales-search">
              <Search size={19} />

              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </div>

            {loading ? (
              <div className="sales-empty">
                <RefreshCw size={24} />
                <p>Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="sales-empty">
                <PackageIcon />
                <p>No products found.</p>
              </div>
            ) : (
              <div className="product-selection-grid">
                {filteredProducts.map((product) => {
                  const inCart = cart.find(
                    (item) => item.id === product.id
                  );

                  const available =
                    Number(product.stock_quantity) || 0;

                  const isOutOfStock =
                    available <= 0;

                  return (
                    <button
                      key={product.id}
                      className="product-sale-card"
                      onClick={() =>
                        addToCart(product)
                      }
                      disabled={isOutOfStock}
                    >
                      <div className="product-sale-icon">
                        <ShoppingCart size={21} />
                      </div>

                      <div className="product-sale-info">
                        <strong>{product.name}</strong>

                        <span>
                          {product.sku
                            ? `SKU: ${product.sku}`
                            : "No SKU"}
                        </span>

                        <small>
                          Stock: {available}{" "}
                          {product.unit || "Piece"}
                        </small>
                      </div>

                      <div className="product-sale-price">
                        <strong>
                          {formatCurrency(
                            product.selling_price
                          )}
                        </strong>

                        {inCart && (
                          <span>
                            {inCart.quantity} in cart
                          </span>
                        )}
                      </div>

                      {!isOutOfStock && (
                        <div className="add-product-icon">
                          <Plus size={17} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="sales-cart-panel">
          <div className="panel-card cart-card">
            <div className="panel-header">
              <div>
                <h3>Current Sale</h3>
                <p>
                  {cart.length} product
                  {cart.length === 1 ? "" : "s"} in cart
                </p>
              </div>

              {cart.length > 0 && (
                <button
                  className="text-danger-button"
                  onClick={clearCart}
                >
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <div className="cart-empty-icon">
                  <ShoppingCart size={30} />
                </div>

                <h4>Your cart is empty</h4>

                <p>
                  Search for a product and click it to
                  add it to the sale.
                </p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div
                      className="cart-item"
                      key={item.id}
                    >
                      <div className="cart-item-info">
                        <strong>{item.name}</strong>

                        <span>
                          {formatCurrency(
                            item.selling_price
                          )}{" "}
                          × {item.quantity}
                        </span>
                      </div>

                      <div className="quantity-controls">
                        <button
                          onClick={() =>
                            decreaseQuantity(item.id)
                          }
                        >
                          <Minus size={15} />
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          onClick={() =>
                            increaseQuantity(item.id)
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <strong className="cart-item-total">
                        {formatCurrency(
                          item.selling_price *
                            item.quantity
                        )}
                      </strong>

                      <button
                        className="remove-cart-item"
                        onClick={() =>
                          removeFromCart(item.id)
                        }
                        title="Remove item"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="sale-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>
                      {formatCurrency(subtotal)}
                    </strong>
                  </div>

                  <div>
                    <span>Tax</span>
                    <strong>
                      {formatCurrency(0)}
                    </strong>
                  </div>

                  <div className="sale-total">
                    <span>Total</span>
                    <strong>
                      {formatCurrency(total)}
                    </strong>
                  </div>
                </div>

                <div className="sale-form">
                  <label>
                    Customer
                    <select
                      value={customerId}
                      onChange={(event) =>
                        setCustomerId(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Walk-in Customer
                      </option>

                      {customers.map((customer) => (
                        <option
                          key={customer.id}
                          value={customer.id}
                        >
                          {customer.name}
                          {customer.phone
                            ? ` — ${customer.phone}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="payment-section">
                    <label>Payment Method</label>

                    <div className="payment-options">
                      {paymentOptions.map((option) => {
                        const Icon = option.icon;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={
                              paymentMethod ===
                              option.value
                                ? "payment-option active"
                                : "payment-option"
                            }
                            onClick={() =>
                              setPaymentMethod(
                                option.value
                              )
                            }
                          >
                            <Icon size={18} />
                            <span>
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label>
                    Amount Paid
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter amount paid"
                      value={amountPaid}
                      onChange={(event) =>
                        setAmountPaid(
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <div className="payment-result">
                    <div>
                      <span>Amount Due</span>
                      <strong>
                        {formatCurrency(total)}
                      </strong>
                    </div>

                    {change > 0 ? (
                      <div className="change-amount">
                        <span>Change</span>
                        <strong>
                          {formatCurrency(change)}
                        </strong>
                      </div>
                    ) : (
                      <div>
                        <span>Balance</span>
                        <strong>
                          {formatCurrency(balance)}
                        </strong>
                      </div>
                    )}
                  </div>

                  <button
                    className="complete-sale-button"
                    onClick={completeSale}
                    disabled={
                      processingSale ||
                      cart.length === 0
                    }
                  >
                    {processingSale ? (
                      <>
                        <RefreshCw
                          size={19}
                          className="spin"
                        />
                        Processing Sale...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={19} />
                        Complete Sale
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PackageIcon() {
  return (
    <div className="sales-empty-package">
      <ShoppingCart size={24} />
    </div>
  );
}

export default Sales;