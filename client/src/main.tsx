
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

console.log('Main.tsx loading...');

const container = document.getElementById('root');
if (!container) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
} else {
  console.log('Root element found, creating React root...');
  
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Error rendering React app:', error);
    container.innerHTML = `<div style="padding: 20px; color: red;">React Error: ${error}</div>`;
  }
}
