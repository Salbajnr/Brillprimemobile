import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App.tsx";
import './index.css';

console.log("main.tsx loading...");

const rootElement = document.getElementById('root');
console.log("Root element:", rootElement);

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log("Creating React root...");
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React app rendered");
  } catch (error) {
    console.error("Error rendering app:", error);
    // Fallback direct DOM manipulation
    rootElement.innerHTML = '<div style="padding: 20px; background: blue; color: white; text-align: center;">BrillPrime Loading Error: ' + (error instanceof Error ? error.message : String(error)) + '</div>';
  }
} else {
  console.error("Root element not found!");
  document.body.innerHTML = '<div style="padding: 20px; background: red; color: white;">Root element not found!</div>';
}