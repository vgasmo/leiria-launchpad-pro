import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Validate environment variables at startup (fail-fast in dev)
import { validateEnv } from "./lib/env";
validateEnv();

createRoot(document.getElementById("root")!).render(<App />);
