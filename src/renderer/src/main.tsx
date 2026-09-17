import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter/index.css";
import { App } from "./App";
import { GrimEasterEgg } from "./GrimEasterEgg";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <GrimEasterEgg />
  </React.StrictMode>,
);
