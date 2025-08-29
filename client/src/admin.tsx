
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Route, Router } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/toaster'
import { AdminAuthProvider } from './lib/admin-auth'
import AdminDashboard from './pages/admin-dashboard'
import { AdminLogin } from './pages/admin-login'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function AdminApp() {
  // Hide loading spinner
  React.useEffect(() => {
    const loading = document.getElementById('loading')
    if (loading) {
      loading.style.display = 'none'
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <Router base="/admin">
          <Route path="/login" component={AdminLogin} />
          <Route path="/*" component={AdminDashboard} />
          <Route path="/" component={AdminDashboard} />
        </Router>
        <Toaster />
      </AdminAuthProvider>
    </QueryClientProvider>
  )
}

ReactDOM.createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
)
