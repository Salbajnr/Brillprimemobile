import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log('main.tsx loading...')

// Simple test component first
function TestApp() {
  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce">
        BP
      </div>
      <p className="mt-4 text-gray-600">BrillPrime Loading...</p>
    </div>
  )
}

const rootElement = document.getElementById('root')
console.log('Root element:', rootElement)

if (rootElement) {
  console.log('Creating React root...')
  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  )
  
  console.log('React app rendered')
} else {
  console.error('Root element not found!')
}