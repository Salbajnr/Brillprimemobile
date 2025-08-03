import React, { useState } from 'react';
import { AdminProvider, useAdmin } from '../lib/admin-auth';
import { AdminLogin } from '../components/admin-login';
import { AdminLayout } from '../components/admin-layout';
import { AdminProtectedRoute } from '../components/admin-protected-route';
import { AdminDashboardMain } from '../components/admin-dashboard-main';
import { AdminUserManagement } from '../components/admin-user-management';
import { AdminKYCVerification } from '../components/admin-kyc-verification';

type AdminPageType = 'dashboard' | 'users' | 'kyc' | 'merchants' | 'drivers' | 'support' | 'transactions' | 'fraud' | 'monitoring' | 'security' | 'maintenance';

function AdminContent() {
  const { isAuthenticated, isLoading } = useAdmin();
  const [currentPage, setCurrentPage] = useState<AdminPageType>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboardMain />;
      case 'users':
        return <AdminUserManagement />;
      case 'kyc':
        return <AdminKYCVerification />;
      case 'merchants':
        return <div className="p-6"><h1 className="text-2xl font-bold">Merchant Applications</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'drivers':
        return <div className="p-6"><h1 className="text-2xl font-bold">Driver Applications</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'support':
        return <div className="p-6"><h1 className="text-2xl font-bold">Support Tickets</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'transactions':
        return <div className="p-6"><h1 className="text-2xl font-bold">Transactions</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'fraud':
        return <div className="p-6"><h1 className="text-2xl font-bold">Fraud Detection</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'monitoring':
        return <div className="p-6"><h1 className="text-2xl font-bold">Real-time Monitoring</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'security':
        return <div className="p-6"><h1 className="text-2xl font-bold">Security & Compliance</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'maintenance':
        return <div className="p-6"><h1 className="text-2xl font-bold">System Maintenance</h1><p className="text-gray-600">Coming soon...</p></div>;
      default:
        return <AdminDashboardMain />;
    }
  };

  return (
    <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      <AdminProtectedRoute>
        {renderPage()}
      </AdminProtectedRoute>
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
}