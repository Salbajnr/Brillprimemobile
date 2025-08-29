import React, { Suspense, lazy } from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './hooks/use-auth';
import { Routes } from './components/Routes';
import { AdminAuthProvider } from './lib/admin-auth';
import { AdminRoutes } from './components/AdminRoutes';

// Create a stable query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Lazy load components with error boundaries
const Dashboard = lazy(() => import('@/pages/dashboard').catch(() => ({ default: () => <div>Error loading Dashboard</div> })));
const SignIn = lazy(() => import('@/pages/signin').catch(() => ({ default: () => <div>Error loading SignIn</div> })));
const SignUp = lazy(() => import('@/pages/signup').catch(() => ({ default: () => <div>Error loading SignUp</div> })));
const NotFound = lazy(() => import('@/pages/not-found').catch(() => ({ default: () => <div>Page not found</div> })));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

function App() {
  const isAdmin = window.location.hostname.startsWith('admin.');

  if (isAdmin) {
    // Load admin app instead
    return (
      <Router>
        <QueryClientProvider client={queryClient}>
          <AdminAuthProvider>
            <div className="min-h-screen bg-gray-50">
              <Toaster />
              <AdminRoutes />
            </div>
          </AdminAuthProvider>
        </QueryClientProvider>
      </Router>
    );
  }

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Toaster />
            <Routes />
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;