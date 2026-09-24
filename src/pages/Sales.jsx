import { useEffect, useMemo, useRef, useState } from "react";
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
  ScanBarcode,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import Receipt from "../components/Receipt";

function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionReference, setTransactionReference] = useState("");

  const [loading, setLoading] = useState(true);
  const [processingSale, setProcessingSale] = useState(false);
  const [scanningBarcode, setScanningBarcode] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [completedSale, setCompletedSale] = useState(null);

  const barcodeInputRef = useRef(null);

  const formatCurrency = (amount) => {
    return `KSh ${Number(amount || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const loadSalesData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [productsResult, customersResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true }),

        supabase
          .from("customers")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (customersResult.error) {
        throw customersResult.error;
      }

      setProducts(productsResult.data || []);
      setCustomers(customersResult.data || []);
    } catch (error) {
      console.error("Error loading sales data:", error);
      setErrorMessage(error.message || "Failed to load sales data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 300);
  }, []);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const sku = String(product.sku || "").toLowerCase();
      const barcode = String(product.barcode || "").toLowerCase();

      return (
        name.includes(search) ||
        sku.includes(search) ||
        barcode.includes(search)
      );
    });
  }, [products, searchTerm]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.selling_price || 0) * Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const tax = 0;
  const discount = 0;

  const total = Math.max(subtotal + tax - discount, 0);

  const paid = Number(amountPaid) || 0;

  const change = Math.max(paid - total, 0);

  const balance = Math.max(total - paid, 0);

  const addToCart = (product) => {
    setErrorMessage("");
    setSuccessMessage("");

    const stock = Number(product.stock_quantity || 0);

    if (stock <= 0) {
      setErrorMessage(`${product.name} is out of stock.`);
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        if (existingItem.quantity >= stock) {
          setErrorMessage(
            `Only ${stock} unit${stock === 1 ? "" : "s"} of ${product.name} available.`
          );

          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  const handleBarcodeScan = async (event) => {
    event.preventDefault();

    const barcode = barcodeInput.trim();

    if (!barcode) {
      return;
    }

    try {
      setScanningBarcode(true);
      setErrorMessage("");
      setSuccessMessage("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("barcode", barcode)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setErrorMessage(`No active product found for barcode: ${barcode}`);
        return;
      }

      addToCart(data);
      setBarcodeInput("");
    } catch (error) {
      console.error("Barcode scan error:", error);
      setErrorMessage(error.message || "Failed to scan barcode.");
    } finally {
      setScanningBarcode(false);

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  };

  const updateQuantity = (productId, changeAmount) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          const stock = Number(item.stock_quantity || 0);

          const newQuantity = item.quantity + changeAmount;

          if (newQuantity <= 0) {
            return null;
          }

          if (newQuantity > stock) {
            setErrorMessage(
              `Only ${stock} unit${stock === 1 ? "" : "s"} of ${item.name} available.`
            );

            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  const clearCart = () => {
    setCart([]);
    setAmountPaid("");
    setSelectedCustomer("");
    setTransactionReference("");
    setPaymentMethod("cash");
    setErrorMessage("");
    setSuccessMessage("");

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleCompleteSale = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setErrorMessage("Please add at least one product to the cart.");
      return;
    }

    if (total <= 0) {
      setErrorMessage("Sale total must be greater than zero.");
      return;
    }

    if (paid < total) {
      setErrorMessage(
        `Insufficient payment. Customer still owes ${formatCurrency(
          total - paid
        )}.`
      );
      return;
    }

    try {
      setProcessingSale(true);

      const { data: businessId, error: businessError } =
        await supabase.rpc("get_my_business_id");

      if (businessError) {
        throw businessError;
      }

      if (!businessId) {
        throw new Error(
          "No business is associated with the current user."
        );
      }

      const saleNumber = `SALE-${Date.now()}`;

      const saleItems = cart.map((item) => ({
        product_id: item.id,
        quantity: Number(item.quantity),
      }));

      const customerName =
        customers.find(
          (customer) => String(customer.id) === String(selectedCustomer)
        )?.name || "Walk-in Customer";

      const { data: saleResult, error: saleError } = await supabase.rpc(
        "complete_sale",
        {
          p_business_id: businessId,
          p_customer_id: selectedCustomer
            ? Number(selectedCustomer)
            : null,
          p_sale_number: saleNumber,
          p_items: saleItems,
          p_amount_paid: paid,
          p_payment_method: paymentMethod,
          p_transaction_reference:
            transactionReference.trim() || null,
          p_tax_amount: tax,
          p_discount_amount: discount,
          p_notes: null,
        }
      );

      if (saleError) {
        throw saleError;
      }

      const saleId =
        typeof saleResult === "object" && saleResult !== null
          ? saleResult.id || saleResult.sale_id || null
          : saleResult;

      const receiptSale = {
        id: saleId,
        sale_number: saleNumber,
        created_at: new Date().toISOString(),
        customer_name: customerName,
        subtotal,
        tax_amount: tax,
        discount_amount: discount,
        total_amount: total,
        amount_paid: paid,
        change_amount: change,
        balance_amount: balance,
        payment_method: paymentMethod,
        transaction_reference:
          transactionReference.trim() || null,
        items: cart.map((item) => ({
          ...item,
          line_total:
            Number(item.selling_price || 0) *
            Number(item.quantity || 0),
        })),
      };

      setCompletedSale(receiptSale);

      setSuccessMessage(
        `Sale ${saleNumber} completed successfully.`
      );

      setCart([]);
      setAmountPaid("");
      setSelectedCustomer("");
      setTransactionReference("");
      setPaymentMethod("cash");

      await loadSalesData();

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 200);
    } catch (error) {
      console.error("Complete sale error:", error);
      setErrorMessage(error.message || "Failed to complete sale.");
    } finally {
      setProcessingSale(false);
    }
  };

  if (loading) {
    return (
      <div className="jesta-sales-page">
        <div className="jesta-loading">
          <RefreshCw className="animate-spin" size={24} />
          <span>Loading sales workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="jesta-sales-page">
      <div className="jesta-sales-header mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="jesta-sales-brand mb-1 text-sm font-semibold uppercase tracking-wider">
              JESTA POS
            </div>

            <h1 className="text-2xl font-bold">
              Sales
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Create sales, process payments and manage your customer
              transactions.
            </p>
          </div>

          <div className="jesta-sales-cart-count flex items-center gap-2 rounded-lg px-4 py-3">
            <ShoppingCart size={20} />

            <span className="text-sm font-medium">
              {cart.length} item{cart.length === 1 ? "" : "s"} in cart
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <X size={18} className="mt-0.5 shrink-0" />

          <div className="flex-1">
            {errorMessage}
          </div>

          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle size={18} className="mt-0.5 shrink-0" />

          <div className="flex-1">
            {successMessage}
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {completedSale && (
        <div className="jesta-receipt-section mb-6 rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Sale Completed
              </h2>

              <p className="text-sm text-slate-600">
                Receipt is ready for printing.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCompletedSale(null)}
              className="rounded-lg p-2 text-slate-500 hover:bg-white"
            >
              <X size={18} />
            </button>
          </div>

          <Receipt sale={completedSale} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="jesta-sales-section overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
                <ShoppingCart size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Products
                </h2>

                <p className="text-sm text-slate-500">
                  Select products or scan a barcode.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleBarcodeScan}
              className="mb-4 flex gap-2"
            >
              <div className="relative flex-1">
                <ScanBarcode
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(event) =>
                    setBarcodeInput(event.target.value)
                  }
                  placeholder="Scan or enter barcode..."
                  className="jesta-input w-full pl-10"
                />
              </div>

              <button
                type="submit"
                disabled={scanningBarcode || !barcodeInput.trim()}
                className="jesta-btn jesta-sales-primary"
              >
                {scanningBarcode ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <ScanBarcode size={18} />
                )}

                <span className="hidden sm:inline">
                  Scan
                </span>
              </button>
            </form>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search products by name, SKU or barcode..."
                className="jesta-sales-search w-full rounded-lg py-3 pl-10 pr-4 outline-none"
              />
            </div>
          </div>

          <div className="p-5">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center">
                <PackageIconFallback />

                <h3 className="mt-3 font-medium text-slate-900">
                  No products found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try a different search term.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const stock = Number(
                    product.stock_quantity || 0
                  );

                  const lowStock =
                    stock > 0 && stock <= 5;

                  const outOfStock = stock <= 0;

                  return (
                    <div
                      key={product.id}
                      className="jesta-product p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="jesta-product-icon flex h-11 w-11 items-center justify-center rounded-lg">
                          <ShoppingCart size={20} />
                        </div>

                        {outOfStock ? (
                          <span className="jesta-stock-out rounded-full px-2 py-1 text-xs font-semibold">
                            Out of stock
                          </span>
                        ) : lowStock ? (
                          <span className="jesta-stock-low rounded-full px-2 py-1 text-xs font-semibold">
                            Low stock
                          </span>
                        ) : (
                          <span className="jesta-stock-good rounded-full px-2 py-1 text-xs font-semibold">
                            {stock} in stock
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <h3 className="line-clamp-2 min-h-[48px] font-semibold text-slate-900">
                          {product.name}
                        </h3>

                        {product.sku && (
                          <p className="mt-1 text-xs text-slate-500">
                            SKU: {product.sku}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="jesta-product-price text-lg font-bold">
                            {formatCurrency(
                              product.selling_price
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              addToCart(product)
                            }
                            disabled={outOfStock}
                            className="jesta-product-add flex h-9 w-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40"
                            title="Add to cart"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="jesta-cart-panel flex min-h-[600px] flex-col overflow-hidden bg-white">
          <div className="jesta-cart-header p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Current Sale
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  {cart.length} product
                  {cart.length === 1 ? "" : "s"}
                </p>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                  <ShoppingCart size={30} />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  Cart is empty
                </h3>

                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  Add products from the product list to start a
                  new sale.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => {
                  const lineTotal =
                    Number(item.selling_price || 0) *
                    Number(item.quantity || 0);

                  return (
                    <div
                      key={item.id}
                      className="jesta-cart-item p-3"
                    >
                      <div className="flex gap-3">
                        <div className="jesta-product-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                          <ShoppingCart size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                                {item.name}
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatCurrency(
                                  item.selling_price
                                )}{" "}
                                each
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeFromCart(item.id)
                              }
                              className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    -1
                                  )
                                }
                                className="p-2 text-slate-500 hover:text-slate-900"
                              >
                                <Minus size={14} />
                              </button>

                              <span className="min-w-[32px] text-center text-sm font-semibold">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    1
                                  )
                                }
                                className="p-2 text-slate-500 hover:text-slate-900"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <span className="text-sm font-bold text-slate-900">
                              {formatCurrency(lineTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>

                <span className="font-medium">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Tax</span>

                <span className="font-medium">
                  {formatCurrency(tax)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Discount</span>

                <span className="font-medium">
                  {formatCurrency(discount)}
                </span>
              </div>
            </div>

            <div className="jesta-total-box mt-4 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">
                  Total
                </span>

                <span className="jesta-total-value text-2xl font-bold">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <User size={16} />
                Customer
              </label>

              <select
                value={selectedCustomer}
                onChange={(event) =>
                  setSelectedCustomer(event.target.value)
                }
                className="jesta-select w-full"
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
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Payment Method
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`jesta-payment-method flex flex-col items-center gap-1 rounded-lg p-3 text-xs font-medium ${
                    paymentMethod === "cash"
                      ? "active"
                      : ""
                  }`}
                >
                  <Banknote size={19} />
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("mpesa")}
                  className={`jesta-payment-method flex flex-col items-center gap-1 rounded-lg p-3 text-xs font-medium ${
                    paymentMethod === "mpesa"
                      ? "active"
                      : ""
                  }`}
                >
                  <Smartphone size={19} />
                  M-Pesa
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`jesta-payment-method flex flex-col items-center gap-1 rounded-lg p-3 text-xs font-medium ${
                    paymentMethod === "card"
                      ? "active"
                      : ""
                  }`}
                >
                  <CreditCard size={19} />
                  Card
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Transaction Reference
              </label>

              <input
                type="text"
                value={transactionReference}
                onChange={(event) =>
                  setTransactionReference(event.target.value)
                }
                placeholder={
                  paymentMethod === "mpesa"
                    ? "M-Pesa transaction code"
                    : "Optional reference"
                }
                className="jesta-input w-full"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Amount Paid
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(event) =>
                  setAmountPaid(event.target.value)
                }
                placeholder="Enter amount paid"
                className="jesta-input w-full text-lg font-semibold"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs font-medium text-green-700">
                  Change
                </p>

                <p className="mt-1 text-base font-bold text-green-800">
                  {formatCurrency(change)}
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-700">
                  Balance
                </p>

                <p className="mt-1 text-base font-bold text-amber-800">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={
                  processingSale ||
                  cart.length === 0 ||
                  paid < total
                }
                className="jesta-complete-sale jesta-btn justify-center sm:col-span-1"
              >
                {processingSale ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle size={18} />
                )}

                {processingSale
                  ? "Processing..."
                  : "Complete Sale"}
              </button>

              <button
                type="button"
                onClick={clearCart}
                disabled={processingSale || cart.length === 0}
                className="jesta-btn justify-center border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={18} />
                Clear Cart
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PackageIconFallback() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <ShoppingCart size={26} />
    </div>
  );
}

export default Sales;