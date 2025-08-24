import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { preloadCriticalComponents } from './lib/lazy-components'
import { setupResourceHints, preloadCriticalResources, optimizeThirdPartyScripts } from './lib/bundle-optimizer'
import { pwaManager } from './lib/pwa-manager'

// Setup performance optimizations
setupResourceHints()
preloadCriticalResources()
optimizeThirdPartyScripts()

// Initialize PWA features
pwaManager.checkCapabilities().then(capabilities => {
  if (capabilities.installable) {
    console.log('PWA features available')
  }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 401/403
        if (error?.status >= 400 && error?.status < 500 && ![401, 403].includes(error?.status)) {
          return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false
    }
  }
})

// Preload components based on user state
setTimeout(() => {
  preloadCriticalComponents()
}, 1000)

// Use concurrent features for better performance
const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)