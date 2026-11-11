
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker only in production.
// Normal Vite development remains unaffected.
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => {
        console.log("JESTA service worker registered.");
      })
      .catch((error) => {
        console.error(
          "JESTA service worker registration failed:",
          error
        );
      });
  });
}
