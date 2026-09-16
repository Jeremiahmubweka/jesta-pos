import { useEffect, useState } from "react";

import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases";
import Expenses from "./pages/Expenses";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import TestSupabase from "./pages/TestSupabase";
import Login from "./pages/Login";

import { supabase } from "./lib/supabase";

function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] =
    useState(true);

  const [activePage, setActivePage] =
    useState("Dashboard");

  useEffect(() => {
    async function getInitialSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setCheckingSession(false);
    }

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard />;

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

      case "Test Supabase":
        return <TestSupabase />;

      default:
        return <Dashboard />;
    }
  };

  if (checkingSession) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="empty-state">
            <h3>Loading JESTA POS...</h3>
            <p>Checking your session.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Layout
      activePage={activePage}
      setActivePage={setActivePage}
      user={session.user}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;