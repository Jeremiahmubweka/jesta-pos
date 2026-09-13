import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Receipt,
} from "lucide-react";

function Reports() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>Reports</h2>
          <p>
            Understand your business performance.
          </p>
        </div>

        <select className="period-select">
          <option>This month</option>
          <option>This week</option>
          <option>This year</option>
        </select>
      </div>

      <div className="report-grid">
        <div className="report-card">
          <ShoppingCart size={25} />
          <span>Total Sales</span>
          <strong>KSh 0.00</strong>
        </div>

        <div className="report-card">
          <Receipt size={25} />
          <span>Total Expenses</span>
          <strong>KSh 0.00</strong>
        </div>

        <div className="report-card">
          <TrendingUp size={25} />
          <span>Net Profit</span>
          <strong>KSh 0.00</strong>
        </div>

        <div className="report-card">
          <BarChart3 size={25} />
          <span>Transactions</span>
          <strong>0</strong>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="empty-state large">
          <BarChart3 size={42} />

          <h3>Reports will appear here</h3>

          <p>
            Once your transactions are connected to Supabase,
            JESTA will generate your business reports automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Reports;