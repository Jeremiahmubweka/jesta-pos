import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
} from "lucide-react";

function SettingsPage() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Settings</h2>
          <p>Manage your JESTA POS configuration.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-icon">
            <Building2 size={24} />
          </div>

          <div>
            <h3>Business</h3>

            <p>
              Manage business name, contact details and other
              business information.
            </p>
          </div>

          <button>
            Manage Business
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-icon">
            <Users size={24} />
          </div>

          <div>
            <h3>Users</h3>

            <p>
              Manage employees, administrators and access levels.
            </p>
          </div>

          <button>
            Manage Users
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-icon">
            <ShieldCheck size={24} />
          </div>

          <div>
            <h3>Security</h3>

            <p>
              Manage permissions and security settings.
            </p>
          </div>

          <button>
            Security Settings
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-icon">
            <Settings size={24} />
          </div>

          <div>
            <h3>System</h3>

            <p>
              Configure currency, receipts and general POS settings.
            </p>
          </div>

          <button>
            System Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;