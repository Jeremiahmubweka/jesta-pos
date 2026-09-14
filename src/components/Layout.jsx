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
} from "lucide-react";

import { useState } from "react";

function Layout({ activePage, setActivePage, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="app">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>

        {/* LOGO */}
        <div className="logo">
          <h1>
            JESTA<span>.</span>
          </h1>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        {/* NAVIGATION */}
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

        {/* SIDEBAR FOOTER */}
        <div className="sidebar-footer">
          <strong>JESTA POS</strong>
          <span>Business Management System</span>
          <small>Version 1.0</small>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="main-content">

        {/* HEADER */}
        <header className="top-header">

          <div className="header-left">

            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div className="header-title">
              <h1>
                {activePage}
              </h1>

              <p>
                Manage your business efficiently
              </p>
            </div>

          </div>

          {/* USER AREA */}
          <div className="user-area">

            <div className="user-avatar">
              A
            </div>

            <div className="user-info">
              <strong>Administrator</strong>
              <span>JESTA POS</span>
            </div>

          </div>

        </header>

        {/* PAGE CONTENT */}
        <main className="page-content">
          {children}
        </main>

      </div>
    </div>
  );
}

export default Layout;