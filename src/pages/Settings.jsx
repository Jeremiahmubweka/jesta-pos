import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  ChevronRight,
  Store,
  UserCog,
  LockKeyhole,
  SlidersHorizontal,
  Info,
} from "lucide-react";

function SettingsPage() {
  const settingsSections = [
    {
      title: "Business",
      description:
        "Manage your business name, contact details and other business information.",
      icon: Building2,
      iconClass: "jesta-settings-icon-business",
      buttonLabel: "Manage Business",
    },
    {
      title: "Users",
      description:
        "Manage employees, administrators and access levels for your business.",
      icon: Users,
      iconClass: "jesta-settings-icon-users",
      buttonLabel: "Manage Users",
    },
    {
      title: "Security",
      description:
        "Manage permissions, account security and access settings.",
      icon: ShieldCheck,
      iconClass: "jesta-settings-icon-security",
      buttonLabel: "Security Settings",
    },
    {
      title: "System",
      description:
        "Configure currency, receipts and general JESTA POS settings.",
      icon: Settings,
      iconClass: "jesta-settings-icon-system",
      buttonLabel: "System Settings",
    },
  ];

  return (
    <div className="jesta-settings-page">
      {/* PAGE HEADER */}
      <div className="jesta-settings-header">
        <div className="jesta-settings-heading">
          <div className="jesta-settings-title-icon">
            <Settings size={24} />
          </div>

          <div>
            <h2>Settings</h2>

            <p>
              Manage your JESTA POS configuration and business
              preferences.
            </p>
          </div>
        </div>
      </div>

      {/* SETTINGS OVERVIEW */}
      <div className="jesta-settings-intro">
        <div className="jesta-settings-intro-icon">
          <SlidersHorizontal size={20} />
        </div>

        <div>
          <strong>JESTA POS Configuration</strong>

          <p>
            Customize your POS environment to match the way your
            business operates.
          </p>
        </div>
      </div>

      {/* SETTINGS GRID */}
      <div className="jesta-settings-grid">
        {settingsSections.map((section) => {
          const Icon = section.icon;

          return (
            <div
              className="jesta-settings-card"
              key={section.title}
            >
              <div
                className={`jesta-settings-card-icon ${section.iconClass}`}
              >
                <Icon size={23} />
              </div>

              <div className="jesta-settings-card-content">
                <div>
                  <h3>{section.title}</h3>

                  <p>{section.description}</p>
                </div>

                <button
                  type="button"
                  className="jesta-settings-action"
                >
                  <span>{section.buttonLabel}</span>

                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SETTINGS CATEGORIES */}
      <div className="jesta-settings-secondary-grid">
        <div className="jesta-settings-info-card">
          <div className="jesta-settings-info-icon">
            <Store size={20} />
          </div>

          <div>
            <span>Business Management</span>

            <p>
              Keep your business information organized and ready
              for use across JESTA POS.
            </p>
          </div>
        </div>

        <div className="jesta-settings-info-card">
          <div className="jesta-settings-info-icon">
            <UserCog size={20} />
          </div>

          <div>
            <span>User Management</span>

            <p>
              Control who can access your POS system and the
              functions available to them.
            </p>
          </div>
        </div>

        <div className="jesta-settings-info-card">
          <div className="jesta-settings-info-icon">
            <LockKeyhole size={20} />
          </div>

          <div>
            <span>Security & Access</span>

            <p>
              Protect your business data with appropriate account
              and permission controls.
            </p>
          </div>
        </div>
      </div>

      {/* SYSTEM INFORMATION */}
      <div className="jesta-settings-system-card">
        <div className="jesta-settings-system-icon">
          <Info size={20} />
        </div>

        <div className="jesta-settings-system-content">
          <div>
            <h3>JESTA POS</h3>

            <p>
              Business Management System
            </p>
          </div>

          <span className="jesta-settings-version">
            Version 1.0
          </span>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;