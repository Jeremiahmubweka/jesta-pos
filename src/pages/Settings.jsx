import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  Settings as SettingsIcon,
  Save,
  Lock,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function Settings() {
  const [activeSection, setActiveSection] = useState("Business");

  const [businessId, setBusinessId] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [businessForm, setBusinessForm] = useState({
    name: "",
    business_type: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
    currency: "KES",
    timezone: "Africa/Nairobi",
  });

  const [currentUser, setCurrentUser] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [updatingPassword, setUpdatingPassword] = useState(false);

  const settingsSections = [
    {
      name: "Business",
      icon: Building2,
      description: "Manage your business information",
    },
    {
      name: "Users",
      icon: Users,
      description: "View account and access information",
    },
    {
      name: "Security",
      icon: ShieldCheck,
      description: "Manage your account security",
    },
    {
      name: "System",
      icon: SettingsIcon,
      description: "View system configuration",
    },
  ];

  useEffect(() => {
    loadBusiness();
    loadCurrentUser();
  }, []);

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

  const loadCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("Current user error:", error);
      return;
    }

    setCurrentUser(data.user);
  };

  const loadBusiness = async () => {
    setLoadingBusiness(true);
    clearMessages();

    try {
      const {
        data: businessIdData,
        error: businessIdError,
      } = await supabase.rpc("get_my_business_id");

      if (businessIdError) {
        console.error(
          "Business ID loading error:",
          businessIdError
        );

        setErrorMessage(
          "Unable to determine your business. Please try again."
        );

        return;
      }

      const resolvedBusinessId = Number(businessIdData);

      if (!resolvedBusinessId) {
        setErrorMessage(
          "No business is associated with your account."
        );

        return;
      }

      setBusinessId(resolvedBusinessId);

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", resolvedBusinessId)
        .single();

      if (error) {
        console.error("Business loading error:", error);

        setErrorMessage(
          "Unable to load your business information."
        );

        return;
      }

      if (!data) {
        setErrorMessage(
          "Business information could not be found."
        );

        return;
      }

      setBusiness(data);

      setBusinessForm({
        name: data.name || "",
        business_type: data.business_type || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        tax_number: data.tax_number || "",
        currency: data.currency || "KES",
        timezone: data.timezone || "Africa/Nairobi",
      });
    } catch (error) {
      console.error("Unexpected business loading error:", error);

      setErrorMessage(
        "Something went wrong while loading business information."
      );
    } finally {
      setLoadingBusiness(false);
    }
  };

  const handleBusinessChange = (event) => {
    const { name, value } = event.target;

    setBusinessForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    clearMessages();
  };

  const handleSaveBusiness = async (event) => {
    event.preventDefault();

    clearMessages();

    if (!businessId) {
      setErrorMessage(
        "Business information is not available. Please refresh the page."
      );

      return;
    }

    if (!businessForm.name.trim()) {
      setErrorMessage("Business name is required.");
      return;
    }

    setSavingBusiness(true);

    try {
      /*
       * Important:
       * We intentionally do NOT use .select().single()
       * after the update.
       *
       * Supabase can return:
       * "Cannot coerce the result to a single JSON object"
       *
       * when the update response does not contain exactly
       * one returned row.
       *
       * We already have the values in businessForm, so we
       * only need to confirm that the update itself succeeds.
       */
      const { error } = await supabase
        .from("businesses")
        .update({
          name: businessForm.name.trim(),
          business_type:
            businessForm.business_type.trim() || null,
          phone: businessForm.phone.trim() || null,
          email: businessForm.email.trim() || null,
          address: businessForm.address.trim() || null,
          tax_number:
            businessForm.tax_number.trim() || null,
          currency:
            businessForm.currency.trim() || "KES",
          timezone:
            businessForm.timezone.trim() ||
            "Africa/Nairobi",
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      if (error) {
        console.error("Business update error:", error);

        setErrorMessage(error.message);

        return;
      }

      /*
       * Update the local business state so the screen
       * immediately reflects the saved information.
       */
      setBusiness((previous) => ({
        ...(previous || {}),
        ...businessForm,
      }));

      setMessage(
        "Business information updated successfully."
      );
    } catch (error) {
      console.error(
        "Unexpected business update error:",
        error
      );

      setErrorMessage(
        "Something went wrong while saving your business information."
      );
    } finally {
      setSavingBusiness(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    clearMessages();
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();

    clearMessages();

    const { newPassword, confirmPassword } =
      passwordForm;

    if (!newPassword) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        "The new password and confirmation password do not match."
      );
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        console.error(
          "Password update error:",
          error
        );

        setErrorMessage(error.message);

        return;
      }

      setPasswordForm({
        newPassword: "",
        confirmPassword: "",
      });

      setMessage(
        "Your password has been updated successfully."
      );
    } catch (error) {
      console.error(
        "Unexpected password update error:",
        error
      );

      setErrorMessage(
        "Something went wrong while updating your password."
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleCloseMessage = () => {
    clearMessages();
  };

  const renderBusinessSection = () => {
    if (loadingBusiness) {
      return (
        <div className="jesta-settings-loading">
          <Loader2
            size={24}
            className="jesta-settings-loading-icon"
          />

          <p>Loading business information...</p>
        </div>
      );
    }

    return (
      <div className="jesta-settings-panel">
        <div className="jesta-settings-panel-header">
          <div className="jesta-settings-panel-heading">
            <div className="jesta-settings-panel-icon">
              <Building2 size={20} />
            </div>

            <div>
              <h2>Business Information</h2>

              <p>
                Manage the information used throughout
                your JESTA POS system.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="jesta-settings-close"
            onClick={loadBusiness}
            title="Refresh business information"
            aria-label="Refresh business information"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <form
          onSubmit={handleSaveBusiness}
          className="jesta-settings-form"
        >
          <div className="jesta-settings-form-grid">
            <div className="jesta-settings-field">
              <label htmlFor="business-name">
                Business Name
              </label>

              <div className="jesta-settings-input-wrap">
                <Building2 size={17} />

                <input
                  id="business-name"
                  name="name"
                  type="text"
                  value={businessForm.name}
                  onChange={handleBusinessChange}
                  placeholder="Enter business name"
                  required
                />
              </div>
            </div>

            <div className="jesta-settings-field">
              <label htmlFor="business-type">
                Business Type
              </label>

              <div className="jesta-settings-input-wrap">
                <SettingsIcon size={17} />

                <input
                  id="business-type"
                  name="business_type"
                  type="text"
                  value={businessForm.business_type}
                  onChange={handleBusinessChange}
                  placeholder="e.g. General Retail"
                />
              </div>
            </div>

            <div className="jesta-settings-field">
              <label htmlFor="business-phone">
                Phone Number
              </label>

              <div className="jesta-settings-input-wrap">
                <Phone size={17} />

                <input
                  id="business-phone"
                  name="phone"
                  type="text"
                  value={businessForm.phone}
                  onChange={handleBusinessChange}
                  placeholder="e.g. 0700000000"
                />
              </div>
            </div>

            <div className="jesta-settings-field">
              <label htmlFor="business-email">
                Business Email
              </label>

              <div className="jesta-settings-input-wrap">
                <Mail size={17} />

                <input
                  id="business-email"
                  name="email"
                  type="email"
                  value={businessForm.email}
                  onChange={handleBusinessChange}
                  placeholder="business@example.com"
                />
              </div>
            </div>

            <div className="jesta-settings-field jesta-settings-field-full">
              <label htmlFor="business-address">
                Business Address
              </label>

              <div className="jesta-settings-input-wrap">
                <MapPin size={17} />

                <input
                  id="business-address"
                  name="address"
                  type="text"
                  value={businessForm.address}
                  onChange={handleBusinessChange}
                  placeholder="Enter business address"
                />
              </div>
            </div>

            <div className="jesta-settings-field">
              <label htmlFor="business-tax">
                Tax Number
              </label>

              <div className="jesta-settings-input-wrap">
                <ShieldCheck size={17} />

                <input
                  id="business-tax"
                  name="tax_number"
                  type="text"
                  value={businessForm.tax_number}
                  onChange={handleBusinessChange}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="jesta-settings-field">
              <label htmlFor="business-currency">
                Currency
              </label>

              <div className="jesta-settings-input-wrap">
                <Globe size={17} />

                <input
                  id="business-currency"
                  name="currency"
                  type="text"
                  value={businessForm.currency}
                  onChange={handleBusinessChange}
                  placeholder="KES"
                />
              </div>
            </div>

            <div className="jesta-settings-field">
              <label htmlFor="business-timezone">
                Timezone
              </label>

              <div className="jesta-settings-input-wrap">
                <Globe size={17} />

                <input
                  id="business-timezone"
                  name="timezone"
                  type="text"
                  value={businessForm.timezone}
                  onChange={handleBusinessChange}
                  placeholder="Africa/Nairobi"
                />
              </div>
            </div>
          </div>

          <div className="jesta-settings-form-footer">
            <button
              type="button"
              className="jesta-settings-secondary-button"
              onClick={loadBusiness}
              disabled={savingBusiness}
            >
              <X size={17} />
              Reset
            </button>

            <button
              type="submit"
              className="jesta-settings-primary-button"
              disabled={savingBusiness}
            >
              {savingBusiness ? (
                <>
                  <Loader2
                    size={17}
                    className="jesta-settings-button-spinner"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderUsersSection = () => {
    return (
      <div className="jesta-settings-panel">
        <div className="jesta-settings-panel-header">
          <div className="jesta-settings-panel-heading">
            <div className="jesta-settings-panel-icon">
              <Users size={20} />
            </div>

            <div>
              <h2>Users & Access</h2>

              <p>
                View the account currently signed in to
                this JESTA POS system.
              </p>
            </div>
          </div>
        </div>

        <div className="jesta-settings-account-card">
          <div className="jesta-settings-account-avatar">
            {currentUser?.email
              ? currentUser.email
                  .charAt(0)
                  .toUpperCase()
              : "A"}
          </div>

          <div className="jesta-settings-account-details">
            <h3>Administrator</h3>

            <p>
              {currentUser?.email ||
                "Administrator account"}
            </p>
          </div>

          <div className="jesta-settings-account-status">
            <CheckCircle2 size={16} />
            Active
          </div>
        </div>

        <div className="jesta-settings-info-grid">
          <div className="jesta-settings-info-card">
            <span>Business</span>
            <strong>
              {business?.name ||
                businessForm.name ||
                "JESTA Business"}
            </strong>
          </div>

          <div className="jesta-settings-info-card">
            <span>Business ID</span>
            <strong>{businessId || "—"}</strong>
          </div>

          <div className="jesta-settings-info-card">
            <span>Access Level</span>
            <strong>Administrator</strong>
          </div>

          <div className="jesta-settings-info-card">
            <span>Account Status</span>
            <strong>Active</strong>
          </div>
        </div>

        <div className="jesta-settings-notice">
          <ShieldCheck size={18} />

          <div>
            <strong>User management</strong>

            <p>
              Employee accounts, roles, and permissions
              can be added here as JESTA's multi-user
              management features are expanded.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSecuritySection = () => {
    return (
      <div className="jesta-settings-panel">
        <div className="jesta-settings-panel-header">
          <div className="jesta-settings-panel-heading">
            <div className="jesta-settings-panel-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h2>Security</h2>

              <p>
                Keep your JESTA account secure by managing
                your password.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handlePasswordUpdate}
          className="jesta-settings-form"
        >
          <div className="jesta-settings-security-header">
            <div className="jesta-settings-security-icon">
              <Lock size={20} />
            </div>

            <div>
              <h3>Change Password</h3>

              <p>
                Choose a strong password that you do not
                use on other services.
              </p>
            </div>
          </div>

          <div className="jesta-settings-form-grid">
            <div className="jesta-settings-field">
              <label htmlFor="new-password">
                New Password
              </label>

              <div className="jesta-settings-input-wrap">
                <Lock size={17} />

                <input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="jesta-settings-field">
              <label htmlFor="confirm-password">
                Confirm New Password
              </label>

              <div className="jesta-settings-input-wrap">
                <Lock size={17} />

                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          </div>

          <div className="jesta-settings-password-rules">
            <div>
              <CheckCircle2 size={15} />
              Minimum 6 characters
            </div>

            <div>
              <CheckCircle2 size={15} />
              Passwords must match
            </div>
          </div>

          <div className="jesta-settings-form-footer">
            <div></div>

            <button
              type="submit"
              className="jesta-settings-primary-button"
              disabled={updatingPassword}
            >
              {updatingPassword ? (
                <>
                  <Loader2
                    size={17}
                    className="jesta-settings-button-spinner"
                  />
                  Updating...
                </>
              ) : (
                <>
                  <Lock size={17} />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderSystemSection = () => {
    return (
      <div className="jesta-settings-panel">
        <div className="jesta-settings-panel-header">
          <div className="jesta-settings-panel-heading">
            <div className="jesta-settings-panel-icon">
              <SettingsIcon size={20} />
            </div>

            <div>
              <h2>System Settings</h2>

              <p>
                View the configuration currently used by
                your JESTA POS system.
              </p>
            </div>
          </div>
        </div>

        <div className="jesta-settings-system-grid">
          <div className="jesta-settings-system-card">
            <div className="jesta-settings-system-card-icon">
              <Globe size={19} />
            </div>

            <div>
              <span>Currency</span>

              <strong>
                {business?.currency ||
                  businessForm.currency ||
                  "KES"}
              </strong>

              <p>
                Used when displaying sales, expenses,
                purchases, and reports.
              </p>
            </div>
          </div>

          <div className="jesta-settings-system-card">
            <div className="jesta-settings-system-card-icon">
              <Globe size={19} />
            </div>

            <div>
              <span>Timezone</span>

              <strong>
                {business?.timezone ||
                  businessForm.timezone ||
                  "Africa/Nairobi"}
              </strong>

              <p>
                Used for business transaction dates and
                times.
              </p>
            </div>
          </div>

          <div className="jesta-settings-system-card">
            <div className="jesta-settings-system-card-icon">
              <Building2 size={19} />
            </div>

            <div>
              <span>Business Type</span>

              <strong>
                {business?.business_type ||
                  businessForm.business_type ||
                  "General Retail"}
              </strong>

              <p>
                Defines the type of business using JESTA
                POS.
              </p>
            </div>
          </div>

          <div className="jesta-settings-system-card">
            <div className="jesta-settings-system-card-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <span>System Version</span>

              <strong>JESTA POS 1.0</strong>

              <p>
                Current JESTA POS application version.
              </p>
            </div>
          </div>
        </div>

        <div className="jesta-settings-notice">
          <SettingsIcon size={18} />

          <div>
            <strong>Configuration management</strong>

            <p>
              Business-level configuration can be updated
              from the Business section of Settings.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "Business":
        return renderBusinessSection();

      case "Users":
        return renderUsersSection();

      case "Security":
        return renderSecuritySection();

      case "System":
        return renderSystemSection();

      default:
        return renderBusinessSection();
    }
  };

  return (
    <div className="jesta-page">
      <div className="jesta-page-header">
        <div>
          <div className="jesta-breadcrumb">
            Settings
          </div>

          <h1 className="jesta-page-title">
            Settings
          </h1>

          <p className="jesta-page-subtitle">
            Manage your business, account, security, and
            system configuration.
          </p>
        </div>
      </div>

      {(message || errorMessage) && (
        <div
          className={`jesta-settings-alert ${
            errorMessage
              ? "jesta-settings-alert-error"
              : "jesta-settings-alert-success"
          }`}
        >
          {errorMessage ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}

          <span>
            {errorMessage || message}
          </span>

          <button
            type="button"
            onClick={handleCloseMessage}
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="jesta-settings-layout">
        <aside className="jesta-settings-sidebar">
          <div className="jesta-settings-sidebar-title">
            Settings
          </div>

          <div className="jesta-settings-nav">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive =
                activeSection === section.name;

              return (
                <button
                  key={section.name}
                  type="button"
                  onClick={() => {
                    setActiveSection(section.name);
                    clearMessages();
                  }}
                  className={`jesta-settings-nav-item ${
                    isActive
                      ? "jesta-settings-nav-item-active"
                      : ""
                  }`}
                >
                  <div
                    className={`jesta-settings-nav-icon ${
                      isActive
                        ? "jesta-settings-nav-icon-active"
                        : ""
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="jesta-settings-nav-text">
                    <strong>{section.name}</strong>

                    <span>
                      {section.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="jesta-settings-content">
          {renderActiveSection()}
        </section>
      </div>
    </div>
  );
}

export default Settings;