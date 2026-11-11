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

import { ThemeProvider } from "./theme/ThemeProvider";

const SAVED_PAGE_KEY = "jesta_active_page";

function AppContent() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [activePage, setActivePage] = useState(() => {
    const savedPage = localStorage.getItem(SAVED_PAGE_KEY);

    return savedPage || "Dashboard";
  });

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

      if (!mounted) return;

      setSession(session);
      setLoading(false);
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);

      if (!session) {
        setUserProfile(null);
        setActivePage("Dashboard");
        localStorage.removeItem(SAVED_PAGE_KEY);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activePage) {
      localStorage.setItem(SAVED_PAGE_KEY, activePage);
    }
  }, [activePage]);

  useEffect(() => {
    let mounted = true;

    const loadUserProfile = async () => {
      if (!session?.user?.id) {
        setUserProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("User profile error:", error);

        if (mounted) {
          setUserProfile(null);
          setProfileLoading(false);
        }

        return;
      }

      if (!data) {
        console.error(
          "No user profile found for this account."
        );

        await supabase.auth.signOut({
          scope: "local",
        });

        if (mounted) {
          setUserProfile(null);
          setProfileLoading(false);
        }

        return;
      }

      if (!data.is_active) {
        console.error(
          "This user account is inactive."
        );

        await supabase.auth.signOut({
          scope: "local",
        });

        if (mounted) {
          setUserProfile(null);
          setProfileLoading(false);
        }

        return;
      }

      if (mounted) {
        setUserProfile(data);

        /*
         * The user's last active page is now restored
         * from localStorage instead of always starting
         * on Dashboard.
         */

        setProfileLoading(false);
      }
    };

    loadUserProfile();

    return () => {
      mounted = false;
    };
  }, [session]);

  const handleLogin = () => {
    const savedPage =
      localStorage.getItem(SAVED_PAGE_KEY);

    setActivePage(savedPage || "Dashboard");
  };

  if (loading || (session && profileLoading)) {
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

  if (!userProfile) {
    return (
      <div className="jesta-auth-loading">
        <div className="jesta-auth-loading-card">
          <div className="jesta-auth-loading-logo">
            JESTA<span>.</span>
          </div>

          <p>
            Your JESTA user profile could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  const userRole =
    userProfile.role?.toLowerCase() === "admin"
      ? "admin"
      : "employee";

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <Dashboard
            setActivePage={setActivePage}
          />
        );

      case "Sales":
        return <Sales />;

      case "Inventory":
        return <Inventory />;

      case "Purchases":
        return userRole === "admin" ? (
          <Purchases />
        ) : (
          <Dashboard
            setActivePage={setActivePage}
          />
        );

      case "Expenses":
        return userRole === "admin" ? (
          <Expenses />
        ) : (
          <Dashboard
            setActivePage={setActivePage}
          />
        );

      case "Customers":
        return <Customers />;

      case "Reports":
        return userRole === "admin" ? (
          <Reports />
        ) : (
          <Dashboard
            setActivePage={setActivePage}
          />
        );

      case "Settings":
        return userRole === "admin" ? (
          <Settings />
        ) : (
          <Dashboard
            setActivePage={setActivePage}
          />
        );

      default:
        return (
          <Dashboard
            setActivePage={setActivePage}
          />
        );
    }
  };

  return (
    <Layout
      activePage={activePage}
      setActivePage={setActivePage}
      user={session.user}
      userProfile={userProfile}
      userRole={userRole}
    >
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;