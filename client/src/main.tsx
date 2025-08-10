import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App.tsx";

console.log("main.tsx loading...");

const rootElement = document.getElementById('root');
console.log("Root element:", rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  console.log("Creating React root...");
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("React app rendered");
} else {
  console.error("Root element not found!");
}