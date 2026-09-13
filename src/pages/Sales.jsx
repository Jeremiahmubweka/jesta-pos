import { ShoppingCart, Plus, Search } from "lucide-react";

function Sales() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Sales</h2>
          <p>Record and manage customer sales.</p>
        </div>

        <button className="primary-button">
          <Plus size={18} />
          New Sale
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search sales..." />
        </div>

        <select className="period-select">
          <option>Today</option>
          <option>This week</option>
          <option>This month</option>
        </select>
      </div>

      <div className="dashboard-card">
        <div className="empty-state large">
          <ShoppingCart size={42} />

          <h3>No sales yet</h3>

          <p>
            Your completed sales transactions will appear here.
          </p>

          <button className="primary-button">
            Create First Sale
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sales;