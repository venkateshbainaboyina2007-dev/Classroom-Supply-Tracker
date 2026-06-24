import { createRoot } from "react-dom/client";
import App from "./App";
import { setBaseUrl } from "@workspace/api-client-react";
import "./index.css";

// On GitHub Pages, API calls must go to the deployed Render backend
if (window.location.hostname.includes("github.io")) {
  setBaseUrl("https://classroom-supply-tracker-api.onrender.com");
}

createRoot(document.getElementById("root")).render(<App />);
