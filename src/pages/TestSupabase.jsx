import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function TestSupabase() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkUserAndBusiness() {
      setLoading(true);
      setErrorMessage("");

      // Get logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError);

        setErrorMessage(userError.message);
        setLoading(false);

        return;
      }

      if (!user) {
        setErrorMessage("No authenticated user found.");
        setLoading(false);

        return;
      }

      console.log("Authenticated user:", user);

      setUser(user);

      // Get the business connected to this user
      const { data, error } = await supabase
        .from("user_profiles")
        .select(`
          full_name,
          role,
          business_id,
          businesses (
            id,
            name,
            business_type,
            currency,
            timezone
          )
        `)
        .eq("id", user.id)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error(
          "Business profile error:",
          error
        );

        setErrorMessage(error.message);
        setLoading(false);

        return;
      }

      console.log("User profile:", data);

      setBusiness(data);
      setLoading(false);
    }

    checkUserAndBusiness();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-card">
          <div className="empty-state">
            <h3>Checking account...</h3>
            <p>
              Verifying your JESTA business connection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h2>System Verification</h2>
          <p>
            Checking authentication and business
            connection.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="inventory-message error">
          {errorMessage}
        </div>
      )}

      <div className="dashboard-card">
        <div className="inventory-card-header">
          <div>
            <h3>Authentication</h3>
            <p>
              Current Supabase authenticated user.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="settings-card">
            <span className="settings-label">
              Email
            </span>

            <strong>
              {user?.email || "Not found"}
            </strong>
          </div>

          <div className="settings-card">
            <span className="settings-label">
              User ID
            </span>

            <strong>
              {user?.id || "Not found"}
            </strong>
          </div>
        </div>
      </div>

      {business && (
        <div className="dashboard-card">
          <div className="inventory-card-header">
            <div>
              <h3>Business Connection</h3>
              <p>
                Business connected to your user
                profile.
              </p>
            </div>
          </div>

          <div className="settings-grid">
            <div className="settings-card">
              <span className="settings-label">
                Business
              </span>

              <strong>
                {business.businesses?.name ||
                  "Not found"}
              </strong>
            </div>

            <div className="settings-card">
              <span className="settings-label">
                Business ID
              </span>

              <strong>
                {business.business_id}
              </strong>
            </div>

            <div className="settings-card">
              <span className="settings-label">
                Business Type
              </span>

              <strong>
                {business.businesses
                  ?.business_type || "Not found"}
              </strong>
            </div>

            <div className="settings-card">
              <span className="settings-label">
                Currency
              </span>

              <strong>
                {business.businesses?.currency ||
                  "Not found"}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestSupabase;