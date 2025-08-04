import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminProvider } from './lib/admin-auth';
import { AdminLogin } from './components/admin-login';
import { AdminDashboard } from './pages/admin-dashboard';
import { AdminUserManagement } from './pages/admin-user-management';
import { AdminKYCVerification } from './pages/admin-kyc-verification';
import { AdminTransactions } from './pages/admin-transactions';
import { AdminFraud } from './pages/admin-fraud';
import { AdminModeration } from './pages/admin-moderation';
import { AdminMonitoring } from './pages/admin-monitoring';
import { AdminSupport } from './pages/admin-support';
import AdminEscrowManagement from './pages/admin-escrow-management';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/users" element={<AdminUserManagement />} />
            <Route path="/kyc" element={<AdminKYCVerification />} />
            <Route path="/transactions" element={<AdminTransactions />} />
            <Route path="/fraud" element={<AdminFraud />} />
            <Route path="/moderation" element={<AdminModeration />} />
            <Route path="/monitoring" element={<AdminMonitoring />} />
            <Route path="/support" element={<AdminSupport />} />
            <Route path="/admin/monitoring" element={<AdminMonitoring />} />
            <Route path="/admin/fraud" element={<AdminFraud />} />
            <Route path="/admin/escrow-management" element={<AdminEscrowManagement />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AdminProvider>
    </QueryClientProvider>
  );
}

export default App;