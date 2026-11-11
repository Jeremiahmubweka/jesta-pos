
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
import {
  getOfflineMetadata,
  saveOfflineMetadata,
} from "./lib/offline/database";

const SAVED_PAGE_KEY = "jesta_active_page";
const PROFILE_CACHE_PREFIX = "jesta_profile_";

function isNetworkError(error) {
  if (!error) return !navigator.onLine;

  const message = String(
    error.message || error
  ).toLowerCase();

  return (
    !navigator.onLine ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed") ||
    message.includes("internet disconnected")
  );
}

function AppContent() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const [activePage, setActivePage] = useState(() => {
    const savedPage = localStorage.getItem(SAVED_PAGE_KEY);
    return savedPage || "Dashboard";
  });

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Session check error:", error);
        }

        setSession(currentSession || null);
      } catch (error) {
        console.error("Could not retrieve local session:", error);

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession || null);

        if (!currentSession) {
          setUserProfile(null);
          setOfflineMode(false);
          setActivePage("Dashboard");
          localStorage.removeItem(SAVED_PAGE_KEY);
        }
      }
    );

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
        setOfflineMode(false);
        return;
      }

      setProfileLoading(true);

      const cacheKey = `${PROFILE_CACHE_PREFIX}${session.user.id}`;

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("User profile error:", error);

          if (isNetworkError(error)) {
            const cachedProfile =
              await getOfflineMetadata(cacheKey);

            if (!mounted) return;

            if (
              cachedProfile &&
              cachedProfile.id === session.user.id &&
              cachedProfile.is_active === true &&
              cachedProfile.business_id !== null &&
              cachedProfile.business_id !== undefined
            ) {
              setUserProfile(cachedProfile);
              setOfflineMode(true);
              setProfileLoading(false);

              console.warn(
                "JESTA is using the previously cached user profile. Server verification is unavailable."
              );

              return;
            }

            setUserProfile(null);
            setOfflineMode(false);
            setProfileLoading(false);

            console.error(
              "No valid cached user profile is available for offline access."
            );

            return;
          }

          if (mounted) {
            setUserProfile(null);
            setOfflineMode(false);
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

        // Save only a profile successfully retrieved from Supabase.
        await saveOfflineMetadata(cacheKey, data);

        if (mounted) {
          setUserProfile(data);
          setOfflineMode(false);
          setProfileLoading(false);
        }
      } catch (error) {
        console.error("Profile loading failed:", error);

        if (isNetworkError(error)) {
          try {
            const cachedProfile =
              await getOfflineMetadata(cacheKey);

            if (!mounted) return;

            if (
              cachedProfile &&
              cachedProfile.id === session.user.id &&
              cachedProfile.is_active === true &&
              cachedProfile.business_id !== null &&
              cachedProfile.business_id !== undefined
            ) {
              setUserProfile(cachedProfile);
              setOfflineMode(true);
            } else {
              setUserProfile(null);
              setOfflineMode(false);
            }
          } catch (cacheError) {
            console.error(
              "Could not retrieve the cached user profile:",
              cacheError
            );

            if (mounted) {
              setUserProfile(null);
              setOfflineMode(false);
            }
          }
        } else if (mounted) {
          setUserProfile(null);
          setOfflineMode(false);
        }

        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    loadUserProfile();

    return () => {
      mounted = false;
    };
  }, [session]);

  const handleLogin = () => {
    const savedPage = localStorage.getItem(SAVED_PAGE_KEY);
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

          <p>
            Connect to the internet and try again.
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
          <Dashboard setActivePage={setActivePage} />
        );

      case "Expenses":
        return userRole === "admin" ? (
          <Expenses />
        ) : (
          <Dashboard setActivePage={setActivePage} />
        );

      case "Customers":
        return <Customers />;

      case "Reports":
        return userRole === "admin" ? (
          <Reports />
        ) : (
          <Dashboard setActivePage={setActivePage} />
        );

      case "Settings":
        return userRole === "admin" ? (
          <Settings />
        ) : (
          <Dashboard setActivePage={setActivePage} />
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
      {offlineMode && (
        <div
          style={{
            padding: "10px 16px",
            background: "#fff3cd",
            color: "#664d03",
            borderBottom: "1px solid #ffecb5",
            fontSize: "13px",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          OFFLINE MODE — Using previously cached account information.
          Server verification is unavailable.
        </div>
      )}

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
