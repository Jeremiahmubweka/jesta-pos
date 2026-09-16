import { useState } from "react";

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";

function Layout({
  activePage,
  setActivePage,
  user,
  onLogout,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Sales", icon: ShoppingCart },
    { name: "Inventory", icon: Package },
    { name: "Purchases", icon: Truck },
    { name: "Expenses", icon: Receipt },
    { name: "Customers", icon: Users },
    { name: "Reports", icon: BarChart3 },
    { name: "Settings", icon: Settings },
  ];

  const handleNavigation = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await onLogout();
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Administrator";

  return (
    <div className="app">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="logo">
          <h1>
            JESTA<span>.</span>
          </h1>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav>
          <div className="nav-section-title">
            MAIN MENU
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={
                  activePage === item.name
                    ? "active"
                    : ""
                }
                onClick={() =>
                  handleNavigation(item.name)
                }
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <strong>JESTA POS</strong>
          <span>Business Management System</span>
          <small>Version 1.0</small>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div className="header-title">
              <h1>{activePage}</h1>
              <p>Manage your business efficiently</p>
            </div>
          </div>

          <div className="user-area">
            <div className="user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="user-info">
              <strong>{displayName}</strong>
              <span>{user?.email || "JESTA POS"}</span>
            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;