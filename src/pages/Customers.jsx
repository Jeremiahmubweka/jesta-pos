import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Pencil,
  UserX,
  X,
  RefreshCw,
  Phone,
  Mail,
  Wallet,
  CreditCard,
  UserCheck,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function Customers() {
  const [customers, setCustomers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
    credit_limit: "",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        address,
        tax_number,
        credit_limit,
        current_balance,
        is_active,
        created_at,
        updated_at
      `)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(
        `Could not load customers: ${error.message}`
      );
      setCustomers([]);
    } else {
      setCustomers(data || []);
    }

    setLoading(false);
  };

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return customers;
    }

    return customers.filter((customer) => {
      const name = customer.name?.toLowerCase() || "";
      const phone = customer.phone?.toLowerCase() || "";
      const email = customer.email?.toLowerCase() || "";
      const taxNumber =
        customer.tax_number?.toLowerCase() || "";

      return (
        name.includes(term) ||
        phone.includes(term) ||
        email.includes(term) ||
        taxNumber.includes(term)
      );
    });
  }, [customers, searchTerm]);

  const totalCustomers = customers.length;

  const customersWithBalance = customers.filter(
    (customer) => Number(customer.current_balance) > 0
  ).length;

  const totalOutstanding = customers.reduce(
    (total, customer) =>
      total + (Number(customer.current_balance) || 0),
    0
  );

  const totalCreditLimit = customers.reduce(
    (total, customer) =>
      total + (Number(customer.credit_limit) || 0),
    0
  );

  const openAddModal = () => {
    setEditingCustomer(null);

    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      tax_number: "",
      credit_limit: "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);

    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      tax_number: customer.tax_number || "",
      credit_limit: customer.credit_limit ?? "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveCustomer = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setErrorMessage("Customer name is required.");
      return;
    }

    if (
      form.credit_limit !== "" &&
      Number(form.credit_limit) < 0
    ) {
      setErrorMessage("Credit limit cannot be negative.");
      return;
    }

    setSaving(true);

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

      const customerData = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        tax_number: form.tax_number.trim() || null,
        credit_limit: Number(form.credit_limit) || 0,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingCustomer.id)
          .eq("business_id", businessId);

        if (error) {
          throw new Error(error.message);
        }

        setSuccessMessage(
          "Customer updated successfully."
        );
      } else {
        const { error } = await supabase
          .from("customers")
          .insert({
            ...customerData,
            current_balance: 0,
            is_active: true,
            business_id: businessId,
          });

        if (error) {
          throw new Error(error.message);
        }

        setSuccessMessage(
          "Customer added successfully."
        );
      }

      setShowModal(false);
      setEditingCustomer(null);

      await loadCustomers();
    } catch (error) {
      setErrorMessage(
        error.message || "Could not save customer."
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivateCustomer = async (customer) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${customer.name}?`
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

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
          "Could not identify your business."
        );
      }

      const { error } = await supabase
        .from("customers")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customer.id)
        .eq("business_id", businessId);

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMessage(
        `${customer.name} has been deactivated.`
      );

      await loadCustomers();
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Could not deactivate customer."
      );
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
    }).format(Number(amount) || 0);
  };

  return (
    <div className="jesta-customers-page">
      {/* PAGE HEADER */}
      <div className="jesta-customers-header">
        <div className="jesta-customers-brand">
          <div className="jesta-customers-brand-icon">
            <Users size={23} />
          </div>

          <div>
            <h1>Customers</h1>
            <p>
              Manage your customers, contacts, credit limits
              and account balances.
            </p>
          </div>
        </div>

        <div className="jesta-customers-header-actions">
          <button
            className="jesta-btn jesta-btn-secondary"
            onClick={loadCustomers}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "jesta-spin" : ""}
            />
            Refresh
          </button>

          <button
            className="jesta-btn jesta-btn-primary jesta-customers-primary"
            onClick={openAddModal}
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {errorMessage && (
        <div className="jesta-customers-alert jesta-customers-error-alert">
          <div className="jesta-customers-alert-icon">
            <X size={17} />
          </div>
          <span>{errorMessage}</span>

          <button
            onClick={() => setErrorMessage("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="jesta-customers-alert jesta-customers-success-alert">
          <div className="jesta-customers-alert-icon">
            <UserCheck size={17} />
          </div>
          <span>{successMessage}</span>

          <button
            onClick={() => setSuccessMessage("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUMMARY STATS */}
      <div className="jesta-customers-stats">
        <div className="jesta-customers-stat">
          <div className="jesta-customers-stat-icon customers">
            <Users size={20} />
          </div>

          <div>
            <span>Total Customers</span>
            <strong>{totalCustomers}</strong>
            <small>
              {filteredCustomers.length !== totalCustomers
                ? `${filteredCustomers.length} shown`
                : "Active customers"}
            </small>
          </div>
        </div>

        <div className="jesta-customers-stat">
          <div className="jesta-customers-stat-icon credit">
            <CreditCard size={20} />
          </div>

          <div>
            <span>Credit Limits</span>
            <strong>
              {formatCurrency(totalCreditLimit)}
            </strong>
            <small>Available customer credit</small>
          </div>
        </div>

        <div className="jesta-customers-stat">
          <div className="jesta-customers-stat-icon owing">
            <Wallet size={20} />
          </div>

          <div>
            <span>Outstanding Balance</span>
            <strong>
              {formatCurrency(totalOutstanding)}
            </strong>
            <small>
              {customersWithBalance} customer
              {customersWithBalance === 1 ? "" : "s"} owing
            </small>
          </div>
        </div>
      </div>

      {/* CUSTOMER TABLE CARD */}
      <div className="jesta-customers-card">
        <div className="jesta-customers-toolbar">
          <div className="jesta-customers-toolbar-title">
            <div className="jesta-customers-toolbar-icon">
              <Users size={18} />
            </div>

            <div>
              <h2>Customer Directory</h2>
              <span>
                {filteredCustomers.length} customer
                {filteredCustomers.length === 1
                  ? ""
                  : "s"} displayed
              </span>
            </div>
          </div>

          <div className="jesta-customers-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search name, phone, email or PIN..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="jesta-customers-empty">
            <div className="jesta-customers-loading-icon">
              <RefreshCw
                size={28}
                className="jesta-spin"
              />
            </div>

            <h3>Loading customers...</h3>
            <p>
              Please wait while we load your customer
              directory.
            </p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="jesta-customers-empty">
            <div className="jesta-customers-empty-icon">
              <Users size={34} />
            </div>

            <h3>
              {searchTerm
                ? "No customers found"
                : "No customers yet"}
            </h3>

            <p>
              {searchTerm
                ? "Try a different search term."
                : "Add your first customer to start building your customer directory."}
            </p>

            {!searchTerm && (
              <button
                className="jesta-btn jesta-btn-primary"
                onClick={openAddModal}
              >
                <Plus size={17} />
                Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="jesta-customers-table-wrapper">
            <table className="jesta-customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Credit Limit</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th className="jesta-customers-actions-heading">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => {
                  const balance =
                    Number(customer.current_balance) || 0;

                  const creditLimit =
                    Number(customer.credit_limit) || 0;

                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className="jesta-customer-name-cell">
                          <div className="jesta-customer-avatar">
                            {customer.name
                              ?.charAt(0)
                              ?.toUpperCase() || "C"}
                          </div>

                          <div className="jesta-customer-name-info">
                            <strong>
                              {customer.name}
                            </strong>

                            {customer.tax_number ? (
                              <span>
                                PIN: {customer.tax_number}
                              </span>
                            ) : (
                              <span>
                                Customer #{customer.id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="jesta-customer-contact">
                          {customer.phone && (
                            <span>
                              <Phone size={13} />
                              {customer.phone}
                            </span>
                          )}

                          {customer.email && (
                            <span>
                              <Mail size={13} />
                              {customer.email}
                            </span>
                          )}

                          {!customer.phone &&
                            !customer.email && (
                              <span className="jesta-no-contact">
                                No contact details
                              </span>
                            )}
                        </div>
                      </td>

                      <td>
                        <span className="jesta-customer-money">
                          {formatCurrency(creditLimit)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`jesta-customer-balance ${
                            balance > 0
                              ? "owing"
                              : "clear"
                          }`}
                        >
                          {formatCurrency(balance)}
                        </span>
                      </td>

                      <td>
                        <span className="jesta-customer-status">
                          <span className="jesta-status-dot" />
                          Active
                        </span>
                      </td>

                      <td>
                        <div className="jesta-customer-actions">
                          <button
                            className="jesta-customer-action edit"
                            title="Edit customer"
                            onClick={() =>
                              openEditModal(customer)
                            }
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="jesta-customer-action deactivate"
                            title="Deactivate customer"
                            onClick={() =>
                              deactivateCustomer(customer)
                            }
                          >
                            <UserX size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOMER MODAL */}
      {showModal && (
        <div
          className="jesta-customers-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeModal();
            }
          }}
        >
          <div className="jesta-customers-modal">
            <div className="jesta-customers-modal-header">
              <div className="jesta-customers-modal-title">
                <div className="jesta-customers-modal-icon">
                  {editingCustomer ? (
                    <Pencil size={20} />
                  ) : (
                    <Plus size={20} />
                  )}
                </div>

                <div>
                  <h3>
                    {editingCustomer
                      ? "Edit Customer"
                      : "Add Customer"}
                  </h3>

                  <p>
                    {editingCustomer
                      ? "Update the customer's information below."
                      : "Enter the customer's information to create an account."}
                  </p>
                </div>
              </div>

              <button
                className="jesta-customers-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveCustomer}>
              <div className="jesta-customers-form">
                <div className="jesta-customers-form-group">
                  <label htmlFor="customer-name">
                    Customer Name *
                  </label>

                  <input
                    id="customer-name"
                    name="name"
                    type="text"
                    placeholder="e.g. John Kamau"
                    value={form.name}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>

                <div className="jesta-customers-form-group">
                  <label htmlFor="customer-phone">
                    Phone Number
                  </label>

                  <input
                    id="customer-phone"
                    name="phone"
                    type="text"
                    placeholder="e.g. 0712 345 678"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="jesta-customers-form-group">
                  <label htmlFor="customer-email">
                    Email Address
                  </label>

                  <input
                    id="customer-email"
                    name="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="jesta-customers-form-group">
                  <label htmlFor="customer-pin">
                    Tax Number / KRA PIN
                  </label>

                  <input
                    id="customer-pin"
                    name="tax_number"
                    type="text"
                    placeholder="e.g. A012345678X"
                    value={form.tax_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="jesta-customers-form-group full-width">
                  <label htmlFor="customer-address">
                    Address
                  </label>

                  <input
                    id="customer-address"
                    name="address"
                    type="text"
                    placeholder="Customer address"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="jesta-customers-form-group">
                  <label htmlFor="customer-credit-limit">
                    Credit Limit
                  </label>

                  <div className="jesta-customer-input-money">
                    <span>KSh</span>

                    <input
                      id="customer-credit-limit"
                      name="credit_limit"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.credit_limit}
                      onChange={handleChange}
                    />
                  </div>

                  <small>
                    Set to 0 for customers who do not
                    purchase on credit.
                  </small>
                </div>
              </div>

              <div className="jesta-customers-modal-actions">
                <button
                  type="button"
                  className="jesta-btn jesta-btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="jesta-btn jesta-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="jesta-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingCustomer
                        ? "Save Changes"
                        : "Add Customer"}
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

export default Customers;