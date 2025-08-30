
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Simple test component to verify React is working
const TestApp = () => {
  console.log('TestApp rendering...');
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      backgroundColor: '#f0f0f0'
    }}>
      <h1 style={{ color: '#333' }}>BrillPrime App Loading Test</h1>
      <p>✅ React is working</p>
      <p>✅ JavaScript is executing</p>
      <p>✅ Build process completed successfully</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e8f5e8', 
        borderRadius: '5px' 
      }}>
        <h2>Debug Information:</h2>
        <ul>
          <li>Current URL: {window.location.href}</li>
          <li>User Agent: {navigator.userAgent}</li>
          <li>Timestamp: {new Date().toISOString()}</li>
        </ul>
      </div>
    </div>
  );
};

console.log('Main.tsx loading...');

const container = document.getElementById('root');
if (!container) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
} else {
  console.log('Root element found, creating React root...');
  
  try {
    const root = createRoot(container);
    root.render(<TestApp />);
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Error rendering React app:', error);
    container.innerHTML = `<div style="padding: 20px; color: red;">React Error: ${error}</div>`;
  }
}
