
import React, { Suspense, lazy } from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
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

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

function App() {
  console.log('App component rendering...');
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
              <Switch>
                {/* Admin routes */}
                <Route path="/admin/*">
                  <AdminAuthProvider>
                    <AdminRoutes />
                  </AdminAuthProvider>
                </Route>
                
                {/* Main app routes */}
                <Route>
                  <Routes />
                </Route>
              </Switch>
            </Suspense>
          </Router>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('Error in App component:', error);
    return <div>Error loading app: {String(error)}</div>;
  }
}

export default App;
