import { Package, Plus, Search } from "lucide-react";

function Inventory() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Inventory</h2>
          <p>Manage products, stock levels and prices.</p>
        </div>

        <button className="primary-button">
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search products..." />
        </div>

        <select className="period-select">
          <option>All Products</option>
          <option>Low Stock</option>
          <option>Out of Stock</option>
        </select>
      </div>

      <div className="dashboard-card">
        <div className="empty-state large">
          <Package size={42} />
          <h3>Inventory is ready</h3>
          <p>
            Products and stock levels will appear here.
          </p>

          <button className="primary-button">
            Add First Product
          </button>
        </div>
      </div>
    </div>
  );
}

export default Inventory;