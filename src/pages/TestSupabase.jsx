import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function TestSupabase() {
  const [status, setStatus] = useState(
    "Testing Supabase connection..."
  );

  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .limit(10);

      if (error) {
        console.error("Supabase error:", error);

        setStatus(
          `Connection failed: ${error.message}`
        );

        return;
      }

      console.log("Businesses returned:", data);

      setBusinesses(data || []);

      setStatus(
        `Connected successfully! Found ${
          data?.length || 0
        } business(es).`
      );
    }

    testConnection();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
        background: "#f5f7fb",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "40px",
          borderRadius: "12px",
          maxWidth: "600px",
          width: "100%",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
        }}
      >
        <h1 style={{ marginBottom: "10px" }}>
          JESTA POS
        </h1>

        <p
          style={{
            marginBottom: "25px",
            color: "#64748b",
          }}
        >
          Supabase Connection Test
        </p>

        <div
          style={{
            padding: "15px",
            background: "#f1f5f9",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {status}
        </div>

        {businesses.length > 0 && (
          <div>
            <h3 style={{ marginBottom: "10px" }}>
              Businesses found:
            </h3>

            {businesses.map((business) => (
              <div
                key={business.id}
                style={{
                  padding: "10px",
                  borderBottom:
                    "1px solid #e2e8f0",
                }}
              >
                {business.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TestSupabase;