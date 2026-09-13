import React from "react";

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

function Layout({ activePage, setActivePage, children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Sales",
      icon: ShoppingCart,
    },
    {
      name: "Inventory",
      icon: Package,
    },
    {
      name: "Purchases",
      icon: Truck,
    },
    {
      name: "Expenses",
      icon: Receipt,
    },
    {
      name: "Customers",
      icon: Users,
    },
    {
      name: "Reports",
      icon: BarChart3,
    },
    {
      name: "Settings",
      icon: Settings,
    },
  ];

  const handleNavigation = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-logo">J</div>

            <div>
              <h1>JESTA</h1>
              <span>POINT OF SALE</span>
            </div>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-title">MAIN MENU</p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => handleNavigation(item.name)}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"></span>

            <div>
              <strong>System Online</strong>
              <small>Supabase connected</small>
            </div>
          </div>

          <button className="logout-button">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="topbar-title">
            <span>JESTA POS</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <div className="user-profile">
              <div className="user-avatar">A</div>

              <div className="user-details">
                <strong>Administrator</strong>
                <span>System Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;