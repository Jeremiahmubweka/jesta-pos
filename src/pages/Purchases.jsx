import { Truck, Plus, Search } from "lucide-react";

function Purchases() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Purchases</h2>
          <p>Manage suppliers and stock purchases.</p>
        </div>

        <button className="primary-button">
          <Plus size={18} />
          New Purchase
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search purchases..." />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="empty-state large">
          <Truck size={42} />

          <h3>No purchases yet</h3>

          <p>
            Purchase records will appear here.
          </p>

          <button className="primary-button">
            Create Purchase
          </button>
        </div>
      </div>
    </div>
  );
}

export default Purchases;