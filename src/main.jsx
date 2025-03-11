import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Calendar from "./Calendar.jsx";
import Sidebar from "./Sidebar.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Calendar />
    <Sidebar />
  </React.StrictMode>,
);
