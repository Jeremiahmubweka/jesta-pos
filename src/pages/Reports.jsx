import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Package,
  RefreshCw,
  Wallet,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Boxes,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function Reports() {
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);

  const [period, setPeriod] = useState("month");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
  }, [period]);

  async function getBusinessId() {
    const { data: businessId, error: businessError } =
      await supabase.rpc("get_my_business_id");

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

    return businessId;
  }

  function getDateRange(selectedPeriod) {
    const now = new Date();

    const start = new Date(now);
    const end = new Date(now);

    if (selectedPeriod === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    if (selectedPeriod === "week") {
      const day = start.getDay();
      const difference = day === 0 ? 6 : day - 1;

      start.setDate(start.getDate() - difference);
      start.setHours(0, 0, 0, 0);

      end.setHours(23, 59, 59, 999);
    }

    if (selectedPeriod === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    if (selectedPeriod === "year") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const businessId = await getBusinessId();

      const { start, end } = getDateRange(period);

      const [
        salesResult,
        saleItemsResult,
        expensesResult,
        paymentsResult,
        productsResult,
      ] = await Promise.all([
        supabase
          .from("sales")
          .select(`
            id,
            sale_number,
            sale_date,
            subtotal,
            tax_amount,
            discount_amount,
            total_amount,
            amount_paid,
            balance_due,
            payment_status,
            status,
            customer_id
          `)
          .eq("business_id", businessId)
          .gte("sale_date", start)
          .lte("sale_date", end)
          .order("sale_date", { ascending: false }),

        supabase
          .from("sale_items")
          .select(`
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            unit_cost,
            tax_amount,
            discount_amount,
            total_amount
          `)
          .eq("business_id", businessId),

        supabase
          .from("expenses")
          .select(`
            id,
            category_id,
            description,
            amount,
            payment_method,
            transaction_reference,
            expense_date,
            notes
          `)
          .eq("business_id", businessId)
          .gte("expense_date", start)
          .lte("expense_date", end)
          .order("expense_date", { ascending: false }),

        supabase
          .from("payments")
          .select(`
            id,
            sale_id,
            customer_id,
            amount,
            payment_method,
            transaction_reference,
            payment_date,
            notes
          `)
          .eq("business_id", businessId)
          .gte("payment_date", start)
          .lte("payment_date", end)
          .order("payment_date", { ascending: false }),

        supabase
          .from("products")
          .select(`
            id,
            name,
            sku,
            barcode,
            buying_price,
            selling_price,
            stock_quantity,
            minimum_stock,
            unit,
            is_active
          `)
          .eq("business_id", businessId)
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (salesResult.error) {
        throw new Error(
          `Could not load sales: ${salesResult.error.message}`
        );
      }

      if (saleItemsResult.error) {
        throw new Error(
          `Could not load sale items: ${saleItemsResult.error.message}`
        );
      }

      if (expensesResult.error) {
        throw new Error(
          `Could not load expenses: ${expensesResult.error.message}`
        );
      }

      if (paymentsResult.error) {
        throw new Error(
          `Could not load payments: ${paymentsResult.error.message}`
        );
      }

      if (productsResult.error) {
        throw new Error(
          `Could not load products: ${productsResult.error.message}`
        );
      }

      const salesData = salesResult.data || [];

      const saleIds = new Set(
        salesData.map((sale) => sale.id)
      );

      const filteredSaleItems =
        (saleItemsResult.data || []).filter((item) =>
          saleIds.has(item.sale_id)
        );

      setSales(salesData);
      setSaleItems(filteredSaleItems);
      setExpenses(expensesResult.data || []);
      setPayments(paymentsResult.data || []);
      setProducts(productsResult.data || []);
    } catch (err) {
      console.error("Error loading reports:", err);

      setError(
        err.message ||
          "Unable to load reports. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const totalSales = useMemo(() => {
    return sales.reduce(
      (total, sale) =>
        total + Number(sale.total_amount || 0),
      0
    );
  }, [sales]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  const totalCostOfGoods = useMemo(() => {
    return saleItems.reduce((total, item) => {
      const quantity = Number(item.quantity || 0);
      const unitCost = Number(item.unit_cost || 0);

      return total + quantity * unitCost;
    }, 0);
  }, [saleItems]);

  const grossProfit = useMemo(() => {
    return totalSales - totalCostOfGoods;
  }, [totalSales, totalCostOfGoods]);

  const netProfit = useMemo(() => {
    return grossProfit - totalExpenses;
  }, [grossProfit, totalExpenses]);

  const totalTransactions = sales.length;

  const totalItemsSold = useMemo(() => {
    return saleItems.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }, [saleItems]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((total, product) => {
      return (
        total +
        Number(product.stock_quantity || 0) *
          Number(product.buying_price || 0)
      );
    }, 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter((product) => {
      const stock = Number(product.stock_quantity || 0);
      const minimum = Number(product.minimum_stock || 0);

      return stock <= minimum;
    });
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((product) => {
      return Number(product.stock_quantity || 0) <= 0;
    });
  }, [products]);

  const paymentSummary = useMemo(() => {
    const summary = {
      cash: 0,
      mpesa: 0,
      card: 0,
      other: 0,
    };

    payments.forEach((payment) => {
      const method = String(
        payment.payment_method || "other"
      ).toLowerCase();

      const amount = Number(payment.amount || 0);

      if (method === "cash") {
        summary.cash += amount;
      } else if (method === "mpesa") {
        summary.mpesa += amount;
      } else if (method === "card") {
        summary.card += amount;
      } else {
        summary.other += amount;
      }
    });

    return summary;
  }, [payments]);

  const totalPayments = useMemo(() => {
    return Object.values(paymentSummary).reduce(
      (total, amount) => total + amount,
      0
    );
  }, [paymentSummary]);

  const averageSale = useMemo(() => {
    if (totalTransactions === 0) {
      return 0;
    }

    return totalSales / totalTransactions;
  }, [totalSales, totalTransactions]);

  const profitMargin = useMemo(() => {
    if (totalSales <= 0) {
      return 0;
    }

    return (netProfit / totalSales) * 100;
  }, [netProfit, totalSales]);

  function formatMoney(amount) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));
  }

  function formatDate(date) {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString(
      "en-KE",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  function getPeriodLabel() {
    if (period === "today") {
      return "Today";
    }

    if (period === "week") {
      return "This Week";
    }

    if (period === "year") {
      return "This Year";
    }

    return "This Month";
  }

  return (
    <div className="jesta-reports-page">
      {/* HEADER */}

      <div className="jesta-reports-header">
        <div className="jesta-reports-heading">
          <div className="jesta-reports-brand-icon">
            <BarChart3 size={24} />
          </div>

          <div>
            <span className="jesta-reports-eyebrow">
              BUSINESS INTELLIGENCE
            </span>

            <h1>Reports</h1>

            <p>
              Understand your business performance and financial position.
            </p>
          </div>
        </div>

        <div className="jesta-reports-controls">
          <div className="jesta-reports-period-control">
            <CalendarDays size={16} />

            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value)
              }
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <button
            className="jesta-reports-refresh"
            onClick={loadReports}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "spin" : ""}
            />

            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="jesta-reports-alert">
          <AlertCircle size={18} />

          <div>
            <strong>Unable to load reports</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* LOADING */}

      {loading ? (
        <div className="jesta-reports-loading">
          <div className="jesta-reports-loading-icon">
            <RefreshCw size={32} className="spin" />
          </div>

          <h3>Loading reports...</h3>

          <p>
            JESTA is calculating your business performance.
          </p>
        </div>
      ) : (
        <>
          {/* REPORT PERIOD */}

          <div className="jesta-reports-period-banner">
            <div className="jesta-reports-period-left">
              <div className="jesta-reports-period-icon">
                <Activity size={18} />
              </div>

              <div>
                <span>REPORTING PERIOD</span>
                <strong>{getPeriodLabel()}</strong>
              </div>
            </div>

            <div className="jesta-reports-period-meta">
              <span>
                {totalTransactions} transaction
                {totalTransactions === 1 ? "" : "s"}
              </span>

              <span>
                {totalItemsSold} item
                {totalItemsSold === 1 ? "" : "s"} sold
              </span>
            </div>
          </div>

          {/* FINANCIAL SUMMARY */}

          <div className="jesta-reports-section-heading">
            <div>
              <span>FINANCIAL PERFORMANCE</span>
              <h2>Financial Summary</h2>
            </div>
          </div>

          <div className="jesta-reports-financial-grid">
            <div className="jesta-report-stat sales">
              <div className="jesta-report-stat-top">
                <div className="jesta-report-stat-icon">
                  <ShoppingCart size={20} />
                </div>

                <ArrowUpRight size={17} />
              </div>

              <span>Total Sales</span>

              <strong>{formatMoney(totalSales)}</strong>

              <small>{getPeriodLabel()}</small>
            </div>

            <div className="jesta-report-stat expenses">
              <div className="jesta-report-stat-top">
                <div className="jesta-report-stat-icon">
                  <Receipt size={20} />
                </div>

                <ArrowDownRight size={17} />
              </div>

              <span>Total Expenses</span>

              <strong>{formatMoney(totalExpenses)}</strong>

              <small>{getPeriodLabel()}</small>
            </div>

            <div className="jesta-report-stat gross">
              <div className="jesta-report-stat-top">
                <div className="jesta-report-stat-icon">
                  <TrendingUp size={20} />
                </div>

                <ArrowUpRight size={17} />
              </div>

              <span>Gross Profit</span>

              <strong>{formatMoney(grossProfit)}</strong>

              <small>Sales minus product costs</small>
            </div>

            <div className="jesta-report-stat net">
              <div className="jesta-report-stat-top">
                <div className="jesta-report-stat-icon">
                  <Wallet size={20} />
                </div>

                <ArrowUpRight size={17} />
              </div>

              <span>Net Profit</span>

              <strong>{formatMoney(netProfit)}</strong>

              <small>After operating expenses</small>
            </div>
          </div>

          {/* OPERATING SUMMARY */}

          <div className="jesta-reports-section-heading">
            <div>
              <span>BUSINESS ACTIVITY</span>
              <h2>Operating Summary</h2>
            </div>
          </div>

          <div className="jesta-reports-operating-grid">
            <div className="jesta-report-mini-card">
              <div className="jesta-report-mini-icon blue">
                <BarChart3 size={19} />
              </div>

              <div>
                <span>Transactions</span>
                <strong>{totalTransactions}</strong>
                <small>Completed sales</small>
              </div>
            </div>

            <div className="jesta-report-mini-card">
              <div className="jesta-report-mini-icon teal">
                <Boxes size={19} />
              </div>

              <div>
                <span>Items Sold</span>
                <strong>{totalItemsSold}</strong>
                <small>Total units</small>
              </div>
            </div>

            <div className="jesta-report-mini-card">
              <div className="jesta-report-mini-icon amber">
                <Package size={19} />
              </div>

              <div>
                <span>Inventory Value</span>
                <strong>
                  {formatMoney(totalInventoryValue)}
                </strong>
                <small>At buying cost</small>
              </div>
            </div>

            <div className="jesta-report-mini-card">
              <div className="jesta-report-mini-icon green">
                <ShoppingCart size={19} />
              </div>

              <div>
                <span>Average Sale</span>
                <strong>
                  {formatMoney(averageSale)}
                </strong>
                <small>Per transaction</small>
              </div>
            </div>
          </div>

          {/* PROFIT MARGIN */}

          <div className="jesta-reports-profit-strip">
            <div className="jesta-reports-profit-info">
              <div className="jesta-reports-profit-icon">
                <TrendingUp size={19} />
              </div>

              <div>
                <span>NET PROFIT MARGIN</span>
                <strong>
                  {profitMargin.toFixed(1)}%
                </strong>
              </div>
            </div>

            <div className="jesta-reports-profit-track">
              <div
                className="jesta-reports-profit-fill"
                style={{
                  width: `${Math.min(
                    Math.max(profitMargin, 0),
                    100
                  )}%`,
                }}
              ></div>
            </div>

            <span className="jesta-reports-profit-value">
              {formatMoney(netProfit)}
            </span>
          </div>

          {/* PAYMENT + STOCK */}

          <div className="jesta-reports-two-column">
            {/* PAYMENT SUMMARY */}

            <section className="jesta-reports-card">
              <div className="jesta-reports-card-header">
                <div>
                  <span>PAYMENTS</span>

                  <h3>Payment Summary</h3>

                  <p>
                    Payments received during{" "}
                    {getPeriodLabel().toLowerCase()}.
                  </p>
                </div>

                <div className="jesta-reports-card-header-icon">
                  <Wallet size={19} />
                </div>
              </div>

              <div className="jesta-payment-list">
                <div className="jesta-payment-item">
                  <div className="jesta-payment-method">
                    <div className="cash">
                      <Banknote size={18} />
                    </div>

                    <span>Cash</span>
                  </div>

                  <strong>
                    {formatMoney(paymentSummary.cash)}
                  </strong>
                </div>

                <div className="jesta-payment-item">
                  <div className="jesta-payment-method">
                    <div className="mpesa">
                      <Smartphone size={18} />
                    </div>

                    <span>M-Pesa</span>
                  </div>

                  <strong>
                    {formatMoney(paymentSummary.mpesa)}
                  </strong>
                </div>

                <div className="jesta-payment-item">
                  <div className="jesta-payment-method">
                    <div className="card">
                      <CreditCard size={18} />
                    </div>

                    <span>Card</span>
                  </div>

                  <strong>
                    {formatMoney(paymentSummary.card)}
                  </strong>
                </div>

                <div className="jesta-payment-item">
                  <div className="jesta-payment-method">
                    <div className="other">
                      <Receipt size={18} />
                    </div>

                    <span>Other</span>
                  </div>

                  <strong>
                    {formatMoney(paymentSummary.other)}
                  </strong>
                </div>
              </div>

              <div className="jesta-payment-total">
                <span>Total Payments</span>

                <strong>
                  {formatMoney(totalPayments)}
                </strong>
              </div>
            </section>

            {/* STOCK ALERTS */}

            <section className="jesta-reports-card">
              <div className="jesta-reports-card-header">
                <div>
                  <span>INVENTORY</span>

                  <h3>Stock Alerts</h3>

                  <p>
                    Products at or below minimum stock.
                  </p>
                </div>

                <div className="jesta-stock-count">
                  {lowStockProducts.length}
                </div>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="jesta-reports-empty-small">
                  <div>
                    <Package size={25} />
                  </div>

                  <strong>Stock levels look good</strong>

                  <p>
                    All active products currently have sufficient stock.
                  </p>
                </div>
              ) : (
                <div className="jesta-stock-alert-list">
                  {lowStockProducts
                    .slice(0, 8)
                    .map((product) => {
                      const stock = Number(
                        product.stock_quantity || 0
                      );

                      const minimum = Number(
                        product.minimum_stock || 0
                      );

                      const isOutOfStock = stock <= 0;

                      return (
                        <div
                          className={`jesta-stock-alert ${
                            isOutOfStock
                              ? "out"
                              : "low"
                          }`}
                          key={product.id}
                        >
                          <div className="jesta-stock-alert-indicator">
                            <Package size={16} />
                          </div>

                          <div className="jesta-stock-alert-info">
                            <strong>
                              {product.name}
                            </strong>

                            <span>
                              {product.sku ||
                                "No SKU"}
                            </span>
                          </div>

                          <div className="jesta-stock-alert-values">
                            <strong>
                              {stock}
                            </strong>

                            <span>
                              / {minimum}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {outOfStockProducts.length > 0 && (
                <div className="jesta-out-stock-notice">
                  <AlertCircle size={15} />

                  <span>
                    {outOfStockProducts.length} product
                    {outOfStockProducts.length === 1
                      ? ""
                      : "s"} out of stock
                  </span>
                </div>
              )}
            </section>
          </div>

          {/* SALES TABLE */}

          <section className="jesta-reports-card jesta-reports-table-card">
            <div className="jesta-reports-card-header">
              <div>
                <span>SALES ACTIVITY</span>

                <h3>Recent Sales</h3>

                <p>
                  Sales recorded during{" "}
                  {getPeriodLabel().toLowerCase()}.
                </p>
              </div>

              <div className="jesta-reports-table-count">
                {sales.length} transaction
                {sales.length === 1 ? "" : "s"}
              </div>
            </div>

            {sales.length === 0 ? (
              <div className="jesta-reports-empty-table">
                <div>
                  <ShoppingCart size={27} />
                </div>

                <strong>No sales yet</strong>

                <p>
                  Sales made during this period will appear here.
                </p>
              </div>
            ) : (
              <div className="jesta-reports-table-wrapper">
                <table className="jesta-reports-table">
                  <thead>
                    <tr>
                      <th>Sale Number</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th className="align-right">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sales
                      .slice(0, 10)
                      .map((sale) => {
                        const salePayment =
                          payments.find(
                            (payment) =>
                              payment.sale_id ===
                              sale.id
                          );

                        return (
                          <tr key={sale.id}>
                            <td>
                              <div className="jesta-sale-number">
                                <div>
                                  <ShoppingCart
                                    size={14}
                                  />
                                </div>

                                <strong>
                                  {sale.sale_number}
                                </strong>
                              </div>
                            </td>

                            <td>
                              {formatDate(
                                sale.sale_date
                              )}
                            </td>

                            <td>
                              <span
                                className={`jesta-status-badge ${
                                  String(
                                    sale.status ||
                                      "Completed"
                                  ).toLowerCase() ===
                                  "completed"
                                    ? "success"
                                    : "neutral"
                                }`}
                              >
                                {sale.status ||
                                  "Completed"}
                              </span>
                            </td>

                            <td>
                              <span className="jesta-payment-text">
                                {salePayment
                                  ?.payment_method ||
                                  "-"}
                              </span>
                            </td>

                            <td className="align-right">
                              <strong>
                                {formatMoney(
                                  sale.total_amount
                                )}
                              </strong>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* EXPENSES TABLE */}

          <section className="jesta-reports-card jesta-reports-table-card">
            <div className="jesta-reports-card-header">
              <div>
                <span>OPERATING COSTS</span>

                <h3>Recent Expenses</h3>

                <p>
                  Expenses recorded during{" "}
                  {getPeriodLabel().toLowerCase()}.
                </p>
              </div>

              <div className="jesta-reports-table-count expenses-count">
                {expenses.length} expense
                {expenses.length === 1 ? "" : "s"}
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="jesta-reports-empty-table">
                <div className="expense-empty-icon">
                  <Receipt size={27} />
                </div>

                <strong>No expenses yet</strong>

                <p>
                  Expenses recorded during this period will appear here.
                </p>
              </div>
            ) : (
              <div className="jesta-reports-table-wrapper">
                <table className="jesta-reports-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Payment</th>
                      <th className="align-right">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {expenses
                      .slice(0, 10)
                      .map((expense) => (
                        <tr key={expense.id}>
                          <td>
                            <div className="jesta-expense-description">
                              <div>
                                <Receipt size={14} />
                              </div>

                              <strong>
                                {expense.description}
                              </strong>
                            </div>
                          </td>

                          <td>
                            {formatDate(
                              expense.expense_date
                            )}
                          </td>

                          <td>
                            <span className="jesta-payment-text">
                              {expense.payment_method ||
                                "-"}
                            </span>
                          </td>

                          <td className="align-right">
                            <strong className="jesta-expense-amount">
                              {formatMoney(
                                expense.amount
                              )}
                            </strong>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Reports;