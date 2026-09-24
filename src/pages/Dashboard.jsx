import {
  ShoppingCart,
  Package,
  TrendingUp,
  Receipt,
  Truck,
  ArrowUpRight,
  BarChart3,
  AlertTriangle,
  Plus,
} from "lucide-react";

function Dashboard({ setActivePage }) {
  const stats = [
    {
      title: "Today's Sales",
      value: "KSh 0.00",
      change: "No sales yet",
      icon: ShoppingCart,
      className: "sales",
    },
    {
      title: "Inventory Value",
      value: "KSh 0.00",
      change: "Current stock value",
      icon: Package,
      className: "inventory",
    },
    {
      title: "Today's Expenses",
      value: "KSh 0.00",
      change: "No expenses yet",
      icon: Receipt,
      className: "expenses",
    },
    {
      title: "Today's Profit",
      value: "KSh 0.00",
      change: "Calculated from sales",
      icon: TrendingUp,
      className: "profit",
    },
  ];

  return (
    <div className="jesta-dashboard-page">
      <div className="jesta-dashboard-header">
        <div className="jesta-dashboard-heading">
          <div className="jesta-dashboard-brand-icon">
            <BarChart3 size={22} />
          </div>

          <div>
            <span className="jesta-dashboard-eyebrow">JESTA POS</span>
            <h1>Dashboard</h1>
            <p>Welcome back. Here's an overview of your business.</p>
          </div>
        </div>

        <button
          type="button"
          className="jesta-dashboard-new-sale"
          onClick={() => setActivePage("Sales")}
        >
          <Plus size={16} />
          New Sale
        </button>
      </div>

      <div className="jesta-dashboard-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className={`jesta-dashboard-stat-card ${stat.className}`}
            >
              <div className="jesta-dashboard-stat-top">
                <div className="jesta-dashboard-stat-icon">
                  <Icon size={20} />
                </div>

                <span className="jesta-dashboard-stat-period">
                  Today
                </span>
              </div>

              <div className="jesta-dashboard-stat-content">
                <span className="jesta-dashboard-stat-title">
                  {stat.title}
                </span>

                <h2>{stat.value}</h2>

                <div className="jesta-dashboard-stat-change positive">
                  <ArrowUpRight size={14} />
                  <span>{stat.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="jesta-dashboard-main-grid">
        <section className="jesta-dashboard-card">
          <div className="jesta-dashboard-card-header">
            <div>
              <span className="jesta-dashboard-section-label">
                PERFORMANCE
              </span>

              <h3>Sales Overview</h3>

              <p>
                Sales performance for the current period
              </p>
            </div>

            <select className="jesta-dashboard-period-select">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This year</option>
            </select>
          </div>

          <div className="jesta-dashboard-chart">
            <div className="jesta-dashboard-chart-grid">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="jesta-dashboard-empty-chart">
              <div className="jesta-dashboard-empty-icon">
                <TrendingUp size={25} />
              </div>

              <strong>No sales data yet</strong>

              <p>
                Your sales chart will appear here once
                transactions are recorded.
              </p>

              <button
                type="button"
                className="jesta-dashboard-outline-button"
                onClick={() => setActivePage("Sales")}
              >
                <ShoppingCart size={15} />
                Start Making Sales
              </button>
            </div>
          </div>
        </section>

        <section className="jesta-dashboard-card">
          <div className="jesta-dashboard-card-header">
            <div>
              <span className="jesta-dashboard-section-label">
                TRANSACTIONS
              </span>

              <h3>Recent Sales</h3>

              <p>Latest transactions</p>
            </div>

            <button
              type="button"
              className="jesta-dashboard-text-button"
              onClick={() => setActivePage("Sales")}
            >
              View all
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="jesta-dashboard-empty-state">
            <div className="jesta-dashboard-empty-icon">
              <ShoppingCart size={25} />
            </div>

            <strong>No sales recorded</strong>

            <p>
              Completed sales will appear here.
            </p>
          </div>
        </section>
      </div>

      <div className="jesta-dashboard-bottom-grid">
        <section className="jesta-dashboard-card">
          <div className="jesta-dashboard-card-header">
            <div>
              <span className="jesta-dashboard-section-label">
                INVENTORY
              </span>

              <h3>Low Stock Items</h3>

              <p>
                Products that need attention
              </p>
            </div>

            <button
              type="button"
              className="jesta-dashboard-text-button"
              onClick={() => setActivePage("Inventory")}
            >
              Inventory
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="jesta-dashboard-empty-state">
            <div className="jesta-dashboard-empty-icon warning">
              <AlertTriangle size={25} />
            </div>

            <strong>No low-stock alerts</strong>

            <p>
              Products requiring restocking will appear here.
            </p>
          </div>
        </section>

        <section className="jesta-dashboard-card">
          <div className="jesta-dashboard-card-header">
            <div>
              <span className="jesta-dashboard-section-label">
                SHORTCUTS
              </span>

              <h3>Quick Actions</h3>

              <p>
                Common POS activities
              </p>
            </div>
          </div>

          <div className="jesta-dashboard-actions">
            <button
              type="button"
              className="jesta-dashboard-action"
              onClick={() => setActivePage("Sales")}
            >
              <span className="jesta-dashboard-action-icon">
                <ShoppingCart size={18} />
              </span>

              <span className="jesta-dashboard-action-text">
                <strong>New Sale</strong>
                <span>Record a transaction</span>
              </span>

              <ArrowUpRight
                size={15}
                className="jesta-dashboard-action-arrow"
              />
            </button>

            <button
              type="button"
              className="jesta-dashboard-action product-action"
              onClick={() => setActivePage("Inventory")}
            >
              <span className="jesta-dashboard-action-icon">
                <Package size={18} />
              </span>

              <span className="jesta-dashboard-action-text">
                <strong>Add Product</strong>
                <span>Manage your stock</span>
              </span>

              <ArrowUpRight
                size={15}
                className="jesta-dashboard-action-arrow"
              />
            </button>

            <button
              type="button"
              className="jesta-dashboard-action purchase-action"
              onClick={() => setActivePage("Purchases")}
            >
              <span className="jesta-dashboard-action-icon">
                <Truck size={18} />
              </span>

              <span className="jesta-dashboard-action-text">
                <strong>New Purchase</strong>
                <span>Record incoming stock</span>
              </span>

              <ArrowUpRight
                size={15}
                className="jesta-dashboard-action-arrow"
              />
            </button>

            <button
              type="button"
              className="jesta-dashboard-action expense-action"
              onClick={() => setActivePage("Expenses")}
            >
              <span className="jesta-dashboard-action-icon">
                <Receipt size={18} />
              </span>

              <span className="jesta-dashboard-action-text">
                <strong>Add Expense</strong>
                <span>Record a business expense</span>
              </span>

              <ArrowUpRight
                size={15}
                className="jesta-dashboard-action-arrow"
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;