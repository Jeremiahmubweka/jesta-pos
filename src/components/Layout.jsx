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
} from "lucide-react";

function Layout({ activePage, setActivePage, children }) {
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
  };

  return (
    <div className="min-h-screen bg-[var(--jesta-bg)]">
      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[250px] flex-col bg-[var(--jesta-sidebar)] text-white">
        {/* Brand */}
        <div className="flex h-[68px] items-center border-b border-white/10 px-6">
          <div>
            <div className="text-2xl font-black tracking-tight">
              JESTA<span className="text-[var(--jesta-primary)]">.</span>
            </div>

            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              POS SYSTEM
            </div>
          </div>
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
                  onClick={() => handleNavigation(item.name)}
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

                  <span className="flex-1">{item.name}</span>

                  {isActive && <ChevronRight size={15} />}
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
          MOBILE SIDEBAR OVERLAY
          ===================================================== */}

      <div className="hidden">
        <button aria-label="Open menu">
          <Menu size={22} />
        </button>

        <button aria-label="Close menu">
          <X size={22} />
        </button>
      </div>

      {/* =====================================================
          MAIN AREA
          ===================================================== */}

      <div className="ml-[250px] min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-[var(--jesta-border)] bg-white/95 px-6 backdrop-blur">
          {/* Left */}
          <div>
            <div className="text-sm font-semibold text-[var(--jesta-text)]">
              {activePage}
            </div>

            <div className="text-xs text-[var(--jesta-text-muted)]">
              Manage your business efficiently
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-[var(--jesta-text)]">
                Administrator
              </div>

              <div className="text-xs text-[var(--jesta-text-muted)]">
                JESTA POS
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--jesta-primary-light)] text-sm font-bold text-[var(--jesta-primary-dark)]">
              A
            </div>
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