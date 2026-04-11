// src/main.jsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

const isDesktopRuntime =
  typeof window !== "undefined" &&
  (window?.desktopBridge?.isDesktop === true || window.location.protocol === "file:");

const Router = isDesktopRuntime ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);
