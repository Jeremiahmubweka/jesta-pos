import { Users, Plus, Search } from "lucide-react";

function Customers() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Customers</h2>
          <p>Manage your customers and their information.</p>
        </div>

        <button className="primary-button">
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search customers..." />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="empty-state large">
          <Users size={42} />

          <h3>No customers yet</h3>

          <p>
            Customer records will appear here.
          </p>

          <button className="primary-button">
            Add First Customer
          </button>
        </div>
      </div>
    </div>
  );
}

export default Customers;