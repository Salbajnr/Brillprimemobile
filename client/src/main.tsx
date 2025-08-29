import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Simple test component to verify React is working
function TestApp() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">BrillPrime</h1>
        <p className="text-gray-600">Testing React rendering...</p>
        <div className="mt-4 w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold">
          BP
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')!
const root = createRoot(container)

root.render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
)