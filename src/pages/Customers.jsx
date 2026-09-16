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
      credit_limit:
        customer.credit_limit ?? "",
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
      setErrorMessage(
        "Credit limit cannot be negative."
      );
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
        credit_limit:
          Number(form.credit_limit) || 0,
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
    <div className="customers-page">
      <div className="page-heading">
        <div>
          <h2>Customers</h2>
          <p>
            Manage your customers and their account
            balances.
          </p>
        </div>

        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={loadCustomers}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            className="primary-button"
            onClick={openAddModal}
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-error">
          <X size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span>{successMessage}</span>
        </div>
      )}

      <div className="customers-card">
        <div className="customers-toolbar">
          <div className="customer-count">
            <Users size={18} />
            <span>
              {filteredCustomers.length} customer
              {filteredCustomers.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="customer-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </div>
        </div>

        {loading ? (
          <div className="customers-empty">
            <RefreshCw
              size={25}
              className="spin"
            />
            <p>Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="customers-empty">
            <Users size={35} />

            <h3>No customers found</h3>

            <p>
              Add your first customer to get started.
            </p>

            <button
              className="primary-button"
              onClick={openAddModal}
            >
              <Plus size={17} />
              Add Customer
            </button>
          </div>
        ) : (
          <div className="customers-table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Credit Limit</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map(
                  (customer) => {
                    const balance =
                      Number(
                        customer.current_balance
                      ) || 0;

                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="customer-name-cell">
                            <div className="customer-avatar">
                              {customer.name
                                ?.charAt(0)
                                ?.toUpperCase() || "C"}
                            </div>

                            <div>
                              <strong>
                                {customer.name}
                              </strong>

                              {customer.tax_number && (
                                <span>
                                  PIN:{" "}
                                  {customer.tax_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="customer-contact">
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
                                <span>
                                  No contact details
                                </span>
                              )}
                          </div>
                        </td>

                        <td>
                          {formatCurrency(
                            customer.credit_limit
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              balance > 0
                                ? "customer-balance owing"
                                : "customer-balance"
                            }
                          >
                            {formatCurrency(balance)}
                          </span>
                        </td>

                        <td>
                          <span className="status-badge status-active">
                            Active
                          </span>
                        </td>

                        <td>
                          <div className="table-actions">
                            <button
                              className="icon-button"
                              title="Edit customer"
                              onClick={() =>
                                openEditModal(
                                  customer
                                )
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              className="icon-button danger"
                              title="Deactivate customer"
                              onClick={() =>
                                deactivateCustomer(
                                  customer
                                )
                              }
                            >
                              <UserX size={16} />
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

      {showModal && (
        <div className="modal-overlay">
          <div className="customer-modal">
            <div className="modal-header">
              <div>
                <h3>
                  {editingCustomer
                    ? "Edit Customer"
                    : "Add Customer"}
                </h3>

                <p>
                  {editingCustomer
                    ? "Update customer information."
                    : "Enter the customer's information."}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveCustomer}>
              <div className="customer-form-grid">
                <label>
                  Customer Name *
                  <input
                    name="name"
                    type="text"
                    placeholder="e.g. John Kamau"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Phone
                  <input
                    name="phone"
                    type="text"
                    placeholder="e.g. 0712345678"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Tax Number / KRA PIN
                  <input
                    name="tax_number"
                    type="text"
                    placeholder="e.g. A012345678X"
                    value={form.tax_number}
                    onChange={handleChange}
                  />
                </label>

                <label className="full-width">
                  Address
                  <input
                    name="address"
                    type="text"
                    placeholder="Customer address"
                    value={form.address}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Credit Limit
                  <input
                    name="credit_limit"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.credit_limit}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="spin"
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