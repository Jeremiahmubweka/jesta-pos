import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  X,
  Trash2,
  Loader2,
  Wallet,
  CalendarDays,
  RefreshCw,
  CreditCard,
  TrendingDown,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    category_id: "",
    description: "",
    amount: "",
    payment_method: "Cash",
    transaction_reference: "",
    expense_date: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // GET BUSINESS ID
  // =========================
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

  // =========================
  // LOAD DATA
  // =========================
  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const businessId = await getBusinessId();

      const expenseResult = await supabase
        .from("expenses")
        .select(`
          *,
          expense_categories (
            id,
            name
          )
        `)
        .eq("business_id", businessId)
        .order("expense_date", { ascending: false });

      if (expenseResult.error) {
        throw expenseResult.error;
      }

      const categoryResult = await supabase
        .from("expense_categories")
        .select("id, name, description")
        .eq("business_id", businessId)
        .order("name", { ascending: true });

      if (categoryResult.error) {
        throw categoryResult.error;
      }

      setExpenses(expenseResult.data || []);
      setCategories(categoryResult.data || []);
    } catch (err) {
      console.error("Error loading expenses:", err);

      setError(
        err.message || "Unable to load expenses. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // FORM RESET
  // =========================
  function resetForm() {
    setFormData({
      category_id: "",
      description: "",
      amount: "",
      payment_method: "Cash",
      transaction_reference: "",
      expense_date: new Date().toISOString().slice(0, 16),
      notes: "",
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openForm() {
    setMessage("");
    setError("");
    resetForm();
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
  }

  // =========================
  // SAVE EXPENSE
  // =========================
  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const description = formData.description.trim();
    const amount = Number(formData.amount);

    if (!description) {
      setError("Please enter an expense description.");
      return;
    }

    if (!formData.amount || Number.isNaN(amount) || amount <= 0) {
      setError("Please enter a valid expense amount.");
      return;
    }

    setSaving(true);

    try {
      const businessId = await getBusinessId();

      const expenseToInsert = {
        business_id: businessId,
        category_id: formData.category_id
          ? Number(formData.category_id)
          : null,
        description: description,
        amount: amount,
        payment_method: formData.payment_method || null,
        transaction_reference:
          formData.transaction_reference.trim() || null,
        expense_date: formData.expense_date
          ? new Date(formData.expense_date).toISOString()
          : new Date().toISOString(),
        notes: formData.notes.trim() || null,
      };

      const result = await supabase
        .from("expenses")
        .insert([expenseToInsert])
        .select(`
          *,
          expense_categories (
            id,
            name
          )
        `)
        .single();

      if (result.error) {
        throw result.error;
      }

      setExpenses((previous) => [result.data, ...previous]);

      setMessage("Expense added successfully.");

      setShowForm(false);

      resetForm();
    } catch (err) {
      console.error("Error adding expense:", err);

      setError(
        err.message || "Unable to save the expense. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // DELETE EXPENSE
  // =========================
  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setDeletingId(id);

    try {
      const businessId = await getBusinessId();

      const result = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("business_id", businessId);

      if (result.error) {
        throw result.error;
      }

      setExpenses((previous) =>
        previous.filter((expense) => expense.id !== id)
      );

      setMessage("Expense deleted successfully.");
    } catch (err) {
      console.error("Error deleting expense:", err);

      setError(
        err.message || "Unable to delete the expense."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =========================
  // FILTER EXPENSES
  // =========================
  const filteredExpenses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return expenses.filter((expense) => {
      const description =
        expense.description?.toLowerCase() || "";

      const paymentMethod =
        expense.payment_method?.toLowerCase() || "";

      const reference =
        expense.transaction_reference?.toLowerCase() || "";

      const categoryName =
        expense.expense_categories?.name?.toLowerCase() || "";

      const matchesSearch =
        !search ||
        description.includes(search) ||
        paymentMethod.includes(search) ||
        reference.includes(search) ||
        categoryName.includes(search);

      const matchesCategory =
        categoryFilter === "all" ||
        String(expense.category_id) === String(categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  // =========================
  // SUMMARY DATA
  // =========================
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );
  }, [filteredExpenses]);

  const allExpensesTotal = useMemo(() => {
    return expenses.reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  const averageExpense = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return 0;
    }

    return totalExpenses / filteredExpenses.length;
  }, [filteredExpenses.length, totalExpenses]);

  // =========================
  // FORMAT MONEY
  // =========================
  function formatMoney(amount) {
    return `KSh ${Number(amount || 0).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  // =========================
  // FORMAT DATE
  // =========================
  function formatDate(date) {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // =========================
  // PAYMENT BADGE
  // =========================
  function getPaymentClass(method) {
    const value = method?.toLowerCase();

    if (value === "cash") {
      return "cash";
    }

    if (value === "m-pesa") {
      return "mpesa";
    }

    if (value === "bank") {
      return "bank";
    }

    if (value === "card") {
      return "card";
    }

    return "other";
  }

  // =========================
  // LOADING STATE
  // =========================
  if (loading) {
    return (
      <div className="jesta-expenses-page">
        <div className="jesta-expenses-loading">
          <div className="jesta-expenses-loading-icon">
            <Loader2 size={30} className="spin" />
          </div>

          <h3>Loading expenses...</h3>

          <p>
            Please wait while we load your expense records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="jesta-expenses-page">
      {/* =========================
          PAGE HEADER
      ========================= */}
      <div className="jesta-expenses-header">
        <div className="jesta-expenses-brand">
          <div className="jesta-expenses-brand-icon">
            <Receipt size={24} />
          </div>

          <div>
            <h2>Expenses</h2>
            <p>
              Track business expenses and operating costs.
            </p>
          </div>
        </div>

        <button
          className="jesta-expenses-primary"
          onClick={openForm}
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* =========================
          ALERTS
      ========================= */}
      {message && (
        <div className="jesta-expenses-success-alert">
          <div className="jesta-expenses-alert-icon">
            <Receipt size={17} />
          </div>

          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="jesta-expenses-error-alert">
          <div className="jesta-expenses-alert-icon">
            !
          </div>

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
          SUMMARY CARDS
      ========================= */}
      <div className="jesta-expenses-stats">
        <div className="jesta-expenses-stat">
          <div className="jesta-expenses-stat-icon expenses">
            <Wallet size={21} />
          </div>

          <div className="jesta-expenses-stat-content">
            <span>Total Expenses</span>
            <strong>{formatMoney(totalExpenses)}</strong>
            <small>
              {searchTerm || categoryFilter !== "all"
                ? "Current filtered view"
                : "All recorded expenses"}
            </small>
          </div>
        </div>

        <div className="jesta-expenses-stat">
          <div className="jesta-expenses-stat-icon transactions">
            <Receipt size={21} />
          </div>

          <div className="jesta-expenses-stat-content">
            <span>Transactions</span>
            <strong>{filteredExpenses.length}</strong>
            <small>
              {expenses.length === 1
                ? "1 expense recorded"
                : `${expenses.length} expenses recorded`}
            </small>
          </div>
        </div>

        <div className="jesta-expenses-stat">
          <div className="jesta-expenses-stat-icon average">
            <TrendingDown size={21} />
          </div>

          <div className="jesta-expenses-stat-content">
            <span>Average Expense</span>
            <strong>{formatMoney(averageExpense)}</strong>
            <small>Per transaction</small>
          </div>
        </div>

        <div className="jesta-expenses-stat">
          <div className="jesta-expenses-stat-icon methods">
            <CreditCard size={21} />
          </div>

          <div className="jesta-expenses-stat-content">
            <span>Categories</span>
            <strong>{categories.length}</strong>
            <small>Available expense categories</small>
          </div>
        </div>
      </div>

      {/* =========================
          TOOLBAR
      ========================= */}
      <div className="jesta-expenses-toolbar">
        <div className="jesta-expenses-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search description, category, payment or reference..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />

          {searchTerm && (
            <button
              type="button"
              className="jesta-expenses-search-clear"
              onClick={() => setSearchTerm("")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
          className="jesta-expenses-filter"
        >
          <option value="all">All Categories</option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>

        <button
          className="jesta-expenses-refresh"
          onClick={loadData}
          disabled={loading}
          title="Refresh expenses"
        >
          <RefreshCw
            size={17}
            className={loading ? "spin" : ""}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* =========================
          EXPENSE TABLE
      ========================= */}
      <section className="jesta-expenses-card">
        <div className="jesta-expenses-card-header">
          <div>
            <div className="jesta-expenses-card-title">
              <Receipt size={18} />
              <h3>Expense Records</h3>
            </div>

            <p>
              Review and manage your business expenses.
            </p>
          </div>

          <div className="jesta-expenses-card-count">
            {filteredExpenses.length} record
            {filteredExpenses.length !== 1 ? "s" : ""}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="jesta-expenses-empty">
            <div className="jesta-expenses-empty-icon">
              <Receipt size={38} />
            </div>

            <h3>
              {expenses.length === 0
                ? "No expenses recorded"
                : "No matching expenses"}
            </h3>

            <p>
              {expenses.length === 0
                ? "Start recording your business expenses to keep your financial records organized."
                : "Try changing your search or category filter."}
            </p>

            {expenses.length === 0 && (
              <button
                className="jesta-expenses-primary"
                onClick={openForm}
              >
                <Plus size={18} />
                Add First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="jesta-expenses-table-wrapper">
            <table className="jesta-expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Payment</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <div className="jesta-expenses-date">
                        <CalendarDays size={15} />
                        <span>
                          {formatDate(
                            expense.expense_date
                          )}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="jesta-expenses-description">
                        <strong>
                          {expense.description}
                        </strong>

                        {expense.notes && (
                          <small>
                            {expense.notes}
                          </small>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="jesta-expenses-category">
                        {expense.expense_categories?.name ||
                          "Uncategorized"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`jesta-expenses-payment ${getPaymentClass(
                          expense.payment_method
                        )}`}
                      >
                        {expense.payment_method || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="jesta-expenses-reference">
                        {expense.transaction_reference || "—"}
                      </span>
                    </td>

                    <td>
                      <strong className="jesta-expenses-amount">
                        {formatMoney(expense.amount)}
                      </strong>
                    </td>

                    <td>
                      <button
                        className="jesta-expenses-delete"
                        title="Delete expense"
                        onClick={() =>
                          handleDelete(expense.id)
                        }
                        disabled={
                          deletingId === expense.id
                        }
                      >
                        {deletingId === expense.id ? (
                          <Loader2
                            size={17}
                            className="spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan="5">
                    <strong>
                      Total
                    </strong>
                  </td>

                  <td>
                    <strong className="jesta-expenses-footer-total">
                      {formatMoney(totalExpenses)}
                    </strong>
                  </td>

                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* =========================
          ADD EXPENSE MODAL
      ========================= */}
      {showForm && (
        <div className="jesta-expenses-modal-overlay">
          <div className="jesta-expenses-modal">
            <div className="jesta-expenses-modal-header">
              <div className="jesta-expenses-modal-heading">
                <div className="jesta-expenses-modal-icon">
                  <Receipt size={21} />
                </div>

                <div>
                  <h3>Add Expense</h3>
                  <p>
                    Record a new business expense.
                  </p>
                </div>
              </div>

              <button
                className="jesta-expenses-modal-close"
                onClick={closeForm}
                disabled={saving}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="jesta-expenses-form"
            >
              <div className="jesta-expenses-form-grid">
                {/* CATEGORY */}
                <div className="jesta-expenses-form-group">
                  <label>Category</label>

                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DATE */}
                <div className="jesta-expenses-form-group">
                  <label>Expense Date</label>

                  <input
                    type="datetime-local"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleChange}
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="jesta-expenses-form-group full-width">
                  <label>
                    Description <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="description"
                    placeholder="e.g. Electricity bill"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* AMOUNT */}
                <div className="jesta-expenses-form-group">
                  <label>
                    Amount (KSh) <span>*</span>
                  </label>

                  <div className="jesta-expenses-money-input">
                    <span>KSh</span>

                    <input
                      type="number"
                      name="amount"
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      value={formData.amount}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* PAYMENT */}
                <div className="jesta-expenses-form-group">
                  <label>Payment Method</label>

                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                  >
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank">Bank</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* REFERENCE */}
                <div className="jesta-expenses-form-group full-width">
                  <label>Transaction Reference</label>

                  <input
                    type="text"
                    name="transaction_reference"
                    placeholder="e.g. M-Pesa transaction number"
                    value={formData.transaction_reference}
                    onChange={handleChange}
                  />

                  <small>
                    Useful for M-Pesa, bank, cheque or card payments.
                  </small>
                </div>

                {/* NOTES */}
                <div className="jesta-expenses-form-group full-width">
                  <label>Notes</label>

                  <textarea
                    name="notes"
                    rows="4"
                    placeholder="Optional additional information..."
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* FORM FOOTER */}
              <div className="jesta-expenses-form-footer">
                <div className="jesta-expenses-form-info">
                  <Receipt size={16} />
                  <span>
                    Expense will be recorded against your business.
                  </span>
                </div>

                <div className="jesta-expenses-modal-actions">
                  <button
                    type="button"
                    className="jesta-expenses-cancel"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="jesta-expenses-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2
                          size={18}
                          className="spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Save Expense
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;