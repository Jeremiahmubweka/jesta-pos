import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { supabase } from "./lib/supabase";

import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases";
import Expenses from "./pages/Expenses";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Session check error:", error);
      }

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);

        if (!session) {
          setActivePage("Dashboard");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (user) => {
    if (user) {
      setActivePage("Dashboard");
    }
  };

  if (loading) {
    return (
      <div className="jesta-auth-loading">
        <div className="jesta-auth-loading-card">
          <div className="jesta-auth-loading-logo">
            JESTA<span>.</span>
          </div>

          <div className="jesta-auth-spinner"></div>

          <p>Loading JESTA POS...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

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
      user={session.user}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;