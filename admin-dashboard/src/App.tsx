
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<div>User Management - Coming Soon</div>} />
        <Route path="/verification" element={<div>KYC Verification - Coming Soon</div>} />
        <Route path="/support" element={<div>Support Tickets - Coming Soon</div>} />
        <Route path="/transactions" element={<div>Transactions - Coming Soon</div>} />
        <Route path="/fraud" element={<div>Fraud Detection - Coming Soon</div>} />
        <Route path="/drivers" element={<div>Driver Monitoring - Coming Soon</div>} />
        <Route path="/moderation" element={<div>Content Moderation - Coming Soon</div>} />
        <Route path="/compliance" element={<div>Compliance - Coming Soon</div>} />
        <Route path="/system" element={<div>System Maintenance - Coming Soon</div>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
