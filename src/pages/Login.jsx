import { useState } from "react";
import {
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("Login error:", error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    console.log("Login successful:", data.user);

    setLoading(false);

    if (onLogin) {
      onLogin(data.user);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background-shape login-background-shape-one"></div>
      <div className="login-background-shape login-background-shape-two"></div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo-mark">J</div>

          <div className="login-brand-text">
            <h1>
              JESTA<span>.</span>
            </h1>
            <p>BUSINESS MANAGEMENT SYSTEM</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to access your JESTA POS.</p>
        </div>

        {errorMessage && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Email address</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>

            <div className="password-input">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <span className="login-loading">
                <span className="login-loading-spinner"></span>
                Signing in...
              </span>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-security">
          <ShieldCheck size={16} />
          <span>Your business data is securely protected.</span>
        </div>

        <div className="login-footer">
          <span>JESTA POS</span>
          <span>Version 1.0</span>
        </div>
      </div>
    </div>
  );
}

export default Login;