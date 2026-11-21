import React from "react";
import { createRoot } from "react-dom/client";
import { SymbolBuilder } from "./components/symbol-builder/SymbolBuilder";
import "./styles.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><SymbolBuilder /></React.StrictMode>);
