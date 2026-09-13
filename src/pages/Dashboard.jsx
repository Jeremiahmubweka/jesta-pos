import {
  ShoppingCart,
  Package,
  TrendingUp,
  Receipt,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

function Dashboard() {
  const stats = [
    {
      title: "Today's Sales",
      value: "KSh 0.00",
      change: "No sales yet",
      positive: true,
      icon: ShoppingCart,
    },
    {
      title: "Inventory Value",
      value: "KSh 0.00",
      change: "Current stock value",
      positive: true,
      icon: Package,
    },
    {
      title: "Today's Expenses",
      value: "KSh 0.00",
      change: "No expenses yet",
      positive: true,
      icon: Receipt,
    },
    {
      title: "Today's Profit",
      value: "KSh 0.00",
      change: "Calculated from sales",
      positive: true,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Dashboard</h2>
          <p>
            Welcome to JESTA POS. Here's an overview of your business.
          </p>
        </div>

        <button className="primary-button">
          + New Sale
        </button>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="stat-card" key={stat.title}>
              <div className="stat-top">
                <div className="stat-icon">
                  <Icon size={21} />
                </div>

                <span className="stat-label">
                  Today
                </span>
              </div>

              <h3>{stat.value}</h3>

              <div className="stat-bottom">
                {stat.positive ? (
                  <ArrowUpRight size={15} />
                ) : (
                  <ArrowDownRight size={15} />
                )}

                <span>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card sales-overview">
          <div className="card-heading">
            <div>
              <h3>Sales Overview</h3>
              <p>Sales performance for the current period</p>
            </div>

            <select className="period-select">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This year</option>
            </select>
          </div>

          <div className="chart-placeholder">
            <div className="chart-lines">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="empty-chart">
              <TrendingUp size={32} />
              <strong>No sales data yet</strong>
              <p>
                Your sales chart will appear here once transactions
                are recorded.
              </p>
            </div>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="card-heading">
            <div>
              <h3>Recent Sales</h3>
              <p>Latest transactions</p>
            </div>

            <button className="text-button">
              View all
            </button>
          </div>

          <div className="empty-state">
            <ShoppingCart size={30} />
            <strong>No sales recorded</strong>
            <p>
              Completed sales will appear here.
            </p>
          </div>
        </section>
      </div>

      <div className="dashboard-grid bottom-grid">
        <section className="dashboard-card">
          <div className="card-heading">
            <div>
              <h3>Low Stock Items</h3>
              <p>Products that need attention</p>
            </div>

            <button className="text-button">
              Inventory
            </button>
          </div>

          <div className="empty-state">
            <Package size={30} />
            <strong>No low-stock alerts</strong>
            <p>
              Products requiring restocking will appear here.
            </p>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="card-heading">
            <div>
              <h3>Quick Actions</h3>
              <p>Common POS activities</p>
            </div>
          </div>

          <div className="quick-actions">
            <button>
              <ShoppingCart size={19} />
              <span>New Sale</span>
            </button>

            <button>
              <Package size={19} />
              <span>Add Product</span>
            </button>

            <button>
              <Truck size={19} />
              <span>New Purchase</span>
            </button>

            <button>
              <Receipt size={19} />
              <span>Add Expense</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;