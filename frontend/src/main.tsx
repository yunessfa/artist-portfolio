import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { BootstrapProvider } from "./store/bootstrap";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <BootstrapProvider>
          <App />
        </BootstrapProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
