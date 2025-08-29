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

// Lazy load components with error boundaries
const Dashboard = lazy(() => import('./pages/dashboard').catch(() => ({ default: () => <div>Error loading Dashboard</div> })));
const SignIn = lazy(() => import('./pages/signin').catch(() => ({ default: () => <div>Error loading SignIn</div> })));
const SignUp = lazy(() => import('./pages/signup').catch(() => ({ default: () => <div>Error loading SignUp</div> })));
const NotFound = lazy(() => import('./pages/not-found').catch(() => ({ default: () => <div>Page not found</div> })));

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
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">BrillPrime</h1>
        <p className="text-lg text-gray-700 mb-6">Nigerian Fintech & Logistics Platform</p>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Welcome to BrillPrime</h2>
          <p className="text-gray-600 mb-4">Your comprehensive platform for:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Fuel ordering and delivery</li>
            <li>Toll payments</li>
            <li>Money transfers</li>
            <li>Real-time tracking</li>
            <li>Merchant services</li>
          </ul>
          <div className="mt-6 space-x-4">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Get Started
            </button>
            <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300">
              Learn More
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in App component:', error);
    return <div>Error loading app: {String(error)}</div>;
  }
}

export default App;