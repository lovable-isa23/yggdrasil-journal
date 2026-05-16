import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { LoadingProvider } from "./contexts/LoadingContext";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <LoadingProvider>
      <App />
    </LoadingProvider>
  </HelmetProvider>
);
