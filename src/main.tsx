import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/source-serif-4/wght.css";
import "@fontsource-variable/source-serif-4/wght-italic.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
