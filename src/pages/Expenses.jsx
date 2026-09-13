import { Receipt, Plus, Search } from "lucide-react";

function Expenses() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Expenses</h2>
          <p>Track business expenses and operating costs.</p>
        </div>

        <button className="primary-button">
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search expenses..." />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="empty-state large">
          <Receipt size={42} />

          <h3>No expenses recorded</h3>

          <p>
            Business expenses will appear here.
          </p>

          <button className="primary-button">
            Add First Expense
          </button>
        </div>
      </div>
    </div>
  );
}

export default Expenses;