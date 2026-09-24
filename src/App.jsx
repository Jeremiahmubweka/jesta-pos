import { useState } from "react";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases";
import Expenses from "./pages/Expenses";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard setActivePage={setActivePage} />;

      case "Sales":
        return <Sales />;

      case "Inventory":
        return <Inventory />;

      case "Purchases":
        return <Purchases />;

      case "Expenses":
        return <Expenses />;

      case "Customers":
        return <Customers />;

      case "Reports":
        return <Reports />;

      case "Settings":
        return <Settings />;

      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <Layout
      activePage={activePage}
      setActivePage={setActivePage}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;