import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ShoppingBag,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";

import { useState } from "react";
import { supabase } from "../lib/supabase";

function Layout({
  activePage,
  setActivePage,
  children,
  user,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigation = [
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
      icon: ShoppingBag,
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
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
      return;
    }
  };

  const userEmail = user?.email || "Administrator";

  const userInitial = userEmail
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--jesta-bg)]">
      {/* =====================================================
          MOBILE OVERLAY
          ===================================================== */}

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[250px] flex-col bg-[var(--jesta-sidebar)] text-white transition-transform duration-200 ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}

        <div className="flex h-[68px] items-center justify-between border-b border-white/10 px-6">
          <div>
            <div className="text-2xl font-black tracking-tight">
              JESTA
              <span className="text-[var(--jesta-primary)]">
                .
              </span>
            </div>

            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              POS SYSTEM
            </div>
          </div>

          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Main Menu
          </div>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.name;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() =>
                    handleNavigation(item.name)
                  }
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[var(--jesta-primary)] text-white shadow-sm"
                      : "text-slate-300 hover:bg-[var(--jesta-sidebar-hover)] hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.4 : 2}
                    className={
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-white"
                    }
                  />

                  <span className="flex-1">
                    {item.name}
                  </span>

                  {isActive && (
                    <ChevronRight size={15} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}

        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs font-semibold text-white">
              JESTA POS
            </div>

            <div className="mt-1 text-[11px] text-slate-400">
              Business Management System
            </div>

            <div className="mt-3 text-[10px] text-slate-500">
              Version 1.0
            </div>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN AREA
          ===================================================== */}

      <div className="min-h-screen lg:ml-[250px]">
        {/* Header */}

        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[var(--jesta-border)] bg-white/95 px-4 backdrop-blur sm:px-6">
          {/* Left */}

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              className="rounded-lg border border-[var(--jesta-border)] p-2 text-[var(--jesta-text-secondary)] hover:bg-[var(--jesta-surface-soft)] lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div>
              <div className="text-sm font-semibold text-[var(--jesta-text)]">
                {activePage}
              </div>

              <div className="text-xs text-[var(--jesta-text-muted)]">
                Manage your business efficiently
              </div>
            </div>
          </div>

          {/* Right */}

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-[var(--jesta-text)]">
                Administrator
              </div>

              <div className="max-w-[180px] truncate text-xs text-[var(--jesta-text-muted)]">
                {userEmail}
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--jesta-primary-light)] text-sm font-bold text-[var(--jesta-primary-dark)]">
              {userInitial}
            </div>

            {/* Logout */}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Log out"
              aria-label="Log out"
              className="group flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--jesta-border)] bg-white text-[var(--jesta-text-secondary)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut
                size={17}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </header>

        {/* Page Content */}

        <main className="min-h-[calc(100vh-68px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;